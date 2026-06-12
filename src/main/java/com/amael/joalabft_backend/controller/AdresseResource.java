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

@Path("/adresses")
@Produces(MediaType.APPLICATION_JSON)
public class AdresseResource {

    @Inject
    private AdresseService adresseService;

    @GET
    @Path("/search")
    public Response search(@QueryParam("q") String q,
                           @QueryParam("limit") @DefaultValue("6") int limit) {
        List<SuggestionAdresseResponse> suggestions = adresseService.chercherSuggestions(q, limit);
        return Response.ok(suggestions).build();
    }
}
