package com.amael.joalabft_backend.controller;

import com.amael.joalabft_backend.model.dto.request.UtilisateurRequest;
import com.amael.joalabft_backend.model.dto.request.UtilisateurUpdateRequest;
import com.amael.joalabft_backend.model.dto.response.UtilisateurResponse;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.service.UtilisateurService;
import com.amael.joalabft_backend.test.JaxRsTestBase;
import com.amael.joalabft_backend.test.TestEntities;
import jakarta.json.JsonObject;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.client.Entity;
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

class UtilisateurResourceTest extends JaxRsTestBase {

    private static final UtilisateurService service = mock(UtilisateurService.class);

    @BeforeEach
    void resetMocks() { reset(service); }

    @Override
    protected void register(ResourceConfig config) {
        config.register(UtilisateurResource.class);
    }

    @Override
    protected AbstractBinder bindings() {
        return new AbstractBinder() {
            @Override protected void configure() {
                bind(service).to(UtilisateurService.class);
            }
        };
    }

    private static UtilisateurResponse response(long id) {
        UtilisateurResponse u = new UtilisateurResponse();
        u.id = id; u.identifiant = "u" + id;
        u.nom = "X"; u.prenom = "Y"; u.role = "CAISSIER";
        return u;
    }

    // ---------------------------------------------------------------------
    // GET /utilisateurs — QueryParam booléen, DefaultValue=false
    // ---------------------------------------------------------------------

    @Test
    void list_sansQueryParam_appelleAvecFalseParDefaut() {
        Utilisateur mcd = TestEntities.mcd(1);
        setCurrentUser(mcd);
        when(service.listUtilisateurs(eq(mcd), eq(false))).thenReturn(List.of());

        target("/utilisateurs").request().get();

        verify(service).listUtilisateurs(mcd, false);
    }

    @Test
    void list_avecIncludeArchivesTrue_estTransmis() {
        Utilisateur mcd = TestEntities.mcd(1);
        setCurrentUser(mcd);
        when(service.listUtilisateurs(any(), eq(true))).thenReturn(List.of());

        target("/utilisateurs").queryParam("includeArchives", "true").request().get();

        verify(service).listUtilisateurs(mcd, true);
    }

    // ---------------------------------------------------------------------
    // POST /utilisateurs — 201 + body
    // ---------------------------------------------------------------------

    @Test
    void create_renvoie201EtBody() {
        Utilisateur mcd = TestEntities.mcd(1);
        setCurrentUser(mcd);
        when(service.createUtilisateur(any(), eq(mcd))).thenReturn(response(42));

        Response r = target("/utilisateurs").request()
                .post(Entity.json(new UtilisateurRequest()));

        assertThat(r.getStatus()).isEqualTo(201);
        assertThat(r.getLocation().toString()).endsWith("/api/utilisateurs/42");
        assertThat(r.readEntity(String.class)).contains("\"id\":42");
    }

    @Test
    void create_responsable_creantUnMcd_remonte403() {
        Utilisateur responsable = TestEntities.responsable(7);
        setCurrentUser(responsable);
        org.mockito.Mockito.doThrow(new ForbiddenException("rôle non autorisé"))
                .when(service).createUtilisateur(any(), any());

        Response r = target("/utilisateurs").request()
                .post(Entity.json(new UtilisateurRequest()));

        assertThat(r.getStatus()).isEqualTo(403);
        assertThat(r.readEntity(JsonObject.class).getString("message"))
                .isEqualTo("rôle non autorisé");
    }

    // ---------------------------------------------------------------------
    // PATCH /utilisateurs/{id}
    // ---------------------------------------------------------------------

    @Test
    void update_pathParamEtBodyTransmis() {
        Utilisateur mcd = TestEntities.mcd(1);
        setCurrentUser(mcd);
        when(service.updateUtilisateur(eq(7L), any(), eq(mcd))).thenReturn(response(7));

        Response r = target("/utilisateurs/7").request()
                .method("PATCH", Entity.json(new UtilisateurUpdateRequest()));

        assertThat(r.getStatus()).isEqualTo(200);
        verify(service).updateUtilisateur(eq(7L), any(), eq(mcd));
    }

    // ---------------------------------------------------------------------
    // POST /utilisateurs/{id}/archiver et /desarchiver
    // ---------------------------------------------------------------------

    @Test
    void archiver_appelleLeService() {
        Utilisateur mcd = TestEntities.mcd(1);
        setCurrentUser(mcd);
        when(service.archiverUtilisateur(eq(7L), eq(mcd))).thenReturn(response(7));

        Response r = target("/utilisateurs/7/archiver").request().post(Entity.json(""));

        assertThat(r.getStatus()).isEqualTo(200);
        verify(service).archiverUtilisateur(7L, mcd);
    }

    @Test
    void desarchiver_appelleLeService() {
        Utilisateur mcd = TestEntities.mcd(1);
        setCurrentUser(mcd);
        when(service.desarchiverUtilisateur(eq(7L), eq(mcd))).thenReturn(response(7));

        Response r = target("/utilisateurs/7/desarchiver").request().post(Entity.json(""));

        assertThat(r.getStatus()).isEqualTo(200);
        verify(service).desarchiverUtilisateur(7L, mcd);
    }

    @Test
    void desarchiver_pathParamNonNumerique_donne404() {
        Response r = target("/utilisateurs/abc/desarchiver").request().post(Entity.json(""));

        assertThat(r.getStatus()).isEqualTo(404);
    }
}
