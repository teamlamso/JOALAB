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
    /** {@code true} si le montant RGM a déjà été reporté dans FrontCage. */
    public boolean enregistreFrontCage;
    /** {@code true} si le change entrant a déjà été reporté dans FrontCage. */
    public boolean enregistreFrontCageEntrant;

    public LigneTransactionResponse(Long id, String typeJeu, String typePaiement,
                                     String typeChange, Integer numeroSocle,
                                     BigDecimal montantRGM, BigDecimal changeEntrant,
                                     BigDecimal changeSortant, String observations,
                                     String caissier,
                                     boolean enregistreFrontCage,
                                     boolean enregistreFrontCageEntrant) {
        this.id                          = id;
        this.typeJeu                     = typeJeu;
        this.typePaiement                = typePaiement;
        this.typeChange                  = typeChange;
        this.numeroSocle                 = numeroSocle;
        this.montantRGM                  = montantRGM;
        this.changeEntrant               = changeEntrant;
        this.changeSortant               = changeSortant;
        this.observations                = observations;
        this.caissier                    = caissier;
        this.enregistreFrontCage         = enregistreFrontCage;
        this.enregistreFrontCageEntrant  = enregistreFrontCageEntrant;
    }
}
