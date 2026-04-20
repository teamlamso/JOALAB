package com.amael.joalabft_backend.controller;

import com.amael.joalabft_backend.model.dto.request.ClientRequest;
import com.amael.joalabft_backend.model.service.ClientService;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.net.URI;

/**
 * Ressource JAX-RS pour la gestion des clients.
 *
 * <ul>
 *   <li>{@code GET    /api/clients}       — liste (avec recherche optionnelle)</li>
 *   <li>{@code GET    /api/clients/{id}}  — détail + historique fiches</li>
 *   <li>{@code POST   /api/clients}       — création</li>
 *   <li>{@code PUT    /api/clients/{id}}  — mise à jour</li>
 * </ul>
 */
@Path("/clients")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ClientResource {

    @Inject
    private ClientService clientService;

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

    /** Crée un nouveau client. Retourne 201 Created avec l'URI du nouveau client. */
    @POST
    public Response createClient(ClientRequest req) {
        Long id = clientService.createClient(req);
        return Response.created(URI.create("/api/clients/" + id)).build();
    }

    /** Met à jour un client existant. */
    @PUT
    @Path("/{id}")
    public Response updateClient(@PathParam("id") Long id, ClientRequest req) {
        clientService.updateClient(id, req);
        return Response.noContent().build();
    }
}
