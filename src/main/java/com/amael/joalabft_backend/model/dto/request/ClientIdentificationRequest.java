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

    // --- État civil partiellement éditable par un CAISSIER ---
    // Règles appliquées côté ClientService.updateClientIdentification :
    //   - dateNaissance n'est appliquée que si elle manque côté client.
    //   - lieuNaissance est appliquée si manquant OU si le format actuel est
    //     non conforme (sans numéro de département ni pays entre parenthèses).
    //   - ppe ne peut passer que de false à true (jamais l'inverse).
    /** Format ISO : yyyy-MM-dd */
    public String dateNaissance;
    public String lieuNaissance;
    /** {@code null} = pas de changement demandé. {@code true} = activation PPE. */
    public Boolean ppe;
}
