package com.amael.joalabft_backend.model.dto.response;

/**
 * Suggestion d'autocomplétion d'adresse renvoyée par le proxy backend
 * {@code GET /api/adresses/search}.
 *
 * <p>POJO classique (champs publics) plutôt qu'un {@code record} : la
 * sérialisation JSON-B des records dépend de la version de Yasson et de la
 * configuration du serveur ; un POJO garantit la portabilité.
 */
public class SuggestionAdresseResponse {
    public String label;
    public String rue;
    public String codePostal;
    public String ville;
    public String pays;

    public SuggestionAdresseResponse() {}

    public SuggestionAdresseResponse(String label, String rue, String codePostal, String ville, String pays) {
        this.label = label;
        this.rue = rue;
        this.codePostal = codePostal;
        this.ville = ville;
        this.pays = pays;
    }
}
