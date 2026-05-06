package com.amael.joalabft_backend.model.service;

import com.amael.joalabft_backend.model.dto.request.ClientRequest;
import com.amael.joalabft_backend.model.dto.response.ClientDetailResponse;
import com.amael.joalabft_backend.model.dto.response.ClientSummaryResponse;
import com.amael.joalabft_backend.model.dto.response.FicheSummaryResponse;
import com.amael.joalabft_backend.model.entity.Client;
import com.amael.joalabft_backend.model.entity.FicheLABFT;
import com.amael.joalabft_backend.model.repository.ClientRepository;
import com.amael.joalabft_backend.model.repository.FicheLABFTRepository;
import jakarta.ejb.Stateless;
import jakarta.inject.Inject;
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

    /** Retourne la liste des clients avec un résumé, filtrée optionnellement par recherche. */
    public List<ClientSummaryResponse> listClients(String search) {
        return clientRepository.findAll(search).stream()
                .map(c -> {
                    LocalDate activite = clientRepository.getDerniereActivite(c.getId());
                    return new ClientSummaryResponse(
                            c.getId(),
                            c.getLibelle(),
                            c.getDateNaissance() != null ? c.getDateNaissance().format(DATE_FMT) : null,
                            c.getVille(),
                            c.getPays(),
                            c.isPpe(),
                            activite != null ? activite.format(DATE_FMT) : null
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
    public Long createClient(ClientRequest req) {
        Client c = applyRequest(new Client(), req);
        clientRepository.save(c);
        return c.getId();
    }

    /**
     * Met à jour un client existant.
     *
     * @throws NotFoundException si le client n'existe pas
     */
    public void updateClient(Long id, ClientRequest req) {
        Client c = clientRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Client introuvable : " + id));
        clientRepository.update(applyRequest(c, req));
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
        String derniereModif = f.getDateModification() != null
                ? f.getDateModification().toLocalTime().format(DateTimeFormatter.ofPattern("HH:mm"))
                : null;
        return new FicheSummaryResponse(
                f.getId(),
                f.getClient().getLibelle(),
                f.getClient().isPpe(),
                f.getDate() != null ? f.getDate().format(DATE_FMT) : null,
                f.getCreePar().getNomComplet(),
                f.getTotalRGM(),
                f.getTotalChangeEntrant(),
                f.getTotalChangeSortant(),
                derniereModif
        );
    }
}
