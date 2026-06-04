package com.amael.joalabft_backend.controller;

import com.amael.joalabft_backend.model.dto.response.SuggestionAdresseResponse;
import com.amael.joalabft_backend.model.service.AdresseService;
import jakarta.inject.Inject;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;

/**
 * Proxy d'autocomplétion d'adresses.
 *
 * <p>Le frontend interroge ce endpoint plutôt que directement
 * {@code api-adresse.data.gouv.fr} / Nominatim : ainsi, seules les
 * requêtes sortantes du serveur passent les pare-feux d'entreprise — le
 * navigateur des postes utilisateurs n'a pas besoin d'accès direct à ces
 * APIs externes. Le mécanisme actuel coté frontend appelait directement
 * ces APIs, ce qui échouait silencieusement dans les réseaux où elles ne
 * sont pas atteignables depuis le poste client.
 */
@Path("/adresses")
@Produces(MediaType.APPLICATION_JSON)
public class AdresseResource {

    @Inject
    private AdresseService adresseService;

    /**
     * Recherche d'adresses : BAN d'abord (France), fallback Nominatim (monde).
     *
     * @param q     chaîne libre (au moins 3 caractères côté UI, mais non vérifié ici)
     * @param limit nombre max de suggestions (1–10, défaut 6)
     */
    @GET
    @Path("/search")
    public Response search(@QueryParam("q") String q,
                           @QueryParam("limit") @DefaultValue("6") int limit) {
        List<SuggestionAdresseResponse> suggestions = adresseService.chercherSuggestions(q, limit);
        return Response.ok(suggestions).build();
    }
}
