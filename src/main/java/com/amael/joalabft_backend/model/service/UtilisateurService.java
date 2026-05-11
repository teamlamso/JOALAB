package com.amael.joalabft_backend.model.service;

import com.amael.joalabft_backend.model.dto.request.UtilisateurRequest;
import com.amael.joalabft_backend.model.dto.response.UtilisateurResponse;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.enums.RoleUtilisateur;
import com.amael.joalabft_backend.model.enums.TypeActionJournal;
import com.amael.joalabft_backend.model.enums.TypeEntiteJournal;
import com.amael.joalabft_backend.model.repository.UtilisateurRepository;
import jakarta.ejb.Stateless;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;

import java.util.List;

/**
 * Logique métier de gestion des utilisateurs applicatifs.
 *
 * <p>Les règles de droits sont déléguées à {@link PermissionService} : qui peut
 * lister, qui peut créer quel rôle.
 */
@Stateless
public class UtilisateurService {

    @Inject
    private UtilisateurRepository utilisateurRepository;

    @Inject
    private PermissionService permissionService;

    @Inject
    private JournalService journalService;

    /**
     * Retourne la liste des utilisateurs applicatifs.
     *
     * @throws jakarta.ws.rs.ForbiddenException si {@code demandeur} n'a pas le rôle requis
     */
    public List<UtilisateurResponse> listUtilisateurs(Utilisateur demandeur) {
        permissionService.ensurePeutListerUtilisateurs(demandeur);
        return utilisateurRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Crée un nouvel utilisateur. Le rôle du créateur doit être supérieur ou
     * égal à celui demandé (MCD → tous, RESPONSABLE_CAISSE → CAISSIER).
     *
     * @throws jakarta.ws.rs.ForbiddenException si le créateur n'a pas le droit
     *         de créer un utilisateur avec ce rôle
     * @throws BadRequestException              si la requête est invalide
     *         (champ manquant, identifiant déjà pris, rôle inconnu)
     */
    public UtilisateurResponse createUtilisateur(UtilisateurRequest req, Utilisateur createur) {
        if (req == null) throw new BadRequestException("Corps de requête manquant.");
        validerChamp(req.identifiant, "identifiant");
        validerChamp(req.motDePasse, "motDePasse");
        validerChamp(req.nom, "nom");
        validerChamp(req.prenom, "prenom");
        validerChamp(req.role, "role");

        RoleUtilisateur role;
        try {
            role = RoleUtilisateur.valueOf(req.role);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Rôle inconnu : " + req.role);
        }

        permissionService.ensurePeutCreerUtilisateur(createur, role);

        if (utilisateurRepository.existsByIdentifiant(req.identifiant)) {
            throw new BadRequestException("Un utilisateur avec cet identifiant existe déjà.");
        }

        Utilisateur u = new Utilisateur();
        u.setIdentifiant(req.identifiant.trim());
        u.setMotDePasse(PasswordHasher.hash(req.motDePasse));
        u.setNom(req.nom.trim());
        u.setPrenom(req.prenom.trim());
        u.setRole(role);

        utilisateurRepository.save(u);
        journalService.log(
                createur,
                TypeActionJournal.CREATION,
                TypeEntiteJournal.UTILISATEUR,
                u.getId(),
                u.getIdentifiant(),
                "Création de l'utilisateur " + u.getIdentifiant() + " (" + role.name() + ")");
        return toResponse(u);
    }

    // --- Helpers ---

    private void validerChamp(String valeur, String nom) {
        if (valeur == null || valeur.isBlank()) {
            throw new BadRequestException("Le champ « " + nom + " » est obligatoire.");
        }
    }

    private UtilisateurResponse toResponse(Utilisateur u) {
        return new UtilisateurResponse(
                u.getId(),
                u.getIdentifiant(),
                u.getNom(),
                u.getPrenom(),
                u.getRole().name()
        );
    }
}
