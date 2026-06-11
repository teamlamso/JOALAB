package com.amael.joalabft_backend.controller;

import com.amael.joalabft_backend.model.dto.request.FicheRequest;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.service.FicheService;
import com.amael.joalabft_backend.model.service.JournalService;
import com.amael.joalabft_backend.test.JaxRsTestBase;
import com.amael.joalabft_backend.test.TestEntities;
import jakarta.json.JsonObject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.client.Entity;
import jakarta.ws.rs.core.Response;
import org.glassfish.hk2.utilities.binding.AbstractBinder;
import org.glassfish.jersey.server.ResourceConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FicheResourceTest extends JaxRsTestBase {

    private static final FicheService ficheService = mock(FicheService.class);
    private static final JournalService journalService = mock(JournalService.class);

    @BeforeEach
    void resetMocks() { reset(ficheService, journalService); }

    @Override
    protected void register(ResourceConfig config) {
        config.register(FicheResource.class);
    }

    @Override
    protected AbstractBinder bindings() {
        return new AbstractBinder() {
            @Override protected void configure() {
                bind(ficheService).to(FicheService.class);
                bind(journalService).to(JournalService.class);
            }
        };
    }

    // ---------------------------------------------------------------------
    // GET /fiches — dates parsées en LocalDate (ISO)
    // ---------------------------------------------------------------------

    @Test
    void list_sansParametres_appelleAvecNullPartout() {
        when(ficheService.listFiches(isNull(), isNull(), isNull())).thenReturn(List.of());

        target("/fiches").request().get();

        verify(ficheService).listFiches(null, null, null);
    }

    @Test
    void list_avecDatesISO_estParseEnLocalDate() {
        when(ficheService.listFiches(any(), any(), any())).thenReturn(List.of());

        target("/fiches")
                .queryParam("dateDebut", "2026-06-10")
                .queryParam("dateFin",   "2026-06-11")
                .queryParam("search",    "Dupont")
                .request().get();

        verify(ficheService).listFiches(
                LocalDate.of(2026, 6, 10), LocalDate.of(2026, 6, 11), "Dupont");
    }

    @Test
    void list_dateMalformee_remonteUneErreurServeur500_viaMapper() {
        // LocalDate.parse() lève une DateTimeParseException qui n'est pas une
        // WebApplicationException → le mapper renvoie un 500 avec un message.
        // Garde-fou : si on l'oubliait, on aurait juste une trace serveur
        // et le frontend afficherait « Erreur 500 » sans contexte.
        Response r = target("/fiches").queryParam("dateDebut", "pas-une-date")
                .request().get();

        assertThat(r.getStatus()).isEqualTo(500);
    }

    // ---------------------------------------------------------------------
    // GET /fiches/{id}
    // ---------------------------------------------------------------------

    @Test
    void getFiche_pathParamLong() {
        when(ficheService.getFiche(42L)).thenReturn(null);

        target("/fiches/42").request().get();

        verify(ficheService).getFiche(42L);
    }

    // ---------------------------------------------------------------------
    // GET /fiches/{id}/historique
    // ---------------------------------------------------------------------

    @Test
    void historique_transmetUtilisateurEtFicheId() {
        Utilisateur mcd = TestEntities.mcd(1);
        setCurrentUser(mcd);
        when(journalService.listHistoriqueFiche(eq(42L), eq(mcd))).thenReturn(List.of());

        target("/fiches/42/historique").request().get();

        verify(journalService).listHistoriqueFiche(42L, mcd);
    }

    // ---------------------------------------------------------------------
    // POST /fiches
    // ---------------------------------------------------------------------

    @Test
    void createFiche_renvoie201AvecLocation() {
        Utilisateur caissier = TestEntities.caissier(2);
        setCurrentUser(caissier);
        when(ficheService.createFiche(any(), eq(caissier))).thenReturn(99L);

        Response r = target("/fiches").request().post(Entity.json(new FicheRequest()));

        assertThat(r.getStatus()).isEqualTo(201);
        assertThat(r.getLocation().toString()).endsWith("/api/fiches/99");
    }

    @Test
    void createFiche_clientInexistant_remonte400DuMapper() {
        Utilisateur caissier = TestEntities.caissier(2);
        setCurrentUser(caissier);
        org.mockito.Mockito.doThrow(new BadRequestException("Client introuvable"))
                .when(ficheService).createFiche(any(), any());

        Response r = target("/fiches").request().post(Entity.json(new FicheRequest()));

        assertThat(r.getStatus()).isEqualTo(400);
        assertThat(r.readEntity(JsonObject.class).getString("message"))
                .isEqualTo("Client introuvable");
    }

    // ---------------------------------------------------------------------
    // PUT /fiches/{id}
    // ---------------------------------------------------------------------

    @Test
    void updateFiche_renvoie204() {
        Utilisateur caissier = TestEntities.caissier(2);
        setCurrentUser(caissier);

        Response r = target("/fiches/42").request().put(Entity.json(new FicheRequest()));

        assertThat(r.getStatus()).isEqualTo(204);
        verify(ficheService).updateFiche(eq(42L), any(), eq(caissier));
    }

    // ---------------------------------------------------------------------
    // DELETE /fiches/{id}
    // ---------------------------------------------------------------------

    @Test
    void deleteFiche_renvoie204() {
        Utilisateur mcd = TestEntities.mcd(1);
        setCurrentUser(mcd);

        Response r = target("/fiches/42").request().delete();

        assertThat(r.getStatus()).isEqualTo(204);
        verify(ficheService).deleteFiche(42L, mcd);
    }
}
