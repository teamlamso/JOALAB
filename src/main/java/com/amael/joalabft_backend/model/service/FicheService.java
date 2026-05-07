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
import com.amael.joalabft_backend.model.enums.TypeChange;
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
        return fiche.getId();
    }

    /**
     * Met à jour les lignes d'une fiche existante. Plusieurs types de jeu sont autorisés
     * sur la même fiche (l'affichage et l'impression séparent visuellement les blocs).
     *
     * @throws NotFoundException si la fiche n'existe pas
     */
    public void updateFiche(Long id, FicheRequest req, Utilisateur modifiePar) {
        FicheLABFT fiche = ficheRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Fiche introuvable : " + id));

        fiche.setModifiePar(modifiePar);
        fiche.setDateModification(LocalDateTime.now());

        if (req.lignes != null) {
            // Pour préserver le caissier d'origine des lignes existantes,
            // on capture l'association (id ligne → caissier) avant remplacement.
            Map<Long, Utilisateur> caissiersOrigine = new HashMap<>();
            for (LigneTransaction l : fiche.getLignes()) {
                if (l.getId() != null && l.getCaissier() != null) {
                    caissiersOrigine.put(l.getId(), l.getCaissier());
                }
            }

            List<LigneTransaction> nouvelles = req.lignes.stream()
                    .map(reqLigne -> {
                        Utilisateur caissier = (reqLigne.id != null && caissiersOrigine.containsKey(reqLigne.id))
                                ? caissiersOrigine.get(reqLigne.id)
                                : modifiePar;
                        return buildLigne(reqLigne, caissier);
                    })
                    .toList();
            fiche.replaceLignes(nouvelles);
        }

        ficheRepository.update(fiche);
    }

    // --- Helpers ---

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
                modif
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
