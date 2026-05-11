package com.amael.joalabft_backend.model.service;

import com.amael.joalabft_backend.model.dto.response.JournalActionResponse;
import com.amael.joalabft_backend.model.entity.JournalAction;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.enums.TypeActionJournal;
import com.amael.joalabft_backend.model.enums.TypeEntiteJournal;
import com.amael.joalabft_backend.model.repository.JournalActionRepository;
import jakarta.ejb.Stateless;
import jakarta.inject.Inject;

import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Service d'audit applicatif : enregistre toute action côté serveur dans le
 * journal et expose la consultation.
 *
 * <p>L'écriture rejoint la transaction de l'opération métier d'origine : une
 * entrée n'est journalisée que si l'action a effectivement réussi.
 */
@Stateless
public class JournalService {

    private static final int LIMITE_LECTURE_GLOBALE = 500;
    private static final DateTimeFormatter HORODATAGE_FMT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

    @Inject
    private JournalActionRepository repository;

    @Inject
    private PermissionService permissionService;

    /**
     * Enregistre une action dans le journal. {@code description} est facultative
     * (pour les actions évidentes comme une connexion).
     */
    public void log(Utilisateur utilisateur,
                    TypeActionJournal action,
                    TypeEntiteJournal typeEntite,
                    Long entiteId,
                    String libelleEntite,
                    String description) {
        JournalAction entry = new JournalAction();
        entry.setUtilisateur(utilisateur);
        entry.setAction(action);
        entry.setTypeEntite(typeEntite);
        entry.setEntiteId(entiteId);
        entry.setLibelleEntite(libelleEntite);
        entry.setDescription(description);
        repository.save(entry);
    }

    /**
     * Retourne le journal global (les {@value #LIMITE_LECTURE_GLOBALE} dernières
     * entrées). Réservé aux MCD.
     *
     * @throws jakarta.ws.rs.ForbiddenException si l'utilisateur n'est pas MCD
     */
    public List<JournalActionResponse> listGlobal(Utilisateur demandeur) {
        permissionService.ensurePeutLireJournal(demandeur);
        return repository.findAll(LIMITE_LECTURE_GLOBALE).stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Retourne l'historique des actions effectuées sur une fiche précise
     * (toutes les actions ayant touché à cet identifiant de fiche, du plus
     * récent au plus ancien). Accessible à tout utilisateur authentifié.
     */
    public List<JournalActionResponse> listHistoriqueFiche(Long ficheId) {
        return repository.findByEntite(TypeEntiteJournal.FICHE, ficheId).stream()
                .map(this::toResponse)
                .toList();
    }

    // --- Helpers ---

    private JournalActionResponse toResponse(JournalAction j) {
        JournalActionResponse r = new JournalActionResponse();
        r.id            = j.getId();
        r.horodatage    = j.getHorodatage() != null ? j.getHorodatage().format(HORODATAGE_FMT) : null;
        r.action        = j.getAction().name();
        r.typeEntite    = j.getTypeEntite().name();
        r.entiteId      = j.getEntiteId();
        r.libelleEntite = j.getLibelleEntite();
        r.description   = j.getDescription();
        Utilisateur u = j.getUtilisateur();
        if (u != null) {
            r.utilisateurNom         = u.getNomComplet();
            r.utilisateurIdentifiant = u.getIdentifiant();
            r.utilisateurRole        = u.getRole() != null ? u.getRole().name() : null;
        }
        return r;
    }
}
