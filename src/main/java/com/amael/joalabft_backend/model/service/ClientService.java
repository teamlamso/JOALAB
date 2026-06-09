package com.amael.joalabft_backend.model.service;

import com.amael.joalabft_backend.model.dto.request.ClientIdentificationRequest;
import com.amael.joalabft_backend.model.dto.request.ClientRequest;
import com.amael.joalabft_backend.model.dto.response.ClientDetailResponse;
import com.amael.joalabft_backend.model.dto.response.ClientSummaryResponse;
import com.amael.joalabft_backend.model.dto.response.FicheSummaryResponse;
import com.amael.joalabft_backend.model.entity.Client;
import com.amael.joalabft_backend.model.entity.FicheLABFT;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.enums.TypeActionJournal;
import com.amael.joalabft_backend.model.enums.TypeEntiteJournal;
import com.amael.joalabft_backend.model.repository.ClientRepository;
import com.amael.joalabft_backend.model.repository.FicheLABFTRepository;
import com.amael.joalabft_backend.model.util.WorkDay;
import jakarta.ejb.Stateless;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Logique métier des clients.
 */
@Stateless
public class ClientService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ISO_LOCAL_DATE;

    @Inject
    private ClientRepository clientRepository;

    @Inject
    private FicheLABFTRepository ficheRepository;

    @Inject
    private PermissionService permissionService;

    @Inject
    private JournalService journalService;

    /** Retourne la liste des clients avec un résumé, filtrée optionnellement par recherche. */
    public List<ClientSummaryResponse> listClients(String search) {
        List<Client> clients = clientRepository.findAll(search);
        // Single query qui évite le N+1 ; chargeait 15 s avec le SQL en FINE.
        Map<Long, LocalDate> activites = clientRepository.getDerniereActivitePourIds(
                clients.stream().map(Client::getId).toList());
        return clients.stream()
                .map(c -> {
                    LocalDate activite = activites.get(c.getId());
                    return new ClientSummaryResponse(
                            c.getId(),
                            c.getLibelle(),
                            c.getDateNaissance() != null ? c.getDateNaissance().format(DATE_FMT) : null,
                            c.getVille(),
                            c.getPays(),
                            c.isPpe(),
                            activite != null ? activite.format(DATE_FMT) : null,
                            c.getChampsManquants()
                    );
                })
                .toList();
    }

    /**
     * Retourne le détail complet d'un client avec l'historique de ses fiches.
     *
     * @throws NotFoundException si le client n'existe pas
     */
    public ClientDetailResponse getClient(Long id) {
        Client c = clientRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Client introuvable : " + id));

        List<FicheSummaryResponse> fiches = ficheRepository.findByClientId(id).stream()
                .map(this::toFicheSummary)
                .toList();

        ClientDetailResponse dto = new ClientDetailResponse();
        dto.id                  = c.getId();
        dto.libelle             = c.getLibelle();
        dto.identifie           = c.isIdentifie();
        dto.nom                 = c.getNom();
        dto.prenom              = c.getPrenom();
        dto.dateNaissance       = c.getDateNaissance() != null ? c.getDateNaissance().format(DATE_FMT) : null;
        dto.lieuNaissance       = c.getLieuNaissance();
        dto.ppe                 = c.isPpe();
        dto.rue                 = c.getRue();
        dto.complement          = c.getComplement();
        dto.codePostal          = c.getCodePostal();
        dto.ville               = c.getVille();
        dto.pays                = c.getPays();
        dto.typePiece           = c.getTypePiece();
        dto.numeroPiece         = c.getNumeroPiece();
        dto.dateDelivrance      = c.getDateDelivrance() != null ? c.getDateDelivrance().format(DATE_FMT) : null;
        dto.prefectureDelivrance = c.getPrefectureDelivrance();
        dto.paysDelivrance      = c.getPaysDelivrance();
        dto.descriptionPhysique = c.getDescriptionPhysique();
        dto.champsManquants     = c.getChampsManquants();
        dto.complet             = dto.champsManquants.isEmpty();
        dto.fiches              = fiches;
        return dto;
    }

    /**
     * Recherche les clients existants susceptibles d'être un doublon du client
     * en cours de saisie (mêmes nom+prénom+date de naissance, ou même numéro
     * de pièce). Retourne la liste des candidats sous forme de DTO détaillé.
     */
    public List<ClientDetailResponse> findSimilar(ClientRequest req) {
        LocalDate dateNaissance = parseDate(req.dateNaissance);
        return clientRepository.findSimilar(req.nom, req.prenom, dateNaissance, req.numeroPiece).stream()
                .map(c -> getClient(c.getId()))
                .toList();
    }

    /** Crée un nouveau client et retourne son identifiant. */
    public Long createClient(ClientRequest req, Utilisateur utilisateur) {
        Client c = applyRequest(new Client(), req);
        clientRepository.save(c);
        journalService.log(
                utilisateur,
                TypeActionJournal.CREATION,
                TypeEntiteJournal.CLIENT,
                c.getId(),
                c.getLibelle(),
                "Création client " + (c.isIdentifie() ? "identifié" : "non identifié"));
        return c.getId();
    }

    /**
     * Met à jour l'identité complète d'un client. Réservé aux rôles
     * {@code RESPONSABLE_CAISSE} et {@code MCD}.
     *
     * @throws NotFoundException                si le client n'existe pas
     * @throws jakarta.ws.rs.ForbiddenException si l'utilisateur n'a pas le rôle requis
     */
    public void updateClient(Long id, ClientRequest req, Utilisateur utilisateur) {
        permissionService.ensurePeutModifierClientComplet(utilisateur);
        Client c = clientRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Client introuvable : " + id));
        clientRepository.update(applyRequest(c, req));
        journalService.log(
                utilisateur,
                TypeActionJournal.MODIFICATION,
                TypeEntiteJournal.CLIENT,
                c.getId(),
                c.getLibelle(),
                "Modification de l'identité complète");
    }

    /**
     * Met à jour uniquement l'adresse et la pièce d'identité d'un client.
     * Accessible à tous les rôles (y compris {@code CAISSIER}).
     *
     * @throws NotFoundException si le client n'existe pas
     */
    public void updateClientIdentification(Long id, ClientIdentificationRequest req, Utilisateur utilisateur) {
        Client c = clientRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Client introuvable : " + id));

        // Adresse
        c.setRue(req.rue);
        c.setComplement(req.complement);
        c.setCodePostal(req.codePostal);
        c.setVille(req.ville);
        c.setPays(req.pays);

        // Pièce d'identité
        c.setTypePiece(req.typePiece);
        c.setNumeroPiece(req.numeroPiece);
        c.setDateDelivrance(parseDate(req.dateDelivrance));
        c.setPrefectureDelivrance(req.prefectureDelivrance);
        c.setPaysDelivrance(req.paysDelivrance);

        // Complément d'état civil autorisé au CAISSIER, dans des conditions
        // strictes : on n'écrase jamais une donnée déjà conforme.
        List<String> ajustements = appliquerAjustementsEtatCivil(c, req);

        clientRepository.update(c);

        String description = ajustements.isEmpty()
                ? "Modification de l'adresse ou de la pièce d'identité"
                : "Modification de l'adresse, pièce d'identité et "
                  + String.join(", ", ajustements);
        journalService.log(
                utilisateur,
                TypeActionJournal.MODIFICATION,
                TypeEntiteJournal.CLIENT,
                c.getId(),
                c.getLibelle(),
                description);
    }

    /**
     * Applique les éventuels champs d'état civil envoyés dans la requête
     * d'identification, selon les règles métier suivantes :
     * <ul>
     *   <li>{@code dateNaissance} : appliquée uniquement si elle manque encore.</li>
     *   <li>{@code lieuNaissance} : appliquée si le lieu actuel est vide
     *       ou si son format n'est pas conforme (pas de parenthèses au
     *       format {@code "(NN)"} ou {@code "(Pays)"}).</li>
     *   <li>{@code ppe} : seul le passage {@code false → true} est accepté.</li>
     * </ul>
     * Retourne la liste lisible des ajustements effectués (pour le journal).
     */
    private List<String> appliquerAjustementsEtatCivil(Client c, ClientIdentificationRequest req) {
        List<String> faits = new java.util.ArrayList<>();
        if (req.dateNaissance != null && !req.dateNaissance.isBlank()
                && c.getDateNaissance() == null) {
            c.setDateNaissance(parseDate(req.dateNaissance));
            faits.add("date de naissance ajoutée");
        }
        if (req.lieuNaissance != null && !req.lieuNaissance.isBlank()) {
            String avant = c.getLieuNaissance();
            String envoye = req.lieuNaissance.trim();
            if (avant == null || avant.isBlank()) {
                c.setLieuNaissance(envoye);
                faits.add("lieu de naissance ajouté");
            } else if (envoye.equals(avant)) {
                // Valeur inchangée — la requête contient juste l'état courant
                // du formulaire. On ne touche pas et on ne journalise pas.
            } else if (!lieuNaissanceConforme(avant)) {
                // Format incomplet : on n'accepte qu'une correction qui garde
                // la même ville (« BESANCON (FRANCE) » → « Besançon (25) »).
                // Changer Besançon en Lyon doit passer par un Responsable.
                if (memeVille(avant, envoye)) {
                    c.setLieuNaissance(envoye);
                    faits.add("lieu de naissance corrigé");
                } else {
                    throw new BadRequestException(
                            "Votre rôle vous permet de corriger le format du lieu de naissance, "
                          + "mais pas de changer la ville. Demandez à un responsable de caisse pour "
                          + "modifier « " + avant + " » → « " + envoye + " ».");
                }
            } else {
                // Lieu déjà au bon format : un CAISSIER ne doit pas pouvoir
                // le modifier du tout (même si la nouvelle valeur a la même
                // ville). C'était jusqu'ici ignoré silencieusement — on
                // remonte désormais un message clair.
                throw new BadRequestException(
                        "Votre rôle ne vous permet pas de modifier un lieu de naissance déjà "
                      + "saisi au format attendu. Demandez à un responsable de caisse pour "
                      + "modifier « " + avant + " » → « " + envoye + " ».");
            }
        }
        if (Boolean.TRUE.equals(req.ppe) && !c.isPpe()) {
            c.setPpe(true);
            faits.add("flag PPE activé");
        }
        return faits;
    }

    /**
     * Vrai si le libellé du lieu de naissance suit le format attendu
     * « Ville (XX) » avec XX numérique pour la France, ou « Ville (Pays) »
     * avec un mot non numérique entre parenthèses pour l'international.
     * Sert à autoriser un CAISSIER à corriger les lieux mal formatés
     * (« BESANCON (FRANCE) ») sans pouvoir changer une ville déjà correcte.
     */
    private static boolean lieuNaissanceConforme(String lieu) {
        if (lieu == null) return false;
        return lieu.matches("^[^()]+ \\(\\d{2,3}\\)$")
            || lieu.matches("^[^()]+ \\([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ \\-]+\\)$")
                && !lieu.matches(".*\\(FRANCE\\).*");
    }

    /**
     * Compare la partie « ville » de deux libellés de lieu en ignorant
     * la casse, les accents et les ponctuations. Permet d'accepter
     * « BESANCON (FRANCE) » → « Besançon (25) » mais de rejeter
     * « Besançon (25) » → « Lyon (69) ».
     */
    private static boolean memeVille(String a, String b) {
        return extraireVille(a).equals(extraireVille(b));
    }

    private static String extraireVille(String lieu) {
        if (lieu == null) return "";
        int paren = lieu.indexOf('(');
        String ville = paren > 0 ? lieu.substring(0, paren) : lieu;
        String sansAccents = java.text.Normalizer.normalize(ville.trim(), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return sansAccents.toLowerCase().replaceAll("[^a-z]", "");
    }

    /**
     * Supprime un client. Réservé aux utilisateurs MCD. La suppression échoue
     * si le client a au moins une fiche associée — il faut supprimer les fiches
     * au préalable.
     *
     * @throws NotFoundException                si le client n'existe pas
     * @throws jakarta.ws.rs.ForbiddenException si l'utilisateur n'est pas MCD
     * @throws BadRequestException              si le client a encore des fiches
     */
    public void deleteClient(Long id, Utilisateur utilisateur) {
        permissionService.ensurePeutSupprimerClient(utilisateur);
        Client c = clientRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Client introuvable : " + id));
        long nbFiches = clientRepository.countFiches(id);
        if (nbFiches > 0) {
            throw new BadRequestException(
                    "Ce client a " + nbFiches + " fiche(s) associée(s) : "
                  + "il faut les supprimer avant de pouvoir supprimer le client.");
        }
        String libelle = c.getLibelle();
        clientRepository.delete(c);
        journalService.log(
                utilisateur,
                TypeActionJournal.SUPPRESSION,
                TypeEntiteJournal.CLIENT,
                id,
                libelle,
                "Suppression du client");
    }

    // --- Helpers ---

    private Client applyRequest(Client c, ClientRequest req) {
        c.setIdentifie(req.identifie);
        c.setNom(req.nom);
        c.setPrenom(req.prenom);
        c.setDateNaissance(parseDate(req.dateNaissance));
        c.setLieuNaissance(req.lieuNaissance);
        c.setPpe(req.ppe);
        c.setRue(req.rue);
        c.setComplement(req.complement);
        c.setCodePostal(req.codePostal);
        c.setVille(req.ville);
        c.setPays(req.pays);
        c.setTypePiece(req.typePiece);
        c.setNumeroPiece(req.numeroPiece);
        c.setDateDelivrance(parseDate(req.dateDelivrance));
        c.setPrefectureDelivrance(req.prefectureDelivrance);
        c.setPaysDelivrance(req.paysDelivrance);
        c.setDescriptionPhysique(req.descriptionPhysique);
        return c;
    }

    /** Parse une date au format ISO en tolérant null et chaîne vide / blanche. */
    private static LocalDate parseDate(String s) {
        return (s == null || s.isBlank()) ? null : LocalDate.parse(s, DATE_FMT);
    }

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private FicheSummaryResponse toFicheSummary(FicheLABFT f) {
        LocalDateTime derniere = f.getDateModification() != null
                ? f.getDateModification()
                : f.getDateCreation();
        String derniereModif = derniere != null ? derniere.format(TIME_FMT) : null;
        LocalDate modifWorkDay = WorkDay.from(derniere);
        String derniereModifDate = modifWorkDay != null ? modifWorkDay.format(DATE_FMT) : null;

        Set<String> typesJeu = new LinkedHashSet<>();
        f.getLignes().forEach(l -> {
            if (l.getTypeJeu() != null) typesJeu.add(l.getTypeJeu().name());
        });
        return new FicheSummaryResponse(
                f.getId(),
                f.getClient().getLibelle(),
                f.getClient().isPpe(),
                f.getClient().getChampsManquants(),
                f.getClient().getId(),
                f.getDate() != null ? f.getDate().format(DATE_FMT) : null,
                f.getCreePar().getNomComplet(),
                List.copyOf(typesJeu),
                f.getTotalRGM(),
                f.getTotalChangeEntrant(),
                f.getTotalChangeSortant(),
                derniereModif,
                derniereModifDate
        );
    }
}
