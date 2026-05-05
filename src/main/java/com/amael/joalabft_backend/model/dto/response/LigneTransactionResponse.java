package com.amael.joalabft_backend.model.dto.response;

import java.math.BigDecimal;

/** Détail d'une ligne de transaction. */
public class LigneTransactionResponse {
    public Long id;
    public String typeJeu;
    public String typePaiement;
    public String typeChange;
    public Integer numeroSocle;
    public BigDecimal montantRGM;
    public BigDecimal changeEntrant;
    public BigDecimal changeSortant;
    public String observations;
    public String caissier;

    public LigneTransactionResponse(Long id, String typeJeu, String typePaiement,
                                     String typeChange, Integer numeroSocle,
                                     BigDecimal montantRGM, BigDecimal changeEntrant,
                                     BigDecimal changeSortant, String observations,
                                     String caissier) {
        this.id            = id;
        this.typeJeu       = typeJeu;
        this.typePaiement  = typePaiement;
        this.typeChange    = typeChange;
        this.numeroSocle   = numeroSocle;
        this.montantRGM    = montantRGM;
        this.changeEntrant = changeEntrant;
        this.changeSortant = changeSortant;
        this.observations  = observations;
        this.caissier      = caissier;
    }
}
