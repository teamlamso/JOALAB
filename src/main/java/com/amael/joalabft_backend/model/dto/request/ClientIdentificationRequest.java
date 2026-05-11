package com.amael.joalabft_backend.model.dto.request;

/**
 * Corps de la requête de mise à jour partielle d'un client par un CAISSIER
 * (ou rôle supérieur). Contient uniquement l'adresse et la pièce d'identité —
 * les champs d'état civil (nom, prénom, date/lieu de naissance, PPE,
 * description physique) restent réservés à {@code PUT /clients/{id}} qui exige
 * un rôle {@code RESPONSABLE_CAISSE} ou {@code MCD}.
 */
public class ClientIdentificationRequest {

    // --- Adresse ---
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
}
