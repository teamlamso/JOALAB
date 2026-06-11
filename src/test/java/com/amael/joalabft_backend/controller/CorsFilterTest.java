package com.amael.joalabft_backend.controller;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.core.MultivaluedHashMap;
import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Vérifie le contrat CORS exposé au frontend Vite : (1) les preflight OPTIONS
 * sont court-circuités côté serveur avec un 200 et les bons en-têtes ; (2)
 * toute réponse à une vraie requête est augmentée des en-têtes CORS.
 * Sans ces deux comportements, le frontend en local échouerait sur tous les
 * appels avec une erreur navigateur silencieuse (« CORS policy »).
 */
class CorsFilterTest {

    private final CorsFilter filter = new CorsFilter();

    // ---------------------------------------------------------------------
    // Request filter : preflight OPTIONS
    // ---------------------------------------------------------------------

    @Test
    void optionsPreflight_estCourtCircuiteAvec200EtEntetesCors() throws Exception {
        ContainerRequestContext req = mock(ContainerRequestContext.class);
        when(req.getMethod()).thenReturn("OPTIONS");

        filter.filter(req);

        ArgumentCaptor<Response> cap = ArgumentCaptor.forClass(Response.class);
        verify(req).abortWith(cap.capture());
        Response r = cap.getValue();
        assertThat(r.getStatus()).isEqualTo(200);
        assertThat(r.getHeaderString("Access-Control-Allow-Origin")).isEqualTo("*");
        assertThat(r.getHeaderString("Access-Control-Allow-Headers"))
                .contains("Authorization")
                .contains("Content-Type");
        assertThat(r.getHeaderString("Access-Control-Allow-Methods"))
                .contains("GET").contains("POST").contains("PUT")
                .contains("DELETE").contains("OPTIONS").contains("HEAD");
        assertThat(r.getHeaderString("Access-Control-Max-Age")).isEqualTo("3600");
    }

    @Test
    void optionsCaseInsensitive_estAussiCourtCircuite() throws Exception {
        // Robustesse : certains proxies envoient « options » en minuscules.
        ContainerRequestContext req = mock(ContainerRequestContext.class);
        when(req.getMethod()).thenReturn("options");

        filter.filter(req);

        verify(req).abortWith(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void requeteNonOptions_neSeFaitPasInterrompre() throws Exception {
        for (String methode : new String[] { "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD" }) {
            ContainerRequestContext req = mock(ContainerRequestContext.class);
            when(req.getMethod()).thenReturn(methode);

            filter.filter(req);

            verify(req, never()).abortWith(org.mockito.ArgumentMatchers.any());
        }
    }

    // ---------------------------------------------------------------------
    // Response filter : en-têtes ajoutés sur toute réponse
    // ---------------------------------------------------------------------

    @Test
    void responseFilter_ajouteLesEntetesCorsSurToutesLesReponses() throws Exception {
        // Cas où le filtre rajoute les headers sur la réponse réelle (pas
        // seulement le preflight) — c'est ce qui permet au navigateur
        // d'accepter le body côté frontend après une vraie requête.
        ContainerRequestContext req = mock(ContainerRequestContext.class);
        ContainerResponseContext resp = mock(ContainerResponseContext.class);
        MultivaluedMap<String, Object> headers = new MultivaluedHashMap<>();
        when(resp.getHeaders()).thenReturn(headers);

        filter.filter(req, resp);

        assertThat(headers.getFirst("Access-Control-Allow-Origin")).isEqualTo("*");
        assertThat(headers.getFirst("Access-Control-Allow-Headers").toString())
                .contains("Authorization");
        assertThat(headers.getFirst("Access-Control-Allow-Methods").toString())
                .contains("GET").contains("DELETE");
    }

    @Test
    void responseFilter_neLitPasLaMethodeOuLeStatus() throws Exception {
        // Les en-têtes CORS sont posés sur 100% des réponses, y compris les
        // erreurs (401, 500…). Ce test verrouille ce comportement : sinon le
        // toast d'erreur côté frontend pourrait disparaître silencieusement
        // sur certains status.
        ContainerRequestContext req = mock(ContainerRequestContext.class);
        ContainerResponseContext resp = mock(ContainerResponseContext.class);
        MultivaluedMap<String, Object> headers = new MultivaluedHashMap<>();
        when(resp.getHeaders()).thenReturn(headers);

        filter.filter(req, resp);

        // Aucune interrogation du status / de la méthode de la réponse.
        verify(resp, never()).getStatus();
    }
}
