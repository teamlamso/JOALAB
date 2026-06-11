package com.amael.joalabft_backend.controller;

import com.amael.joalabft_backend.model.service.AdresseService;
import com.amael.joalabft_backend.test.JaxRsTestBase;
import jakarta.ws.rs.core.Response;
import org.glassfish.hk2.utilities.binding.AbstractBinder;
import org.glassfish.jersey.server.ResourceConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AdresseResourceTest extends JaxRsTestBase {

    private static final AdresseService service = mock(AdresseService.class);

    @BeforeEach
    void resetMocks() { reset(service); }

    @Override
    protected void register(ResourceConfig config) {
        config.register(AdresseResource.class);
    }

    @Override
    protected AbstractBinder bindings() {
        return new AbstractBinder() {
            @Override protected void configure() {
                bind(service).to(AdresseService.class);
            }
        };
    }

    @Test
    void search_avecQueryParametres_transmetQEtLimit() {
        when(service.chercherSuggestions("paris", 6)).thenReturn(List.of());

        Response r = target("/adresses/search")
                .queryParam("q", "paris")
                .queryParam("limit", "6")
                .request().get();

        assertThat(r.getStatus()).isEqualTo(200);
        verify(service).chercherSuggestions("paris", 6);
    }

    @Test
    void search_sansLimit_utiliseDefaut6() {
        // @DefaultValue("6") doit être pris en compte par JAX-RS.
        when(service.chercherSuggestions("paris", 6)).thenReturn(List.of());

        target("/adresses/search").queryParam("q", "paris").request().get();

        verify(service).chercherSuggestions("paris", 6);
    }

    @Test
    void search_limitNonNumerique_donne404DuMatcher() {
        // JAX-RS ne sait pas convertir « abc » en int → la requête ne matche
        // aucune route et retombe sur un 404. (Plutôt que de remonter un 500
        // depuis le mapper sur une NumberFormatException.)
        Response r = target("/adresses/search")
                .queryParam("q", "paris")
                .queryParam("limit", "abc")
                .request().get();

        assertThat(r.getStatus()).isEqualTo(404);
    }
}
