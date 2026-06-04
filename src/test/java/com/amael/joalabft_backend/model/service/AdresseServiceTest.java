package com.amael.joalabft_backend.model.service;

import com.amael.joalabft_backend.model.dto.response.SuggestionAdresseResponse;
import com.amael.joalabft_backend.model.dto.response.SuggestionLieuResponse;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AdresseServiceTest {

    private final AdresseService service = new AdresseService();

    @Test
    void chercherSuggestions_chaineVide_retourneListeVide() {
        assertThat(service.chercherSuggestions("", 5)).isEmpty();
    }

    @Test
    void chercherSuggestions_null_retourneListeVide() {
        assertThat(service.chercherSuggestions(null, 5)).isEmpty();
    }

    @Test
    void chercherSuggestions_blanc_retourneListeVide() {
        assertThat(service.chercherSuggestions("   ", 5)).isEmpty();
    }

    @Test
    void chercherLieux_chaineVide_retourneListeVide() {
        assertThat(service.chercherLieux("", 5)).isEmpty();
        assertThat(service.chercherLieux(null, 5)).isEmpty();
        assertThat(service.chercherLieux("   ", 5)).isEmpty();
    }

    @Test
    void suggestionAdresse_pojoExposeChamps() {
        SuggestionAdresseResponse s = new SuggestionAdresseResponse(
                "10 rue de la Paix 75002 Paris",
                "10 rue de la Paix",
                "75002",
                "Paris",
                "France"
        );
        assertThat(s.label).contains("Paix");
        assertThat(s.ville).isEqualTo("Paris");
        assertThat(s.pays).isEqualTo("France");
    }

    @Test
    void suggestionLieu_pojoExposeLabel() {
        SuggestionLieuResponse s = new SuggestionLieuResponse("Besançon (25)");
        assertThat(s.label).isEqualTo("Besançon (25)");
    }

    @Test
    void resoudre_chaineVide_retourneNull() {
        // L'API existante (anciennement utilisée par l'import Excel) doit
        // toujours tolérer les entrées vides.
        assertThat(service.resoudre(null)).isNull();
        assertThat(service.resoudre("")).isNull();
        assertThat(service.resoudre("   ")).isNull();
    }
}
