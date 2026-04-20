package com.amael.joalabft_backend.model.dto.response;

/** Résumé d'un client pour les listes. */
public class ClientSummaryResponse {
    public Long id;
    public String libelle;
    public String dateNaissance;
    public String ville;
    public String pays;
    /** Date de la dernière fiche (yyyy-MM-dd), ou {@code null} si aucune fiche. */
    public String derniereActivite;

    public ClientSummaryResponse(Long id, String libelle, String dateNaissance,
                                  String ville, String pays, String derniereActivite) {
        this.id               = id;
        this.libelle          = libelle;
        this.dateNaissance    = dateNaissance;
        this.ville            = ville;
        this.pays             = pays;
        this.derniereActivite = derniereActivite;
    }
}
