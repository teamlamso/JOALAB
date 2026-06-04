package com.amael.joalabft_backend.controller;

import com.amael.joalabft_backend.model.dto.response.SuggestionLieuResponse;
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
 * Proxy d'autocomplétion de lieux (villes uniquement).
 *
 * <p>Utilisé pour le champ « lieu de naissance ». Le frontend interrogait
 * directement Nominatim depuis le navigateur, ce qui échouait en réseau
 * d'entreprise avec interception SSL ({@code ERR_CERT_AUTHORITY_INVALID}).
 * En passant par ce proxy, c'est le serveur Payara qui sort vers
 * Nominatim — chemin réseau plus stable et plus contrôlable.
 */
@Path("/lieux")
@Produces(MediaType.APPLICATION_JSON)
public class LieuResource {

    @Inject
    private AdresseService adresseService;

    @GET
    @Path("/search")
    public Response search(@QueryParam("q") String q,
                           @QueryParam("limit") @DefaultValue("6") int limit) {
        List<SuggestionLieuResponse> suggestions = adresseService.chercherLieux(q, limit);
        return Response.ok(suggestions).build();
    }
}
