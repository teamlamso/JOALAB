package com.amael.joalabft_backend.controller;

import com.amael.joalabft_backend.model.dto.request.ClientIdentificationRequest;
import com.amael.joalabft_backend.model.dto.request.ClientRequest;
import com.amael.joalabft_backend.model.dto.response.ClientDetailResponse;
import com.amael.joalabft_backend.model.dto.response.ClientSummaryResponse;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.service.ClientImportService;
import com.amael.joalabft_backend.model.service.ClientService;
import com.amael.joalabft_backend.test.JaxRsTestBase;
import com.amael.joalabft_backend.test.TestEntities;
import jakarta.json.JsonObject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.client.Entity;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.glassfish.hk2.utilities.binding.AbstractBinder;
import org.glassfish.jersey.server.ResourceConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Couvre {@link ClientResource} en exerçant la vraie pipeline JAX-RS
 * (transport in-memory). Valide que :
 *  - les {@code @PathParam} et {@code @QueryParam} sont bien décodés,
 *  - l'utilisateur courant est lu depuis {@code ctx.getProperty("utilisateur")}
 *    et propagé aux services métier,
 *  - les status HTTP attendus (200, 201 + Location, 204) sortent,
 *  - les exceptions métier remontent via le {@link GlobalExceptionMapper}.
 */
class ClientResourceTest extends JaxRsTestBase {

    private static final ClientService clientService = mock(ClientService.class);
    private static final ClientImportService importService = mock(ClientImportService.class);

    @BeforeEach
    void resetMocks() {
        reset(clientService, importService);
    }

    @Override
    protected void register(ResourceConfig config) {
        config.register(ClientResource.class);
    }

    @Override
    protected AbstractBinder bindings() {
        return new AbstractBinder() {
            @Override
            protected void configure() {
                bind(clientService).to(ClientService.class);
                bind(importService).to(ClientImportService.class);
            }
        };
    }

    // ---------------------------------------------------------------------
    // GET /clients — liste + QueryParam search
    // ---------------------------------------------------------------------

    @Test
    void getClients_sansSearch_renvoie200EtAppelleListClientsAvecNull() {
        when(clientService.listClients(null)).thenReturn(List.of());

        Response r = target("/clients").request().get();

        assertThat(r.getStatus()).isEqualTo(200);
        verify(clientService).listClients(null);
    }

    @Test
    void getClients_avecSearch_propageQueryParam() {
        when(clientService.listClients("Dupont")).thenReturn(List.of());

        Response r = target("/clients").queryParam("search", "Dupont").request().get();

        assertThat(r.getStatus()).isEqualTo(200);
        verify(clientService).listClients("Dupont");
    }

    @Test
    void getClients_decodeLesCaracteresUTF8_dansSearch() {
        // Garde-fou : un search « Besançon » mal encodé arriverait en
        // « Besan%C3%A7on » côté service et casserait le filtre.
        when(clientService.listClients("Besançon")).thenReturn(List.of());

        target("/clients").queryParam("search", "Besançon").request().get();

        verify(clientService).listClients("Besançon");
    }

    @Test
    void getClients_sérialise_lesDtoEnJson() {
        ClientSummaryResponse dto = new ClientSummaryResponse(
                42L, "Dupont Marie", "1990-06-15", "Paris", "France",
                false, "2026-06-10", List.of());
        when(clientService.listClients(null)).thenReturn(List.of(dto));

        Response r = target("/clients").request().get();

        assertThat(r.getStatus()).isEqualTo(200);
        String body = r.readEntity(String.class);
        // Sérialisation JSON-B : les champs publics sont exposés tels quels.
        assertThat(body).contains("\"id\":42").contains("\"libelle\":\"Dupont Marie\"");
    }

    // ---------------------------------------------------------------------
    // GET /clients/{id} — PathParam
    // ---------------------------------------------------------------------

    @Test
    void getClient_pathParamDecodeEnLong() {
        ClientDetailResponse dto = new ClientDetailResponse();
        dto.id = 42L; dto.libelle = "X";
        when(clientService.getClient(42L)).thenReturn(dto);

        Response r = target("/clients/42").request().get();

        assertThat(r.getStatus()).isEqualTo(200);
        verify(clientService).getClient(42L);
    }

    @Test
    void getClient_inexistant_remonteLeMessageDuMapper() {
        when(clientService.getClient(99L))
                .thenThrow(new NotFoundException("Client introuvable : 99"));

        Response r = target("/clients/99").request().get();

        assertThat(r.getStatus()).isEqualTo(404);
        assertThat(r.readEntity(JsonObject.class).getString("message"))
                .isEqualTo("Client introuvable : 99");
    }

    @Test
    void getClient_pathParamNonNumerique_donne404() {
        // Sans handler explicite, JAX-RS renvoie 404 pour un path qui ne
        // matche aucune route — décodage Long impossible.
        Response r = target("/clients/abc").request().get();

        assertThat(r.getStatus()).isEqualTo(404);
    }

    // ---------------------------------------------------------------------
    // POST /clients — 201 Created + Location + body { id }
    // ---------------------------------------------------------------------

    @Test
    void createClient_renvoie201EtLocationEtIdDansBody() {
        Utilisateur mcd = TestEntities.mcd(1);
        setCurrentUser(mcd);
        when(clientService.createClient(any(), eq(mcd))).thenReturn(42L);

        ClientRequest req = new ClientRequest();
        req.identifie = true; req.nom = "Dupont"; req.prenom = "Marie";

        Response r = target("/clients").request().post(Entity.json(req));

        assertThat(r.getStatus()).isEqualTo(201);
        assertThat(r.getLocation().toString()).endsWith("/api/clients/42");
        assertThat(r.readEntity(JsonObject.class).getJsonNumber("id").longValue())
                .isEqualTo(42L);
    }

    @Test
    void createClient_propageLUtilisateurCourantAuService() {
        Utilisateur responsable = TestEntities.responsable(7);
        setCurrentUser(responsable);
        when(clientService.createClient(any(), any())).thenReturn(1L);

        target("/clients").request().post(Entity.json(new ClientRequest()));

        ArgumentCaptor<Utilisateur> cap = ArgumentCaptor.forClass(Utilisateur.class);
        verify(clientService).createClient(any(), cap.capture());
        assertThat(cap.getValue()).isSameAs(responsable);
    }

    // ---------------------------------------------------------------------
    // POST /clients/match
    // ---------------------------------------------------------------------

    @Test
    void matchClient_renvoieLaListeDeCandidats() {
        ClientDetailResponse dto = new ClientDetailResponse();
        dto.id = 7L; dto.libelle = "Existant";
        when(clientService.findSimilar(any())).thenReturn(List.of(dto));

        Response r = target("/clients/match").request().post(Entity.json(new ClientRequest()));

        assertThat(r.getStatus()).isEqualTo(200);
        assertThat(r.readEntity(String.class)).contains("Existant");
    }

    // ---------------------------------------------------------------------
    // PUT /clients/{id}
    // ---------------------------------------------------------------------

    @Test
    void updateClient_renvoie204AvecBodyVide() {
        Utilisateur mcd = TestEntities.mcd(1);
        setCurrentUser(mcd);

        Response r = target("/clients/42").request().put(Entity.json(new ClientRequest()));

        assertThat(r.getStatus()).isEqualTo(204);
        assertThat(r.hasEntity()).isFalse();
        verify(clientService).updateClient(eq(42L), any(), eq(mcd));
    }

    @Test
    void updateClient_caissier_remonte403DuMapper() {
        Utilisateur caissier = TestEntities.caissier(2);
        setCurrentUser(caissier);
        org.mockito.Mockito.doThrow(new ForbiddenException("rôle insuffisant"))
                .when(clientService).updateClient(any(), any(), any());

        Response r = target("/clients/42").request().put(Entity.json(new ClientRequest()));

        assertThat(r.getStatus()).isEqualTo(403);
        assertThat(r.readEntity(JsonObject.class).getString("message"))
                .isEqualTo("rôle insuffisant");
    }

    // ---------------------------------------------------------------------
    // PATCH /clients/{id}/identification
    // ---------------------------------------------------------------------

    @Test
    void updateIdentification_caissier_renvoie204() {
        Utilisateur caissier = TestEntities.caissier(2);
        setCurrentUser(caissier);

        Response r = target("/clients/42/identification")
                .request()
                .method("PATCH", Entity.json(new ClientIdentificationRequest()));

        assertThat(r.getStatus()).isEqualTo(204);
        verify(clientService).updateClientIdentification(eq(42L), any(), eq(caissier));
    }

    @Test
    void updateIdentification_caissier_lieuDejaConforme_remonteMessageMetier() {
        // Régression du fix récent : avant le GlobalExceptionMapper, le
        // message « ne vous permet pas… » était perdu. Ce test verrouille
        // sa propagation à travers la pipeline JAX-RS complète.
        Utilisateur caissier = TestEntities.caissier(2);
        setCurrentUser(caissier);
        org.mockito.Mockito.doThrow(new BadRequestException(
                "Votre rôle ne vous permet pas de modifier ce lieu de naissance."))
                .when(clientService).updateClientIdentification(any(), any(), any());

        Response r = target("/clients/42/identification")
                .request()
                .method("PATCH", Entity.json(new ClientIdentificationRequest()));

        assertThat(r.getStatus()).isEqualTo(400);
        assertThat(r.readEntity(JsonObject.class).getString("message"))
                .contains("ne vous permet pas");
    }

    // ---------------------------------------------------------------------
    // DELETE /clients/{id}
    // ---------------------------------------------------------------------

    @Test
    void deleteClient_renvoie204() {
        Utilisateur mcd = TestEntities.mcd(1);
        setCurrentUser(mcd);

        Response r = target("/clients/42").request().delete();

        assertThat(r.getStatus()).isEqualTo(204);
        verify(clientService).deleteClient(42L, mcd);
    }

    @Test
    void deleteClient_avecFiches_remonteBadRequestMessage() {
        Utilisateur mcd = TestEntities.mcd(1);
        setCurrentUser(mcd);
        org.mockito.Mockito.doThrow(new BadRequestException(
                "Ce client a 3 fiche(s) associée(s)"))
                .when(clientService).deleteClient(any(), any());

        Response r = target("/clients/42").request().delete();

        assertThat(r.getStatus()).isEqualTo(400);
        assertThat(r.readEntity(JsonObject.class).getString("message"))
                .contains("fiche(s)");
    }

    // ---------------------------------------------------------------------
    // Content-Type
    // ---------------------------------------------------------------------

    @Test
    void content_type_des_réponses_estJson() {
        when(clientService.listClients(null)).thenReturn(List.of());

        Response r = target("/clients").request().get();

        assertThat(r.getMediaType().toString()).contains(MediaType.APPLICATION_JSON);
    }
}
