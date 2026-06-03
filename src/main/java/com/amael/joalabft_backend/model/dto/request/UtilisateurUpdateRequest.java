package com.amael.joalabft_backend.model.dto.request;

/**
 * Corps de la requête de modification d'un utilisateur applicatif.
 *
 * <p>Tous les champs sont optionnels : seuls les attributs non {@code null}
 * sont appliqués (sémantique PATCH). Le mot de passe n'est volontairement pas
 * modifiable ici — il dispose d'un parcours dédié (« réinitialiser le mot de
 * passe »).
 */
public class UtilisateurUpdateRequest {
    public String identifiant;
    public String nom;
    public String prenom;
    /** Valeur attendue : un nom de {@link com.amael.joalabft_backend.model.enums.RoleUtilisateur}. */
    public String role;
}
