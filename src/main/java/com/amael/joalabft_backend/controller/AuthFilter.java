package com.amael.joalabft_backend.controller;

import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.service.SessionStore;
import jakarta.inject.Inject;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;

import java.io.IOException;

/**
 * Filtre d'authentification : vérifie le token Bearer sur toutes les requêtes
 * sauf {@code POST /api/auth/login}.
 *
 * <p>Si le token est valide, l'utilisateur est injecté dans le contexte de la
 * requête sous la clé {@code "utilisateur"}.
 */
@Provider
public class AuthFilter implements ContainerRequestFilter {

    private static final String LOGIN_PATH = "auth/login";

    @Inject
    private SessionStore sessionStore;

    @Override
    public void filter(ContainerRequestContext requestContext) throws IOException {
        String path = requestContext.getUriInfo().getPath();

        // Laisser passer la connexion et les preflight OPTIONS
        if (path.endsWith(LOGIN_PATH) || "OPTIONS".equalsIgnoreCase(requestContext.getMethod())) {
            return;
        }

        String authHeader = requestContext.getHeaderString("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            abort(requestContext);
            return;
        }

        String token = authHeader.substring(7).trim();
        Utilisateur utilisateur = sessionStore.getUtilisateur(token);

        if (utilisateur == null) {
            abort(requestContext);
            return;
        }

        // Expose l'utilisateur aux ressources via le contexte de la requête
        requestContext.setProperty("utilisateur", utilisateur);
        requestContext.setProperty("token", token);
    }

    private void abort(ContainerRequestContext ctx) {
        ctx.abortWith(
            Response.status(Response.Status.UNAUTHORIZED)
                    .entity("{\"error\":\"Token manquant ou invalide\"}")
                    .type("application/json")
                    .build()
        );
    }
}
