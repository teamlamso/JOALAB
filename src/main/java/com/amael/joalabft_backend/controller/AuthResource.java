package com.amael.joalabft_backend.controller;

import com.amael.joalabft_backend.model.dto.request.LoginRequest;
import com.amael.joalabft_backend.model.dto.response.LoginResponse;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.service.AuthService;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/**
 * Ressource JAX-RS gérant l'authentification.
 *
 * <ul>
 *   <li>{@code POST /api/auth/login}  — connexion</li>
 *   <li>{@code POST /api/auth/logout} — déconnexion</li>
 * </ul>
 */
@Path("/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AuthResource {

    @Inject
    private AuthService authService;

    /**
     * Authentifie un utilisateur et retourne un token de session.
     *
     * @return 200 + {@link LoginResponse}, ou 401 si les identifiants sont incorrects
     */
    @POST
    @Path("/login")
    public Response login(LoginRequest req) {
        if (req == null || req.identifiant == null || req.motDePasse == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Identifiant et mot de passe requis\"}")
                    .build();
        }

        String token = authService.login(req.identifiant, req.motDePasse);
        if (token == null) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity("{\"error\":\"Identifiant ou mot de passe incorrect\"}")
                    .build();
        }

        Utilisateur u = authService.getUtilisateur(token);
        return Response.ok(new LoginResponse(
                token,
                u.getId(),
                u.getIdentifiant(),
                u.getNom(),
                u.getPrenom(),
                u.getRole().name()
        )).build();
    }

    /**
     * Invalide la session en cours.
     *
     * @return 204 No Content
     */
    @POST
    @Path("/logout")
    public Response logout(@Context ContainerRequestContext ctx) {
        String token = (String) ctx.getProperty("token");
        authService.logout(token);
        return Response.noContent().build();
    }
}
