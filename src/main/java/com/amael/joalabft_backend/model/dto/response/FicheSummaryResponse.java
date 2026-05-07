package com.amael.joalabft_backend.model.dto.response;

import java.math.BigDecimal;

/** Résumé d'une fiche LAB-FT pour les listes (accueil et profil client). */
public class FicheSummaryResponse {
    public Long id;
    /** Libellé du client (nom + prénom ou description physique). */
    public String clientLibelle;
    /** Indique si le client de la fiche est PPE (Personne Politiquement Exposée). */
    public boolean clientPpe;
    /** Identifiant du client (utile pour rebondir vers son profil). */
    public Long clientId;
    /** Date de création de la fiche (yyyy-MM-dd). */
    public String date;
    /** Nom complet du caissier ayant créé la fiche. */
    public String caissierNom;
    /** Type de jeu de la fiche (MAS, JTE ou JT) ; {@code null} si la fiche est vide. */
    public String typeJeu;
    public BigDecimal totalRGM;
    public BigDecimal totalEntrant;
    public BigDecimal totalSortant;
    /** Heure de dernière modification (HH:mm), ou {@code null}. */
    public String derniereModif;

    public FicheSummaryResponse(Long id, String clientLibelle, boolean clientPpe, Long clientId,
                                 String date, String caissierNom, String typeJeu,
                                 BigDecimal totalRGM, BigDecimal totalEntrant, BigDecimal totalSortant,
                                 String derniereModif) {
        this.id             = id;
        this.clientLibelle  = clientLibelle;
        this.clientPpe      = clientPpe;
        this.clientId       = clientId;
        this.date           = date;
        this.caissierNom    = caissierNom;
        this.typeJeu        = typeJeu;
        this.totalRGM       = totalRGM;
        this.totalEntrant   = totalEntrant;
        this.totalSortant   = totalSortant;
        this.derniereModif  = derniereModif;
    }
}
