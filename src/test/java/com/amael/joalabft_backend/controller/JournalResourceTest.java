package com.amael.joalabft_backend.controller;

import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.service.JournalService;
import com.amael.joalabft_backend.test.JaxRsTestBase;
import com.amael.joalabft_backend.test.TestEntities;
import jakarta.json.JsonObject;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.core.Response;
import org.glassfish.hk2.utilities.binding.AbstractBinder;
import org.glassfish.jersey.server.ResourceConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class JournalResourceTest extends JaxRsTestBase {

    private static final JournalService service = mock(JournalService.class);

    @BeforeEach
    void resetMocks() { reset(service); }

    @Override
    protected void register(ResourceConfig config) {
        config.register(JournalResource.class);
    }

    @Override
    protected AbstractBinder bindings() {
        return new AbstractBinder() {
            @Override protected void configure() {
                bind(service).to(JournalService.class);
            }
        };
    }

    @Test
    void list_MCD_renvoie200EtTransmetUtilisateur() {
        Utilisateur mcd = TestEntities.mcd(1);
        setCurrentUser(mcd);
        when(service.listGlobal(eq(mcd))).thenReturn(List.of());

        Response r = target("/journal").request().get();

        assertThat(r.getStatus()).isEqualTo(200);
        verify(service).listGlobal(mcd);
    }

    @Test
    void list_caissier_remonte403DuMapper() {
        // Le service rejette : on vérifie que le mapper convertit la
        // ForbiddenException en réponse JSON {"message": "..."} attendue
        // par le frontend.
        Utilisateur caissier = TestEntities.caissier(2);
        setCurrentUser(caissier);
        when(service.listGlobal(any()))
                .thenThrow(new ForbiddenException("Journal réservé MCD"));

        Response r = target("/journal").request().get();

        assertThat(r.getStatus()).isEqualTo(403);
        assertThat(r.readEntity(JsonObject.class).getString("message"))
                .isEqualTo("Journal réservé MCD");
    }
}
