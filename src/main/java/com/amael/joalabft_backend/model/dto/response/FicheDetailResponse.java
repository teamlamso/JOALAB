package com.amael.joalabft_backend.model.dto.response;

import java.math.BigDecimal;
import java.util.List;

/** Détail complet d'une fiche LAB-FT avec toutes ses lignes de transaction. */
public class FicheDetailResponse {
    public Long id;
    public String date;
    public String creePar;
    public String modifiePar;
    public String dateModification;

    // --- Client ---
    public Long clientId;
    public String clientLibelle;
    public String clientNom;
    public String clientPrenom;
    public String clientDateNaissance;
    public String clientRue;
    public String clientCodePostal;
    public String clientVille;
    public String clientPays;
    public String clientTypePiece;
    public String clientDateDelivrance;
    public String clientPrefecture;
    public String clientDescriptionPhysique;
    public boolean clientIdentifie;

    // --- Totaux ---
    public BigDecimal totalRGM;
    public BigDecimal totalEntrant;
    public BigDecimal totalSortant;

    public List<LigneTransactionResponse> lignes;
}
