package com.amael.joalabft_backend.model.service;

import com.amael.joalabft_backend.model.dto.request.UtilisateurRequest;
import com.amael.joalabft_backend.model.dto.request.UtilisateurUpdateRequest;
import com.amael.joalabft_backend.model.dto.response.UtilisateurResponse;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.enums.RoleUtilisateur;
import com.amael.joalabft_backend.model.enums.TypeActionJournal;
import com.amael.joalabft_backend.model.enums.TypeEntiteJournal;
import com.amael.joalabft_backend.model.repository.UtilisateurRepository;
import jakarta.ejb.Stateless;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;

import java.util.ArrayList;
import java.util.List;

/**
 * Logique métier de gestion des utilisateurs applicatifs.
 *
 * <p>Les règles de droits sont déléguées à {@link PermissionService} : qui peut
 * lister, qui peut créer quel rôle, qui peut modifier ou archiver un compte.
 *
 * <p><strong>Archivage</strong> — l'application ne supprime jamais un utilisateur
 * (sinon les fiches et lignes de transaction passées perdraient leur référence
 * vers l'auteur). À la place, {@link #archiverUtilisateur(Long, Utilisateur)}
 * positionne {@code archive = true} : le compte disparaît de la liste, son login
 * est refusé, ses sessions actives sont invalidées, mais ses traces historiques
 * restent intactes.
 */
@Stateless
public class UtilisateurService {

    @Inject
    private UtilisateurRepository utilisateurRepository;

    @Inject
    private PermissionService permissionService;

    @Inject
    private JournalService journalService;

    @Inject
    private SessionStore sessionStore;

    /**
     * Retourne la liste des utilisateurs applicatifs. Les comptes archivés ne
     * sont retournés qu'à un MCD qui demande explicitement à les voir.
     *
     * @throws jakarta.ws.rs.ForbiddenException si {@code demandeur} n'a pas le rôle requis
     */
    public List<UtilisateurResponse> listUtilisateurs(Utilisateur demandeur, boolean includeArchives) {
        permissionService.ensurePeutListerUtilisateurs(demandeur);
        boolean veutArchives = includeArchives
                && demandeur != null
                && demandeur.getRole() == RoleUtilisateur.MCD;
        return utilisateurRepository.findAll(veutArchives).stream()
                .map(this::toResponse)
                .toList();
    }

    /** Variante par défaut : ne renvoie que les comptes actifs. */
    public List<UtilisateurResponse> listUtilisateurs(Utilisateur demandeur) {
        return listUtilisateurs(demandeur, false);
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

        RoleUtilisateur role = parseRole(req.role);

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

    /**
     * Modifie un utilisateur applicatif. Seuls les champs non {@code null} de
     * la requête sont appliqués (sémantique PATCH).
     *
     * @throws jakarta.ws.rs.ForbiddenException si {@code modificateur} n'est pas MCD
     * @throws NotFoundException                si l'utilisateur n'existe pas
     * @throws BadRequestException              si la requête est invalide
     */
    public UtilisateurResponse updateUtilisateur(Long id, UtilisateurUpdateRequest req, Utilisateur modificateur) {
        permissionService.ensurePeutModifierUtilisateur(modificateur);
        if (req == null) throw new BadRequestException("Corps de requête manquant.");

        Utilisateur u = utilisateurRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));

        if (u.isArchive()) {
            throw new BadRequestException("Cet utilisateur est archivé : restauration nécessaire avant modification.");
        }

        List<String> changements = new ArrayList<>();

        if (req.identifiant != null) {
            String nouveau = req.identifiant.trim();
            if (nouveau.isEmpty()) throw new BadRequestException("L'identifiant ne peut pas être vide.");
            if (!nouveau.equals(u.getIdentifiant())) {
                if (utilisateurRepository.existsByIdentifiant(nouveau, u.getId())) {
                    throw new BadRequestException("Un utilisateur avec cet identifiant existe déjà.");
                }
                changements.add("identifiant : « " + u.getIdentifiant() + " » → « " + nouveau + " »");
                u.setIdentifiant(nouveau);
            }
        }
        if (req.nom != null) {
            String nouveau = req.nom.trim();
            if (nouveau.isEmpty()) throw new BadRequestException("Le nom ne peut pas être vide.");
            if (!nouveau.equals(u.getNom())) {
                changements.add("nom : « " + u.getNom() + " » → « " + nouveau + " »");
                u.setNom(nouveau);
            }
        }
        if (req.prenom != null) {
            String nouveau = req.prenom.trim();
            if (nouveau.isEmpty()) throw new BadRequestException("Le prénom ne peut pas être vide.");
            if (!nouveau.equals(u.getPrenom())) {
                changements.add("prénom : « " + u.getPrenom() + " » → « " + nouveau + " »");
                u.setPrenom(nouveau);
            }
        }
        if (req.role != null) {
            RoleUtilisateur nouveau = parseRole(req.role);
            if (nouveau != u.getRole()) {
                // Un MCD ne peut pas se rétrograder lui-même : il pourrait être le
                // dernier MCD actif et bloquer toute future administration.
                if (modificateur.getId() != null && modificateur.getId().equals(u.getId())
                        && nouveau != RoleUtilisateur.MCD) {
                    throw new BadRequestException("Vous ne pouvez pas vous retirer votre propre rôle MCD.");
                }
                changements.add("rôle : " + u.getRole() + " → " + nouveau);
                u.setRole(nouveau);
            }
        }

        if (changements.isEmpty()) {
            return toResponse(u);
        }

        Utilisateur sauvegarde = utilisateurRepository.update(u);
        journalService.log(
                modificateur,
                TypeActionJournal.MODIFICATION,
                TypeEntiteJournal.UTILISATEUR,
                sauvegarde.getId(),
                sauvegarde.getIdentifiant(),
                "Modification de l'utilisateur " + sauvegarde.getIdentifiant() + " — "
                        + String.join(" ; ", changements));
        return toResponse(sauvegarde);
    }

    /**
     * Archive un utilisateur applicatif. L'enregistrement reste en base pour
     * préserver les références historiques ; en revanche le compte ne peut plus
     * se connecter et toutes ses sessions actives sont invalidées.
     *
     * @throws jakarta.ws.rs.ForbiddenException si {@code demandeur} n'est pas MCD
     *         ou cherche à s'archiver lui-même
     * @throws NotFoundException                si l'utilisateur n'existe pas
     */
    public UtilisateurResponse archiverUtilisateur(Long id, Utilisateur demandeur) {
        Utilisateur u = utilisateurRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        permissionService.ensurePeutArchiverUtilisateur(demandeur, u);

        if (u.isArchive()) {
            return toResponse(u);
        }

        u.setArchive(true);
        Utilisateur sauvegarde = utilisateurRepository.update(u);
        sessionStore.invalidateByUtilisateurId(sauvegarde.getId());

        journalService.log(
                demandeur,
                TypeActionJournal.SUPPRESSION,
                TypeEntiteJournal.UTILISATEUR,
                sauvegarde.getId(),
                sauvegarde.getIdentifiant(),
                "Archivage de l'utilisateur " + sauvegarde.getIdentifiant());
        return toResponse(sauvegarde);
    }

    /**
     * Réactive un compte archivé : remet {@code archive = false}. Le compte
     * pourra à nouveau se connecter avec son mot de passe existant. Utilisé
     * lorsqu'une personne précédemment archivée revient travailler.
     *
     * @throws jakarta.ws.rs.ForbiddenException si {@code demandeur} n'est pas MCD
     * @throws NotFoundException                si l'utilisateur n'existe pas
     */
    public UtilisateurResponse desarchiverUtilisateur(Long id, Utilisateur demandeur) {
        permissionService.ensurePeutDesarchiverUtilisateur(demandeur);
        Utilisateur u = utilisateurRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));

        if (!u.isArchive()) {
            return toResponse(u);
        }

        u.setArchive(false);
        Utilisateur sauvegarde = utilisateurRepository.update(u);

        journalService.log(
                demandeur,
                TypeActionJournal.MODIFICATION,
                TypeEntiteJournal.UTILISATEUR,
                sauvegarde.getId(),
                sauvegarde.getIdentifiant(),
                "Réactivation de l'utilisateur " + sauvegarde.getIdentifiant());
        return toResponse(sauvegarde);
    }

    // --- Helpers ---

    private void validerChamp(String valeur, String nom) {
        if (valeur == null || valeur.isBlank()) {
            throw new BadRequestException("Le champ « " + nom + " » est obligatoire.");
        }
    }

    private RoleUtilisateur parseRole(String role) {
        try {
            return RoleUtilisateur.valueOf(role);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Rôle inconnu : " + role);
        }
    }

    private UtilisateurResponse toResponse(Utilisateur u) {
        return new UtilisateurResponse(
                u.getId(),
                u.getIdentifiant(),
                u.getNom(),
                u.getPrenom(),
                u.getRole().name(),
                u.isArchive()
        );
    }
}
