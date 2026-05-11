package com.amael.joalabft_backend.controller;

import com.amael.joalabft_backend.model.dto.request.UtilisateurRequest;
import com.amael.joalabft_backend.model.dto.response.UtilisateurResponse;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.service.UtilisateurService;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.net.URI;

/**
 * Ressource JAX-RS pour la gestion des utilisateurs applicatifs.
 *
 * <ul>
 *   <li>{@code GET  /api/utilisateurs} — liste (RESPONSABLE_CAISSE + MCD)</li>
 *   <li>{@code POST /api/utilisateurs} — création
 *       (MCD : tous rôles ; RESPONSABLE_CAISSE : uniquement CAISSIER)</li>
 * </ul>
 */
@Path("/utilisateurs")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class UtilisateurResource {

    @Inject
    private UtilisateurService utilisateurService;

    /** Retourne la liste des utilisateurs applicatifs. */
    @GET
    public Response listUtilisateurs(@Context ContainerRequestContext ctx) {
        Utilisateur demandeur = (Utilisateur) ctx.getProperty("utilisateur");
        return Response.ok(utilisateurService.listUtilisateurs(demandeur)).build();
    }

    /** Crée un nouvel utilisateur applicatif. */
    @POST
    public Response createUtilisateur(UtilisateurRequest req,
                                      @Context ContainerRequestContext ctx) {
        Utilisateur createur = (Utilisateur) ctx.getProperty("utilisateur");
        UtilisateurResponse cree = utilisateurService.createUtilisateur(req, createur);
        return Response.created(URI.create("/api/utilisateurs/" + cree.id))
                .entity(cree)
                .build();
    }
}
