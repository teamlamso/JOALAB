package com.amael.joalabft_backend.controller;

import com.amael.joalabft_backend.model.dto.request.UtilisateurRequest;
import com.amael.joalabft_backend.model.dto.request.UtilisateurUpdateRequest;
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
 *   <li>{@code GET    /api/utilisateurs} — liste (RESPONSABLE_CAISSE + MCD).
 *       Query {@code ?includeArchives=true} affiche aussi les comptes archivés (MCD).</li>
 *   <li>{@code POST   /api/utilisateurs} — création
 *       (MCD : tous rôles ; RESPONSABLE_CAISSE : uniquement CAISSIER)</li>
 *   <li>{@code PATCH  /api/utilisateurs/&#123;id&#125;} — modification (MCD uniquement)</li>
 *   <li>{@code POST   /api/utilisateurs/&#123;id&#125;/archiver} — archivage (MCD uniquement)</li>
 *   <li>{@code POST   /api/utilisateurs/&#123;id&#125;/desarchiver} — réactivation (MCD uniquement)</li>
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
    public Response listUtilisateurs(@QueryParam("includeArchives") @DefaultValue("false") boolean includeArchives,
                                     @Context ContainerRequestContext ctx) {
        Utilisateur demandeur = (Utilisateur) ctx.getProperty("utilisateur");
        return Response.ok(utilisateurService.listUtilisateurs(demandeur, includeArchives)).build();
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

    /** Modifie un utilisateur existant. Réservé aux MCD. */
    @PATCH
    @Path("/{id}")
    public Response updateUtilisateur(@PathParam("id") Long id,
                                      UtilisateurUpdateRequest req,
                                      @Context ContainerRequestContext ctx) {
        Utilisateur modificateur = (Utilisateur) ctx.getProperty("utilisateur");
        return Response.ok(utilisateurService.updateUtilisateur(id, req, modificateur)).build();
    }

    /** Archive un utilisateur. Le compte reste en base pour préserver les références historiques. */
    @POST
    @Path("/{id}/archiver")
    public Response archiverUtilisateur(@PathParam("id") Long id,
                                        @Context ContainerRequestContext ctx) {
        Utilisateur demandeur = (Utilisateur) ctx.getProperty("utilisateur");
        return Response.ok(utilisateurService.archiverUtilisateur(id, demandeur)).build();
    }

    /** Réactive un compte archivé : autorise à nouveau la connexion. */
    @POST
    @Path("/{id}/desarchiver")
    public Response desarchiverUtilisateur(@PathParam("id") Long id,
                                           @Context ContainerRequestContext ctx) {
        Utilisateur demandeur = (Utilisateur) ctx.getProperty("utilisateur");
        return Response.ok(utilisateurService.desarchiverUtilisateur(id, demandeur)).build();
    }
}
