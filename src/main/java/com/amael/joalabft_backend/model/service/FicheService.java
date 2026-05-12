package com.amael.joalabft_backend.model.service;

import com.amael.joalabft_backend.model.dto.request.FicheRequest;
import com.amael.joalabft_backend.model.dto.request.LigneTransactionRequest;
import com.amael.joalabft_backend.model.dto.response.FicheDetailResponse;
import com.amael.joalabft_backend.model.dto.response.FicheSummaryResponse;
import com.amael.joalabft_backend.model.dto.response.LigneTransactionResponse;
import com.amael.joalabft_backend.model.entity.Client;
import com.amael.joalabft_backend.model.entity.FicheLABFT;
import com.amael.joalabft_backend.model.entity.LigneTransaction;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.enums.TypeActionJournal;
import com.amael.joalabft_backend.model.enums.TypeChange;
import com.amael.joalabft_backend.model.enums.TypeEntiteJournal;
import com.amael.joalabft_backend.model.enums.TypeJeu;
import com.amael.joalabft_backend.model.enums.TypePaiement;
import com.amael.joalabft_backend.model.repository.ClientRepository;
import com.amael.joalabft_backend.model.repository.FicheLABFTRepository;
import jakarta.ejb.Stateless;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Logique métier des fiches LAB-FT.
 */
@Stateless
public class FicheService {

    private static final DateTimeFormatter DATE_FMT     = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter DATETIME_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter TIME_FMT     = DateTimeFormatter.ofPattern("HH:mm");

    @Inject
    private FicheLABFTRepository ficheRepository;

    @Inject
    private ClientRepository clientRepository;

    @Inject
    private PermissionService permissionService;

    @Inject
    private JournalService journalService;

    /**
     * Retourne la liste des fiches filtrées par plage de dates et terme de recherche.
     * Si {@code from} ou {@code to} est {@code null}, la date du jour est utilisée.
     */
    public List<FicheSummaryResponse> listFiches(LocalDate from, LocalDate to, String search) {
        LocalDate debut = from != null ? from : LocalDate.now();
        LocalDate fin   = to   != null ? to   : LocalDate.now();
        return ficheRepository.findWithFilters(debut, fin, search).stream()
                .map(this::toSummary)
                .toList();
    }

    /**
     * Retourne le détail complet d'une fiche.
     *
     * @throws NotFoundException si la fiche n'existe pas
     */
    public FicheDetailResponse getFiche(Long id) {
        FicheLABFT f = ficheRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Fiche introuvable : " + id));
        return toDetail(f);
    }

    /**
     * Crée une nouvelle fiche regroupant toutes les lignes (multi-types autorisé).
     *
     * @throws NotFoundException si le client référencé n'existe pas
     */
    public Long createFiche(FicheRequest req, Utilisateur creePar) {
        Client client = clientRepository.findById(req.clientId)
                .orElseThrow(() -> new NotFoundException("Client introuvable : " + req.clientId));

        FicheLABFT fiche = new FicheLABFT();
        fiche.setClient(client);
        fiche.setCreePar(creePar);

        if (req.lignes != null) {
            req.lignes.forEach(l -> fiche.addLigne(buildLigne(l, creePar)));
        }

        ficheRepository.save(fiche);

        journalService.log(
                creePar,
                TypeActionJournal.CREATION,
                TypeEntiteJournal.FICHE,
                fiche.getId(),
                client.getLibelle(),
                descriptionFiche(fiche, "Création"));
        return fiche.getId();
    }

    /**
     * Met à jour les lignes d'une fiche existante. Plusieurs types de jeu sont autorisés
     * sur la même fiche (l'affichage et l'impression séparent visuellement les blocs).
     *
     * @throws NotFoundException     si la fiche n'existe pas
     * @throws jakarta.ws.rs.ForbiddenException si le rôle de l'utilisateur ne lui permet pas
     *         de modifier une fiche aussi ancienne
     */
    public void updateFiche(Long id, FicheRequest req, Utilisateur modifiePar) {
        FicheLABFT fiche = ficheRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Fiche introuvable : " + id));

        permissionService.ensurePeutModifierFiche(modifiePar, fiche);

        fiche.setModifiePar(modifiePar);
        fiche.setDateModification(LocalDateTime.now());

        // Une seule passe sur les lignes existantes : on capture à la fois
        // l'état précédent (pour le diff journal) et le caissier d'origine
        // (pour ne pas écraser la signature des lignes conservées).
        Map<Long, LigneSnapshot> avant = new HashMap<>();
        Map<Long, Utilisateur> caissiersOrigine = new HashMap<>();
        for (LigneTransaction l : fiche.getLignes()) {
            if (l.getId() == null) continue;
            avant.put(l.getId(), snapshot(l));
            if (l.getCaissier() != null) caissiersOrigine.put(l.getId(), l.getCaissier());
        }

        List<LigneTransaction> nouvelles = new ArrayList<>();
        List<Long> idsRequete = new ArrayList<>();
        if (req.lignes != null) {
            for (LigneTransactionRequest reqLigne : req.lignes) {
                Utilisateur caissier = (reqLigne.id != null && caissiersOrigine.containsKey(reqLigne.id))
                        ? caissiersOrigine.get(reqLigne.id)
                        : modifiePar;
                nouvelles.add(buildLigne(reqLigne, caissier));
                idsRequete.add(reqLigne.id);
            }
            fiche.replaceLignes(nouvelles);
        }

        // Description calculée avant la persistance : on utilise des objets
        // déjà en mémoire, pas besoin d'attendre que le merge soit terminé.
        String libelle = fiche.getClient().getLibelle();
        String description = descriptionDiffModification(nouvelles, idsRequete, avant);

        ficheRepository.update(fiche);

        journalService.log(
                modifiePar,
                TypeActionJournal.MODIFICATION,
                TypeEntiteJournal.FICHE,
                fiche.getId(),
                libelle,
                description);
    }

    /**
     * Supprime une fiche. Réservé aux utilisateurs MCD.
     *
     * @throws NotFoundException                si la fiche n'existe pas
     * @throws jakarta.ws.rs.ForbiddenException si {@code utilisateur} n'est pas MCD
     */
    public void deleteFiche(Long id, Utilisateur utilisateur) {
        permissionService.ensurePeutSupprimerFiche(utilisateur);
        FicheLABFT fiche = ficheRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Fiche introuvable : " + id));
        String libelle = fiche.getClient().getLibelle();
        String description = descriptionFiche(fiche, "Suppression");
        ficheRepository.delete(fiche);

        journalService.log(
                utilisateur,
                TypeActionJournal.SUPPRESSION,
                TypeEntiteJournal.FICHE,
                id,
                libelle,
                description);
    }

    // --- Helpers ---

    /**
     * Description détaillée d'une fiche pour l'audit : une ligne par
     * LigneTransaction, avec type de jeu, n° de socle, RGM, paiement, change
     * entrant/sortant. {@code verbe} précède la description sur la première
     * ligne (Création / Modification / Suppression).
     */
    private String descriptionFiche(FicheLABFT fiche, String verbe) {
        StringBuilder sb = new StringBuilder(verbe);
        List<LigneTransaction> lignes = fiche.getLignes();
        if (lignes.isEmpty()) {
            sb.append(" — (aucune ligne)");
            return sb.toString();
        }
        for (int i = 0; i < lignes.size(); i++) {
            sb.append('\n').append("Ligne ").append(i + 1).append(" : ");
            sb.append(formatLigne(lignes.get(i)));
        }
        return sb.toString();
    }

    private String formatLigne(LigneTransaction l) {
        List<String> parts = new ArrayList<>();
        if (l.getTypeJeu() != null) parts.add(l.getTypeJeu().name());
        if (l.getNumeroSocle() != null) parts.add("socle " + l.getNumeroSocle());
        if (l.getMontantRGM() != null && l.getMontantRGM().signum() != 0) {
            parts.add("RGM " + formatMontant(l.getMontantRGM()));
        }
        if (l.getTypePaiement() != null) parts.add(l.getTypePaiement().name());
        if (l.getChangeEntrant() != null && l.getChangeEntrant().signum() != 0) {
            parts.add("entrant " + formatMontant(l.getChangeEntrant()));
        }
        if (l.getChangeSortant() != null && l.getChangeSortant().signum() != 0) {
            parts.add("sortant " + formatMontant(l.getChangeSortant()));
        }
        if (l.getTypeChange() != null) parts.add(l.getTypeChange().name());
        return String.join(", ", parts);
    }

    private String formatMontant(java.math.BigDecimal value) {
        return String.format(java.util.Locale.FRANCE, "%,.2f €", value);
    }

    /** Capture d'une ligne pour comparaison ultérieure (immutable). */
    private record LigneSnapshot(
            String typeJeu,
            String typePaiement,
            String typeChange,
            Integer numeroSocle,
            java.math.BigDecimal montantRGM,
            java.math.BigDecimal changeEntrant,
            java.math.BigDecimal changeSortant,
            String observations
    ) {}

    private LigneSnapshot snapshot(LigneTransaction l) {
        return new LigneSnapshot(
                l.getTypeJeu()      != null ? l.getTypeJeu().name()      : null,
                l.getTypePaiement() != null ? l.getTypePaiement().name() : null,
                l.getTypeChange()   != null ? l.getTypeChange().name()   : null,
                l.getNumeroSocle(),
                l.getMontantRGM(),
                l.getChangeEntrant(),
                l.getChangeSortant(),
                l.getObservations()
        );
    }

    private boolean sameMontant(java.math.BigDecimal a, java.math.BigDecimal b) {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;
        return a.compareTo(b) == 0;
    }

    private boolean sameContent(LigneSnapshot a, LigneTransaction b) {
        return java.util.Objects.equals(a.typeJeu(),      b.getTypeJeu()      != null ? b.getTypeJeu().name()      : null)
            && java.util.Objects.equals(a.typePaiement(), b.getTypePaiement() != null ? b.getTypePaiement().name() : null)
            && java.util.Objects.equals(a.typeChange(),   b.getTypeChange()   != null ? b.getTypeChange().name()   : null)
            && java.util.Objects.equals(a.numeroSocle(),  b.getNumeroSocle())
            && sameMontant(a.montantRGM(),     b.getMontantRGM())
            && sameMontant(a.changeEntrant(),  b.getChangeEntrant())
            && sameMontant(a.changeSortant(),  b.getChangeSortant())
            && java.util.Objects.equals(a.observations(), b.getObservations());
    }

    private String formatSnapshot(LigneSnapshot s) {
        List<String> parts = new ArrayList<>();
        if (s.typeJeu() != null) parts.add(s.typeJeu());
        if (s.numeroSocle() != null) parts.add("socle " + s.numeroSocle());
        if (s.montantRGM() != null && s.montantRGM().signum() != 0) {
            parts.add("RGM " + formatMontant(s.montantRGM()));
        }
        if (s.typePaiement() != null) parts.add(s.typePaiement());
        if (s.changeEntrant() != null && s.changeEntrant().signum() != 0) {
            parts.add("entrant " + formatMontant(s.changeEntrant()));
        }
        if (s.changeSortant() != null && s.changeSortant().signum() != 0) {
            parts.add("sortant " + formatMontant(s.changeSortant()));
        }
        if (s.typeChange() != null) parts.add(s.typeChange());
        return String.join(", ", parts);
    }

    /**
     * Description d'une modification de fiche : ne liste que les lignes
     * effectivement ajoutées, modifiées ou supprimées (pas l'ensemble du
     * contenu). Pour une ligne modifiée, l'ancien et le nouveau contenu sont
     * tous deux affichés.
     */
    private String descriptionDiffModification(List<LigneTransaction> nouvelles,
                                                List<Long> idsRequete,
                                                Map<Long, LigneSnapshot> avant) {
        StringBuilder sb = new StringBuilder("Modification");
        boolean anyChange = false;
        Set<Long> idsConserves = new java.util.HashSet<>();

        for (int i = 0; i < nouvelles.size(); i++) {
            Long idReq = idsRequete.get(i);
            LigneTransaction n = nouvelles.get(i);
            if (idReq == null) {
                sb.append('\n').append("+ Ligne ajoutée : ").append(formatLigne(n));
                anyChange = true;
            } else {
                idsConserves.add(idReq);
                LigneSnapshot ancien = avant.get(idReq);
                if (ancien != null && !sameContent(ancien, n)) {
                    sb.append('\n').append("* Ligne modifiée : ").append(formatLigne(n))
                      .append(" (auparavant : ").append(formatSnapshot(ancien)).append(")");
                    anyChange = true;
                }
            }
        }

        for (Map.Entry<Long, LigneSnapshot> e : avant.entrySet()) {
            if (!idsConserves.contains(e.getKey())) {
                sb.append('\n').append("- Ligne supprimée : ").append(formatSnapshot(e.getValue()));
                anyChange = true;
            }
        }

        if (!anyChange) sb.append(" — (aucun changement de ligne)");
        return sb.toString();
    }

    private LigneTransaction buildLigne(LigneTransactionRequest req, Utilisateur caissier) {
        if (req.montantRGM != null && req.numeroSocle == null) {
            throw new BadRequestException("Le numéro de socle est obligatoire lorsqu'un montant RGM est renseigné");
        }
        LigneTransaction l = new LigneTransaction();
        l.setTypeJeu(req.typeJeu != null ? TypeJeu.valueOf(req.typeJeu) : null);
        l.setTypePaiement(req.typePaiement != null ? TypePaiement.valueOf(req.typePaiement) : null);
        l.setTypeChange(req.typeChange != null ? TypeChange.valueOf(req.typeChange) : null);
        l.setNumeroSocle(req.numeroSocle);
        l.setMontantRGM(req.montantRGM);
        l.setChangeEntrant(req.changeEntrant);
        l.setChangeSortant(req.changeSortant);
        l.setObservations(req.observations);
        l.setCaissier(caissier);
        return l;
    }

    private FicheSummaryResponse toSummary(FicheLABFT f) {
        LocalDateTime derniere = f.getDateModification() != null
                ? f.getDateModification()
                : f.getDateCreation();
        String modif = derniere != null ? derniere.format(TIME_FMT) : null;
        // Jour de travail (06h→05h59) de la dernière modification, indépendant
        // de la date de la fiche : si l'on modifie aujourd'hui une fiche de la
        // veille, le front affichera "à HH:mm" et non "hier à HH:mm".
        String modifDate = derniere != null
                ? (derniere.getHour() < 6
                        ? derniere.toLocalDate().minusDays(1).format(DATE_FMT)
                        : derniere.toLocalDate().format(DATE_FMT))
                : null;
        // Set conserve l'ordre d'apparition (LinkedHashSet) — utile pour
        // afficher les badges dans l'ordre de saisie sur l'accueil.
        Set<String> typesJeu = new LinkedHashSet<>();
        f.getLignes().forEach(l -> {
            if (l.getTypeJeu() != null) typesJeu.add(l.getTypeJeu().name());
        });
        return new FicheSummaryResponse(
                f.getId(),
                f.getClient().getLibelle(),
                f.getClient().isPpe(),
                f.getClient().getId(),
                f.getDate() != null ? f.getDate().format(DATE_FMT) : null,
                f.getCreePar().getNomComplet(),
                List.copyOf(typesJeu),
                f.getTotalRGM(),
                f.getTotalChangeEntrant(),
                f.getTotalChangeSortant(),
                modif,
                modifDate
        );
    }

    private FicheDetailResponse toDetail(FicheLABFT f) {
        Client c = f.getClient();

        FicheDetailResponse dto = new FicheDetailResponse();
        dto.id                      = f.getId();
        dto.date                    = f.getDate() != null ? f.getDate().format(DATE_FMT) : null;
        dto.creePar                 = f.getCreePar().getNomComplet();
        dto.modifiePar              = f.getModifiePar() != null ? f.getModifiePar().getNomComplet() : null;
        dto.dateModification        = f.getDateModification() != null ? f.getDateModification().format(DATETIME_FMT) : null;

        dto.clientId                = c.getId();
        dto.clientLibelle           = c.getLibelle();
        dto.clientIdentifie         = c.isIdentifie();
        dto.clientNom               = c.getNom();
        dto.clientPrenom            = c.getPrenom();
        dto.clientDateNaissance     = c.getDateNaissance() != null ? c.getDateNaissance().format(DATE_FMT) : null;
        dto.clientLieuNaissance     = c.getLieuNaissance();
        dto.clientPpe               = c.isPpe();
        dto.clientRue               = c.getRue();
        dto.clientCodePostal        = c.getCodePostal();
        dto.clientVille             = c.getVille();
        dto.clientPays              = c.getPays();
        dto.clientTypePiece         = c.getTypePiece();
        dto.clientNumeroPiece       = c.getNumeroPiece();
        dto.clientDateDelivrance    = c.getDateDelivrance() != null ? c.getDateDelivrance().format(DATE_FMT) : null;
        dto.clientPrefecture        = c.getPrefectureDelivrance();
        dto.clientPaysDelivrance    = c.getPaysDelivrance();
        dto.clientDescriptionPhysique = c.getDescriptionPhysique();

        dto.totalRGM                = f.getTotalRGM();
        dto.totalEntrant            = f.getTotalChangeEntrant();
        dto.totalSortant            = f.getTotalChangeSortant();

        dto.lignes = f.getLignes().stream()
                .map(l -> new LigneTransactionResponse(
                        l.getId(),
                        l.getTypeJeu() != null ? l.getTypeJeu().name() : null,
                        l.getTypePaiement() != null ? l.getTypePaiement().name() : null,
                        l.getTypeChange() != null ? l.getTypeChange().name() : null,
                        l.getNumeroSocle(),
                        l.getMontantRGM(),
                        l.getChangeEntrant(),
                        l.getChangeSortant(),
                        l.getObservations(),
                        l.getCaissier() != null ? l.getCaissier().getNomComplet() : f.getCreePar().getNomComplet()
                ))
                .toList();

        return dto;
    }
}
