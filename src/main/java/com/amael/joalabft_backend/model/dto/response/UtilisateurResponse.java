package com.amael.joalabft_backend.model.dto.response;

/**
 * Représentation publique d'un utilisateur applicatif.
 * Ne contient jamais le hash du mot de passe.
 */
public class UtilisateurResponse {
    public Long id;
    public String identifiant;
    public String nom;
    public String prenom;
    public String role;

    public UtilisateurResponse() {}

    public UtilisateurResponse(Long id, String identifiant, String nom, String prenom, String role) {
        this.id          = id;
        this.identifiant = identifiant;
        this.nom         = nom;
        this.prenom      = prenom;
        this.role        = role;
    }
}
