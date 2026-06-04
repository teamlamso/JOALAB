package com.amael.joalabft_backend.model.dto.response;

/**
 * Suggestion d'autocomplétion de lieu (ville) renvoyée par le proxy backend
 * {@code GET /api/lieux/search} — utilisée pour le champ « lieu de naissance ».
 *
 * <p>Le {@code label} suit la convention {@code "Ville (XX)"} où {@code XX}
 * est le numéro de département pour la France ou le nom du pays pour
 * l'international, par exemple « Besançon (25) » ou « Tokyo (Japon) ».
 */
public class SuggestionLieuResponse {
    public String label;

    public SuggestionLieuResponse() {}

    public SuggestionLieuResponse(String label) {
        this.label = label;
    }
}
