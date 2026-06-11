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

class LieuResourceTest extends JaxRsTestBase {

    private static final AdresseService service = mock(AdresseService.class);

    @BeforeEach
    void resetMocks() { reset(service); }

    @Override
    protected void register(ResourceConfig config) {
        config.register(LieuResource.class);
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
    void search_appelleChercherLieuxAvecLaQuery() {
        when(service.chercherLieux("besancon", 6)).thenReturn(List.of());

        Response r = target("/lieux/search").queryParam("q", "besancon").request().get();

        assertThat(r.getStatus()).isEqualTo(200);
        verify(service).chercherLieux("besancon", 6);
    }

    @Test
    void search_limitPersonnalise_estTransmis() {
        when(service.chercherLieux("paris", 10)).thenReturn(List.of());

        target("/lieux/search").queryParam("q", "paris")
                .queryParam("limit", "10").request().get();

        verify(service).chercherLieux("paris", 10);
    }
}
