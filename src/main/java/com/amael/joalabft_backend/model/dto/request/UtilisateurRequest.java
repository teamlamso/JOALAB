package com.amael.joalabft_backend.model.dto.request;

/** Corps de la requête de création d'un utilisateur applicatif. */
public class UtilisateurRequest {
    public String identifiant;
    public String motDePasse;
    public String nom;
    public String prenom;
    /** Valeur attendue : un nom de {@link com.amael.joalabft_backend.model.enums.RoleUtilisateur}. */
    public String role;
}
