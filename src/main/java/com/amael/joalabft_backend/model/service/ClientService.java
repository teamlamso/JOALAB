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
import jakarta.ejb.Stateless;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

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
        // Une seule requête pour récupérer la dernière activité de tous les
        // clients de la liste, plutôt que N requêtes (N+1 dans la liste qui
        // expliquait les 15 s d'attente avec le SQL en FINE).
        java.util.Map<Long, LocalDate> activites = clientRepository.getDerniereActivitePourIds(
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
                            c.isComplet()
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
        dto.complet             = c.isComplet();
        dto.fiches              = fiches;
        return dto;
    }

    /**
     * Recherche les clients existants susceptibles d'être un doublon du client
     * en cours de saisie (mêmes nom+prénom+date de naissance, ou même numéro
     * de pièce). Retourne la liste des candidats sous forme de DTO détaillé.
     */
    public List<ClientDetailResponse> findSimilar(ClientRequest req) {
        LocalDate dateNaissance = req.dateNaissance != null ? LocalDate.parse(req.dateNaissance, DATE_FMT) : null;
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
        c.setDateDelivrance(req.dateDelivrance != null ? LocalDate.parse(req.dateDelivrance, DATE_FMT) : null);
        c.setPrefectureDelivrance(req.prefectureDelivrance);
        c.setPaysDelivrance(req.paysDelivrance);

        clientRepository.update(c);
        journalService.log(
                utilisateur,
                TypeActionJournal.MODIFICATION,
                TypeEntiteJournal.CLIENT,
                c.getId(),
                c.getLibelle(),
                "Modification de l'adresse ou de la pièce d'identité");
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
        c.setDateNaissance(req.dateNaissance != null ? LocalDate.parse(req.dateNaissance, DATE_FMT) : null);
        c.setLieuNaissance(req.lieuNaissance);
        c.setPpe(req.ppe);
        c.setRue(req.rue);
        c.setComplement(req.complement);
        c.setCodePostal(req.codePostal);
        c.setVille(req.ville);
        c.setPays(req.pays);
        c.setTypePiece(req.typePiece);
        c.setNumeroPiece(req.numeroPiece);
        c.setDateDelivrance(req.dateDelivrance != null ? LocalDate.parse(req.dateDelivrance, DATE_FMT) : null);
        c.setPrefectureDelivrance(req.prefectureDelivrance);
        c.setPaysDelivrance(req.paysDelivrance);
        c.setDescriptionPhysique(req.descriptionPhysique);
        return c;
    }

    private FicheSummaryResponse toFicheSummary(FicheLABFT f) {
        java.time.LocalDateTime derniere = f.getDateModification() != null
                ? f.getDateModification()
                : f.getDateCreation();
        String derniereModif = derniere != null
                ? derniere.format(DateTimeFormatter.ofPattern("HH:mm"))
                : null;
        String derniereModifDate = derniere != null
                ? (derniere.getHour() < 6
                        ? derniere.toLocalDate().minusDays(1).format(DATE_FMT)
                        : derniere.toLocalDate().format(DATE_FMT))
                : null;
        java.util.Set<String> typesJeu = new java.util.LinkedHashSet<>();
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
                java.util.List.copyOf(typesJeu),
                f.getTotalRGM(),
                f.getTotalChangeEntrant(),
                f.getTotalChangeSortant(),
                derniereModif,
                derniereModifDate
        );
    }
}
