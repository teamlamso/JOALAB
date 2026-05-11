package com.amael.joalabft_backend.controller;

import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.service.JournalService;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/**
 * Ressource JAX-RS pour la consultation du journal d'audit.
 *
 * <ul>
 *   <li>{@code GET /api/journal} — journal global, MCD uniquement (les
 *       500 dernières entrées au plus).</li>
 * </ul>
 */
@Path("/journal")
@Produces(MediaType.APPLICATION_JSON)
public class JournalResource {

    @Inject
    private JournalService journalService;

    /** Retourne le journal global. */
    @GET
    public Response listGlobal(@Context ContainerRequestContext ctx) {
        Utilisateur demandeur = (Utilisateur) ctx.getProperty("utilisateur");
        return Response.ok(journalService.listGlobal(demandeur)).build();
    }
}
