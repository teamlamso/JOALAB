package com.amael.joalabft_backend.model.dto.request;

import java.math.BigDecimal;

/** Corps d'une ligne de transaction au sein d'une fiche. */
public class LigneTransactionRequest {

    /** Identifiant de la ligne existante (présent uniquement lors d'une mise à jour). */
    public Long id;

    /** Valeurs : MAS, JTE, JT */
    public String typeJeu;

    /** Valeurs : ESPECE, CHEQUE, CB */
    public String typePaiement;

    /** Valeurs : JETON, PLAQUE, TICKET — facultatif. */
    public String typeChange;

    /** Numéro de socle de la machine — facultatif. */
    public Integer numeroSocle;

    /** Montant Online / RGM — facultatif. */
    public BigDecimal montantRGM;

    public BigDecimal changeEntrant;
    public BigDecimal changeSortant;
    public String observations;

    /** Vrai si le caissier a déjà reporté ce montant RGM dans FrontCage. */
    public boolean enregistreFrontCage;
}
