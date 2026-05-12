package com.amael.joalabft_backend.model.dto.response;

import java.math.BigDecimal;
import java.util.List;

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
    /** Types de jeu présents dans la fiche (sous-ensemble de {MAS, JTE, JT}). */
    public List<String> typesJeu;
    public BigDecimal totalRGM;
    public BigDecimal totalEntrant;
    public BigDecimal totalSortant;
    /** Heure de dernière modification (HH:mm), ou {@code null}. */
    public String derniereModif;
    /** Jour de travail de la dernière modification (yyyy-MM-dd) — sert au front
     *  à dire « aujourd'hui » / « hier » / « DD/MM ». Indépendant de la date
     *  de la fiche : une fiche de la veille modifiée aujourd'hui aura ce champ
     *  à aujourd'hui. */
    public String derniereModifDate;

    public FicheSummaryResponse(Long id, String clientLibelle, boolean clientPpe, Long clientId,
                                 String date, String caissierNom, List<String> typesJeu,
                                 BigDecimal totalRGM, BigDecimal totalEntrant, BigDecimal totalSortant,
                                 String derniereModif, String derniereModifDate) {
        this.id                = id;
        this.clientLibelle     = clientLibelle;
        this.clientPpe         = clientPpe;
        this.clientId          = clientId;
        this.date              = date;
        this.caissierNom       = caissierNom;
        this.typesJeu          = typesJeu;
        this.totalRGM          = totalRGM;
        this.totalEntrant      = totalEntrant;
        this.totalSortant      = totalSortant;
        this.derniereModif     = derniereModif;
        this.derniereModifDate = derniereModifDate;
    }
}
