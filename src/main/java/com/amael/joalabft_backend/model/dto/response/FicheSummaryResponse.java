package com.amael.joalabft_backend.model.dto.response;

import java.math.BigDecimal;

/** Résumé d'une fiche LAB-FT pour les listes (accueil et profil client). */
public class FicheSummaryResponse {
    public Long id;
    /** Libellé du client (nom + prénom ou description physique). */
    public String clientLibelle;
    /** Indique si le client de la fiche est PPE (Personne Politiquement Exposée). */
    public boolean clientPpe;
    /** Date de création de la fiche (yyyy-MM-dd). */
    public String date;
    /** Nom complet du caissier ayant créé la fiche. */
    public String caissierNom;
    public BigDecimal totalRGM;
    public BigDecimal totalEntrant;
    public BigDecimal totalSortant;
    /** Heure de dernière modification (HH:mm), ou {@code null}. */
    public String derniereModif;

    public FicheSummaryResponse(Long id, String clientLibelle, boolean clientPpe, String date, String caissierNom,
                                 BigDecimal totalRGM, BigDecimal totalEntrant, BigDecimal totalSortant,
                                 String derniereModif) {
        this.id             = id;
        this.clientLibelle  = clientLibelle;
        this.clientPpe      = clientPpe;
        this.date           = date;
        this.caissierNom    = caissierNom;
        this.totalRGM       = totalRGM;
        this.totalEntrant   = totalEntrant;
        this.totalSortant   = totalSortant;
        this.derniereModif  = derniereModif;
    }
}
