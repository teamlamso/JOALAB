package com.amael.joalabft_backend.model.dto.response;

/** Réponse à une connexion réussie. */
public class LoginResponse {
    public String token;
    public Long id;
    public String identifiant;
    public String nom;
    public String prenom;
    public String role;

    public LoginResponse(String token, Long id, String identifiant,
                         String nom, String prenom, String role) {
        this.token      = token;
        this.id         = id;
        this.identifiant = identifiant;
        this.nom        = nom;
        this.prenom     = prenom;
        this.role       = role;
    }
}
