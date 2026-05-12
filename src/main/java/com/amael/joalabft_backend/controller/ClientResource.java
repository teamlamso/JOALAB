package com.amael.joalabft_backend.controller;

import com.amael.joalabft_backend.model.dto.request.ClientIdentificationRequest;
import com.amael.joalabft_backend.model.dto.request.ClientRequest;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.service.ClientImportService;
import com.amael.joalabft_backend.model.service.ClientService;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.EntityPart;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.util.List;
import java.util.Map;

/**
 * Ressource JAX-RS pour la gestion des clients.
 *
 * <ul>
 *   <li>{@code GET    /api/clients}                      — liste (avec recherche optionnelle)</li>
 *   <li>{@code GET    /api/clients/{id}}                 — détail + historique fiches</li>
 *   <li>{@code POST   /api/clients}                      — création</li>
 *   <li>{@code POST   /api/clients/match}                — recherche de doublons potentiels</li>
 *   <li>{@code PUT    /api/clients/{id}}                 — mise à jour de l'identité complète
 *                                                          (RESPONSABLE_CAISSE et MCD uniquement)</li>
 *   <li>{@code PATCH  /api/clients/{id}/identification}  — mise à jour de l'adresse et de la
 *                                                          pièce d'identité (tous rôles)</li>
 *   <li>{@code DELETE /api/clients/{id}}                 — suppression (MCD uniquement,
 *                                                          rejette si le client a des fiches)</li>
 * </ul>
 */
@Path("/clients")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ClientResource {

    @Inject
    private ClientService clientService;

    @Inject
    private ClientImportService importService;

    /**
     * Retourne la liste des clients.
     *
     * @param search filtre optionnel sur nom, prénom ou description physique
     */
    @GET
    public Response listClients(@QueryParam("search") String search) {
        return Response.ok(clientService.listClients(search)).build();
    }

    /** Retourne le détail d'un client et l'historique de ses fiches. */
    @GET
    @Path("/{id}")
    public Response getClient(@PathParam("id") Long id) {
        return Response.ok(clientService.getClient(id)).build();
    }

    /** Crée un nouveau client. Retourne 201 Created avec l'ID du nouveau client. */
    @POST
    public Response createClient(ClientRequest req, @Context ContainerRequestContext ctx) {
        Utilisateur utilisateur = (Utilisateur) ctx.getProperty("utilisateur");
        Long id = clientService.createClient(req, utilisateur);
        return Response.created(URI.create("/api/clients/" + id))
                .entity(Map.of("id", id))
                .build();
    }

    /**
     * Recherche les clients déjà existants susceptibles de correspondre à un
     * nouvel enregistrement (mêmes nom+prénom+date de naissance, ou même
     * numéro de pièce). Utilisé par le frontend avant de créer un client pour
     * proposer à l'utilisateur de fusionner ou modifier l'existant.
     */
    @POST
    @Path("/match")
    public Response matchClient(ClientRequest req) {
        return Response.ok(clientService.findSimilar(req)).build();
    }

    /**
     * Met à jour l'identité complète d'un client (état civil, adresse, pièce,
     * PPE, description physique). Réservé aux rôles RESPONSABLE_CAISSE et MCD.
     */
    @PUT
    @Path("/{id}")
    public Response updateClient(@PathParam("id") Long id, ClientRequest req,
                                 @Context ContainerRequestContext ctx) {
        Utilisateur utilisateur = (Utilisateur) ctx.getProperty("utilisateur");
        clientService.updateClient(id, req, utilisateur);
        return Response.noContent().build();
    }

    /**
     * Met à jour uniquement l'adresse et la pièce d'identité d'un client.
     * Accessible à tous les rôles (y compris CAISSIER).
     */
    @PATCH
    @Path("/{id}/identification")
    public Response updateIdentification(@PathParam("id") Long id,
                                         ClientIdentificationRequest req,
                                         @Context ContainerRequestContext ctx) {
        Utilisateur utilisateur = (Utilisateur) ctx.getProperty("utilisateur");
        clientService.updateClientIdentification(id, req, utilisateur);
        return Response.noContent().build();
    }

    /** Supprime un client. Réservé aux MCD ; le client doit n'avoir aucune fiche. */
    @DELETE
    @Path("/{id}")
    public Response deleteClient(@PathParam("id") Long id,
                                 @Context ContainerRequestContext ctx) {
        Utilisateur utilisateur = (Utilisateur) ctx.getProperty("utilisateur");
        clientService.deleteClient(id, utilisateur);
        return Response.noContent().build();
    }

    /**
     * Import en masse depuis un classeur Excel (.xlsx ou .xls).
     * Le multipart doit contenir une partie nommée {@code file} portant le
     * classeur. Réservé aux RESPONSABLE_CAISSE et MCD.
     */
    @POST
    @Path("/import")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public Response importer(List<EntityPart> parts, @Context ContainerRequestContext ctx) throws IOException {
        Utilisateur utilisateur = (Utilisateur) ctx.getProperty("utilisateur");
        EntityPart filePart = parts.stream()
                .filter(p -> "file".equals(p.getName()))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("Le fichier (partie « file ») est manquant."));
        try (InputStream in = filePart.getContent()) {
            return Response.ok(importService.importer(in, utilisateur)).build();
        }
    }
}
