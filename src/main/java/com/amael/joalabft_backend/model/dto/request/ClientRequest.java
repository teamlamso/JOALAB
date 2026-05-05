package com.amael.joalabft_backend.model.dto.request;

/** Corps de la requête de création ou mise à jour d'un client. */
public class ClientRequest {

    /** {@code true} si le client est identifié, {@code false} pour un client non-identifié. */
    public boolean identifie;

    // --- Client identifié ---
    public String nom;
    public String prenom;
    /** Format ISO : yyyy-MM-dd */
    public String dateNaissance;
    public String lieuNaissance;
    public boolean ppe;
    public String rue;
    public String complement;
    public String codePostal;
    public String ville;
    public String pays;

    // --- Pièce d'identité ---
    public String typePiece;
    public String numeroPiece;
    /** Format ISO : yyyy-MM-dd */
    public String dateDelivrance;
    public String prefectureDelivrance;
    public String paysDelivrance;

    // --- Client non-identifié ---
    public String descriptionPhysique;
}
