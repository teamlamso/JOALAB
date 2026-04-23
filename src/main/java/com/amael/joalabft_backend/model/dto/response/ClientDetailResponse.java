package com.amael.joalabft_backend.model.dto.response;

import java.util.List;

/** Détail complet d'un client avec l'historique de ses fiches. */
public class ClientDetailResponse {
    public Long id;
    public String libelle;
    public boolean identifie;

    // --- Client identifié ---
    public String nom;
    public String prenom;
    public String dateNaissance;
    public String rue;
    public String complement;
    public String codePostal;
    public String ville;
    public String pays;
    public String typePiece;
    public String numeroPiece;
    public String dateDelivrance;
    public String prefectureDelivrance;
    public String paysDelivrance;

    // --- Client non-identifié ---
    public String descriptionPhysique;

    /** Historique des fiches, triées par date décroissante. */
    public List<FicheSummaryResponse> fiches;
}
