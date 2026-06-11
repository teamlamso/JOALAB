package com.amael.joalabft_backend.controller;

import com.amael.joalabft_backend.model.dto.request.LoginRequest;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.enums.RoleUtilisateur;
import com.amael.joalabft_backend.model.service.AuthService;
import com.amael.joalabft_backend.test.JaxRsTestBase;
import com.amael.joalabft_backend.test.TestEntities;
import jakarta.ws.rs.client.Entity;
import jakarta.ws.rs.core.Response;
import org.glassfish.hk2.utilities.binding.AbstractBinder;
import org.glassfish.jersey.server.ResourceConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthResourceTest extends JaxRsTestBase {

    private static final AuthService authService = mock(AuthService.class);

    @BeforeEach
    void resetMocks() { reset(authService); }

    @Override
    protected void register(ResourceConfig config) {
        config.register(AuthResource.class);
    }

    @Override
    protected AbstractBinder bindings() {
        return new AbstractBinder() {
            @Override protected void configure() {
                bind(authService).to(AuthService.class);
            }
        };
    }

    // ---------------------------------------------------------------------
    // POST /auth/login
    // ---------------------------------------------------------------------

    @Test
    void login_OK_renvoie200EtLoginResponseComplet() {
        Utilisateur u = TestEntities.utilisateur(7L, "mcd1", RoleUtilisateur.MCD);
        when(authService.login("mcd1", "secret")).thenReturn("tk-123");
        when(authService.getUtilisateur("tk-123")).thenReturn(u);

        LoginRequest req = new LoginRequest();
        req.identifiant = "mcd1"; req.motDePasse = "secret";

        Response r = target("/auth/login").request().post(Entity.json(req));

        assertThat(r.getStatus()).isEqualTo(200);
        String body = r.readEntity(String.class);
        assertThat(body).contains("\"token\":\"tk-123\"")
                .contains("\"identifiant\":\"mcd1\"")
                .contains("\"role\":\"MCD\"");
    }

    @Test
    void login_identifiantsIncorrects_renvoie401EtMessage() {
        when(authService.login(any(), any())).thenReturn(null);

        LoginRequest req = new LoginRequest();
        req.identifiant = "x"; req.motDePasse = "y";

        Response r = target("/auth/login").request().post(Entity.json(req));

        assertThat(r.getStatus()).isEqualTo(401);
        // Le payload contient le champ « error » (format historique avant le
        // mapper unifié) — le frontend lit body.message OU body.error.
        assertThat(r.readEntity(String.class)).contains("incorrect");
    }

    @Test
    void login_bodyVide_renvoie400() {
        Response r = target("/auth/login").request()
                .post(Entity.json(new LoginRequest()));

        assertThat(r.getStatus()).isEqualTo(400);
    }

    @Test
    void login_sansMotDePasse_renvoie400() {
        LoginRequest req = new LoginRequest();
        req.identifiant = "mcd1";

        Response r = target("/auth/login").request().post(Entity.json(req));

        assertThat(r.getStatus()).isEqualTo(400);
        assertThat(r.readEntity(String.class)).contains("requis");
    }

    // ---------------------------------------------------------------------
    // POST /auth/logout
    // ---------------------------------------------------------------------

    @Test
    void logout_renvoie204AvecBodyVide() {
        // En prod, l'AuthFilter pose la propriété "token" — ici on simule
        // l'absence : authService.logout(null) doit être appelé sans crasher.
        Response r = target("/auth/logout").request().post(Entity.json(""));

        assertThat(r.getStatus()).isEqualTo(204);
        verify(authService).logout(null);
    }
}
