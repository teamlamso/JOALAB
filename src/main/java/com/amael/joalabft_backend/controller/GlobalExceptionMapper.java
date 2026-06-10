package com.amael.joalabft_backend.controller;

import jakarta.ejb.EJBException;
import jakarta.json.Json;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

/**
 * Mappe toute exception remontée par un endpoint JAX-RS en réponse JSON
 * cohérente {@code { "message": "..." }} attendue par le frontend.
 *
 * <p>Cas particulier important : quand un EJB {@code @Stateless} lève une
 * exception JAX-RS comme {@link jakarta.ws.rs.BadRequestException}, le
 * container EJB la wrappe en {@link EJBException} (parce qu'elle n'est pas
 * annotée {@code @ApplicationException} — et on ne peut pas l'annoter, c'est
 * une classe de la spec). Sans ce mapper, le client recevait juste un
 * {@code 400/500} générique avec le message d'origine perdu. On déballe ici
 * la cause pour conserver le status et le message métier — typiquement
 * « Votre rôle ne vous permet pas de modifier ce lieu de naissance… ».
 */
@Provider
public class GlobalExceptionMapper implements ExceptionMapper<Throwable> {

    @Override
    public Response toResponse(Throwable t) {
        Throwable cause = t;
        if (cause instanceof EJBException ejb && ejb.getCausedByException() != null) {
            cause = ejb.getCausedByException();
        }

        int status;
        String message;
        if (cause instanceof WebApplicationException wae) {
            status = wae.getResponse().getStatus();
            message = wae.getMessage();
        } else {
            status = Response.Status.INTERNAL_SERVER_ERROR.getStatusCode();
            message = cause.getMessage();
        }
        if (message == null || message.isBlank()) {
            message = "Erreur interne du serveur";
        }

        return Response.status(status)
                .type(MediaType.APPLICATION_JSON)
                .entity(Json.createObjectBuilder().add("message", message).build())
                .build();
    }
}
