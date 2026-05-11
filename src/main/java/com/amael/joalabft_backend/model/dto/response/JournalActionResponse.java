package com.amael.joalabft_backend.model.dto.response;

/** Représentation publique d'une entrée du journal d'audit. */
public class JournalActionResponse {
    public Long id;
    /** Horodatage formaté {@code dd/MM/yyyy HH:mm:ss}. */
    public String horodatage;
    public String utilisateurNom;
    public String utilisateurIdentifiant;
    public String utilisateurRole;
    /** Nom de la valeur {@link com.amael.joalabft_backend.model.enums.TypeActionJournal}. */
    public String action;
    /** Nom de la valeur {@link com.amael.joalabft_backend.model.enums.TypeEntiteJournal}. */
    public String typeEntite;
    public Long entiteId;
    public String libelleEntite;
    public String description;

    public JournalActionResponse() {}
}
