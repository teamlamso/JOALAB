package com.amael.joalabft_backend.controller;

import com.amael.joalabft_backend.model.dto.request.FicheRequest;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.service.FicheService;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.net.URI;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Ressource JAX-RS pour la gestion des fiches LAB-FT.
 *
 * <ul>
 *   <li>{@code GET  /api/fiches}      — liste filtrée (accueil)</li>
 *   <li>{@code GET  /api/fiches/{id}} — détail d'une fiche</li>
 *   <li>{@code POST /api/fiches}      — création</li>
 *   <li>{@code PUT  /api/fiches/{id}} — mise à jour des lignes</li>
 * </ul>
 */
@Path("/fiches")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class FicheResource {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ISO_LOCAL_DATE;

    @Inject
    private FicheService ficheService;

    /**
     * Retourne la liste des fiches filtrées.
     *
     * @param dateDebut date de début au format yyyy-MM-dd (défaut : aujourd'hui)
     * @param dateFin   date de fin au format yyyy-MM-dd (défaut : aujourd'hui)
     * @param search    filtre texte sur le nom / description du client
     */
    @GET
    public Response listFiches(
            @QueryParam("dateDebut") String dateDebut,
            @QueryParam("dateFin")   String dateFin,
            @QueryParam("search")    String search) {

        LocalDate from = dateDebut != null ? LocalDate.parse(dateDebut, DATE_FMT) : null;
        LocalDate to   = dateFin   != null ? LocalDate.parse(dateFin,   DATE_FMT) : null;

        return Response.ok(ficheService.listFiches(from, to, search)).build();
    }

    /** Retourne le détail complet d'une fiche. */
    @GET
    @Path("/{id}")
    public Response getFiche(@PathParam("id") Long id) {
        return Response.ok(ficheService.getFiche(id)).build();
    }

    /**
     * Crée une nouvelle fiche pour l'utilisateur connecté.
     * Retourne 201 Created avec l'URI de la nouvelle fiche.
     */
    @POST
    public Response createFiche(FicheRequest req, @Context ContainerRequestContext ctx) {
        Utilisateur utilisateur = (Utilisateur) ctx.getProperty("utilisateur");
        Long id = ficheService.createFiche(req, utilisateur);
        return Response.created(URI.create("/api/fiches/" + id)).build();
    }

    /**
     * Met à jour les lignes d'une fiche existante.
     * Enregistre l'utilisateur connecté comme modificateur.
     */
    @PUT
    @Path("/{id}")
    public Response updateFiche(@PathParam("id") Long id, FicheRequest req,
                                @Context ContainerRequestContext ctx) {
        Utilisateur utilisateur = (Utilisateur) ctx.getProperty("utilisateur");
        ficheService.updateFiche(id, req, utilisateur);
        return Response.noContent().build();
    }
}
