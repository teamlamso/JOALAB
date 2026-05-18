package com.amael.joalabft_backend.model.service;

import com.amael.joalabft_backend.model.entity.FicheLABFT;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.enums.RoleUtilisateur;
import com.amael.joalabft_backend.model.util.WorkDay;
import jakarta.ejb.Stateless;
import jakarta.ws.rs.ForbiddenException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Centralise la matrice de droits par rôle utilisateur.
 *
 * <p>Règles métier appliquées :
 * <ul>
 *   <li>{@code CAISSIER} — peut modifier les fiches du jour de travail courant
 *       et de la veille ; peut modifier les papiers d'identité et l'adresse d'un
 *       client.</li>
 *   <li>{@code RESPONSABLE_CAISSE} — peut modifier les fiches jusqu'à 31 jours
 *       dans le passé (inclus) ; peut modifier l'identité complète d'un client.</li>
 *   <li>{@code MCD} — peut modifier toute fiche quelle que soit son ancienneté ;
 *       peut supprimer fiches et clients.</li>
 * </ul>
 *
 * <p>Toutes les méthodes {@code ensure...} lèvent une {@link ForbiddenException}
 * (HTTP 403) si la condition n'est pas remplie.
 */
@Stateless
public class PermissionService {

    /** Fenêtre d'édition des fiches pour un CAISSIER (jour + veille). */
    private static final int CAISSIER_FENETRE_JOURS = 1;

    /** Fenêtre d'édition des fiches pour un RESPONSABLE_CAISSE (31 jours). */
    private static final int RESPONSABLE_FENETRE_JOURS = 31;

    /**
     * Indique si {@code utilisateur} a le droit de modifier une fiche dont la
     * date de travail est {@code dateFiche}. L'écart est mesuré en jours entiers
     * entre la date de la fiche et le jour de travail courant.
     */
    public boolean peutModifierFiche(Utilisateur utilisateur, LocalDate dateFiche) {
        if (utilisateur == null || dateFiche == null) return false;
        if (utilisateur.getRole() == RoleUtilisateur.MCD) return true;
        long ecart = ChronoUnit.DAYS.between(dateFiche, WorkDay.today());
        if (ecart < 0) return false;
        return switch (utilisateur.getRole()) {
            case CAISSIER           -> ecart <= CAISSIER_FENETRE_JOURS;
            case RESPONSABLE_CAISSE -> ecart <= RESPONSABLE_FENETRE_JOURS;
            case MCD                -> true;
        };
    }

    /** Lève 403 si {@code utilisateur} ne peut pas modifier {@code fiche}. */
    public void ensurePeutModifierFiche(Utilisateur utilisateur, FicheLABFT fiche) {
        if (!peutModifierFiche(utilisateur, fiche.getDate())) {
            throw new ForbiddenException(
                    "Votre rôle ne vous autorise pas à modifier cette fiche (trop ancienne).");
        }
    }

    /** Indique si {@code utilisateur} peut supprimer une fiche (MCD uniquement). */
    public boolean peutSupprimerFiche(Utilisateur utilisateur) {
        return utilisateur != null && utilisateur.getRole() == RoleUtilisateur.MCD;
    }

    /** Lève 403 si {@code utilisateur} ne peut pas supprimer une fiche. */
    public void ensurePeutSupprimerFiche(Utilisateur utilisateur) {
        if (!peutSupprimerFiche(utilisateur)) {
            throw new ForbiddenException(
                    "Seul un MCD peut supprimer une fiche.");
        }
    }

    /**
     * Indique si {@code utilisateur} peut modifier l'identité complète d'un
     * client (nom, prénom, date/lieu de naissance, PPE, description physique).
     */
    public boolean peutModifierClientComplet(Utilisateur utilisateur) {
        if (utilisateur == null) return false;
        return utilisateur.getRole() == RoleUtilisateur.RESPONSABLE_CAISSE
                || utilisateur.getRole() == RoleUtilisateur.MCD;
    }

    /** Lève 403 si {@code utilisateur} ne peut pas éditer l'identité complète d'un client. */
    public void ensurePeutModifierClientComplet(Utilisateur utilisateur) {
        if (!peutModifierClientComplet(utilisateur)) {
            throw new ForbiddenException(
                    "Seul un responsable de caisse ou un MCD peut modifier l'identité complète d'un client.");
        }
    }

    /** Indique si {@code utilisateur} peut supprimer un client (MCD uniquement). */
    public boolean peutSupprimerClient(Utilisateur utilisateur) {
        return utilisateur != null && utilisateur.getRole() == RoleUtilisateur.MCD;
    }

    /** Lève 403 si {@code utilisateur} ne peut pas supprimer un client. */
    public void ensurePeutSupprimerClient(Utilisateur utilisateur) {
        if (!peutSupprimerClient(utilisateur)) {
            throw new ForbiddenException(
                    "Seul un MCD peut supprimer un client.");
        }
    }

    /**
     * Indique si {@code utilisateur} peut lister les utilisateurs applicatifs
     * (RESPONSABLE_CAISSE et MCD seulement).
     */
    public boolean peutListerUtilisateurs(Utilisateur utilisateur) {
        if (utilisateur == null) return false;
        return utilisateur.getRole() == RoleUtilisateur.RESPONSABLE_CAISSE
                || utilisateur.getRole() == RoleUtilisateur.MCD;
    }

    /** Lève 403 si {@code utilisateur} ne peut pas lister les utilisateurs. */
    public void ensurePeutListerUtilisateurs(Utilisateur utilisateur) {
        if (!peutListerUtilisateurs(utilisateur)) {
            throw new ForbiddenException(
                    "Votre rôle ne vous autorise pas à consulter la liste des utilisateurs.");
        }
    }

    /**
     * Indique si {@code createur} peut créer un utilisateur avec le rôle
     * {@code roleCible}. Règles : MCD peut créer tous les rôles ;
     * RESPONSABLE_CAISSE peut créer uniquement des CAISSIER.
     */
    public boolean peutCreerUtilisateur(Utilisateur createur, RoleUtilisateur roleCible) {
        if (createur == null || roleCible == null) return false;
        return switch (createur.getRole()) {
            case MCD                -> true;
            case RESPONSABLE_CAISSE -> roleCible == RoleUtilisateur.CAISSIER;
            case CAISSIER           -> false;
        };
    }

    /** Lève 403 si {@code createur} ne peut pas créer un utilisateur avec ce rôle. */
    public void ensurePeutCreerUtilisateur(Utilisateur createur, RoleUtilisateur roleCible) {
        if (!peutCreerUtilisateur(createur, roleCible)) {
            throw new ForbiddenException(
                    "Votre rôle ne vous autorise pas à créer un utilisateur avec le rôle "
                  + roleCible + ".");
        }
    }

    /** Indique si {@code utilisateur} peut consulter le journal global (MCD uniquement). */
    public boolean peutLireJournal(Utilisateur utilisateur) {
        return utilisateur != null && utilisateur.getRole() == RoleUtilisateur.MCD;
    }

    /** Lève 403 si {@code utilisateur} ne peut pas consulter le journal global. */
    public void ensurePeutLireJournal(Utilisateur utilisateur) {
        if (!peutLireJournal(utilisateur)) {
            throw new ForbiddenException(
                    "Seul un MCD peut consulter le journal d'audit.");
        }
    }

    /**
     * Indique si {@code utilisateur} peut consulter l'historique d'une fiche
     * (RESPONSABLE_CAISSE ou MCD). Les CAISSIER ne voient pas l'historique.
     */
    public boolean peutLireHistoriqueFiche(Utilisateur utilisateur) {
        if (utilisateur == null) return false;
        return utilisateur.getRole() == RoleUtilisateur.RESPONSABLE_CAISSE
                || utilisateur.getRole() == RoleUtilisateur.MCD;
    }

    /** Lève 403 si {@code utilisateur} ne peut pas consulter l'historique d'une fiche. */
    public void ensurePeutLireHistoriqueFiche(Utilisateur utilisateur) {
        if (!peutLireHistoriqueFiche(utilisateur)) {
            throw new ForbiddenException(
                    "Votre rôle ne vous autorise pas à consulter l'historique des fiches.");
        }
    }

    /**
     * Indique si {@code utilisateur} peut importer des clients en masse via
     * un fichier Excel (RESPONSABLE_CAISSE ou MCD).
     */
    public boolean peutImporterClients(Utilisateur utilisateur) {
        if (utilisateur == null) return false;
        return utilisateur.getRole() == RoleUtilisateur.RESPONSABLE_CAISSE
                || utilisateur.getRole() == RoleUtilisateur.MCD;
    }

    /** Lève 403 si {@code utilisateur} ne peut pas importer de clients. */
    public void ensurePeutImporterClients(Utilisateur utilisateur) {
        if (!peutImporterClients(utilisateur)) {
            throw new ForbiddenException(
                    "Votre rôle ne vous autorise pas à importer des clients.");
        }
    }
}
