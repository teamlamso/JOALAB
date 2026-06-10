package com.amael.joalabft_backend.controller;

import jakarta.ejb.EJBException;
import jakarta.json.JsonObject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Garantit le contrat du mapper global d'exceptions : (1) toute exception
 * remontée par un endpoint doit sortir en JSON {@code { "message": "..." }}
 * — le frontend lit cette clé pour son toast d'erreur ; (2) une
 * {@link jakarta.ws.rs.WebApplicationException} levée depuis un EJB et
 * wrappée en {@link EJBException} doit conserver son status HTTP d'origine
 * et son message métier.
 */
class GlobalExceptionMapperTest {

    private final GlobalExceptionMapper mapper = new GlobalExceptionMapper();

    @Test
    void badRequestException_directe_donne400EtMessage() {
        Response r = mapper.toResponse(new BadRequestException("champ requis"));

        assertThat(r.getStatus()).isEqualTo(400);
        assertThat(r.getMediaType().toString()).isEqualTo(MediaType.APPLICATION_JSON);
        assertThat(((JsonObject) r.getEntity()).getString("message")).isEqualTo("champ requis");
    }

    @Test
    void notFoundException_directe_donne404EtMessage() {
        Response r = mapper.toResponse(new NotFoundException("client absent"));

        assertThat(r.getStatus()).isEqualTo(404);
        assertThat(((JsonObject) r.getEntity()).getString("message")).isEqualTo("client absent");
    }

    @Test
    void forbiddenException_directe_donne403EtMessage() {
        Response r = mapper.toResponse(new ForbiddenException("rôle insuffisant"));

        assertThat(r.getStatus()).isEqualTo(403);
        assertThat(((JsonObject) r.getEntity()).getString("message")).isEqualTo("rôle insuffisant");
    }

    @Test
    void ejbException_wrappantBadRequest_debobineLeStatusEtLeMessage() {
        // Le scénario réel reproduit : ClientService.updateClientIdentification()
        // lève BadRequestException → le container EJB la wrappe en EJBException
        // → sans ce mapper, le frontend recevait juste "Erreur 400" sans détail.
        BadRequestException origine = new BadRequestException(
                "Votre rôle ne vous permet pas de modifier ce lieu de naissance.");
        EJBException wrap = new EJBException(origine);

        Response r = mapper.toResponse(wrap);

        assertThat(r.getStatus()).isEqualTo(400);
        assertThat(((JsonObject) r.getEntity()).getString("message"))
                .isEqualTo("Votre rôle ne vous permet pas de modifier ce lieu de naissance.");
    }

    @Test
    void ejbException_wrappantNotFound_donne404() {
        EJBException wrap = new EJBException(new NotFoundException("fiche absente"));

        Response r = mapper.toResponse(wrap);

        assertThat(r.getStatus()).isEqualTo(404);
        assertThat(((JsonObject) r.getEntity()).getString("message")).isEqualTo("fiche absente");
    }

    @Test
    void ejbException_sansCause_donne500EtMessageGenerique() {
        // EJBException sans cause embarquée — on retombe sur son propre message,
        // qui sert au moins à orienter le diagnostic côté navigateur.
        Response r = mapper.toResponse(new EJBException("pool épuisé"));

        assertThat(r.getStatus()).isEqualTo(500);
        assertThat(((JsonObject) r.getEntity()).getString("message")).isEqualTo("pool épuisé");
    }

    @Test
    void runtimeExceptionInconnue_donne500() {
        Response r = mapper.toResponse(new IllegalStateException("connexion fermée"));

        assertThat(r.getStatus()).isEqualTo(500);
        assertThat(((JsonObject) r.getEntity()).getString("message")).isEqualTo("connexion fermée");
    }

    @Test
    void exceptionSansMessage_retombeSurMessageGenerique() {
        // Garde-fou pour les NPE/AssertionError sans message : on ne veut jamais
        // qu'un toast affiche « null » côté frontend.
        Response r = mapper.toResponse(new NullPointerException());

        assertThat(r.getStatus()).isEqualTo(500);
        assertThat(((JsonObject) r.getEntity()).getString("message"))
                .isEqualTo("Erreur interne du serveur");
    }

    @Test
    void exceptionAvecMessageBlanc_retombeSurMessageGenerique() {
        Response r = mapper.toResponse(new RuntimeException("   "));

        assertThat(r.getStatus()).isEqualTo(500);
        assertThat(((JsonObject) r.getEntity()).getString("message"))
                .isEqualTo("Erreur interne du serveur");
    }

    @Test
    void mediaTypeEstToujoursJson() {
        // Vérifié sur plusieurs branches pour s'assurer qu'on ne renvoie jamais
        // de text/plain — le frontend ne parserait pas et afficherait « Erreur 4xx ».
        Response r1 = mapper.toResponse(new BadRequestException("x"));
        Response r2 = mapper.toResponse(new EJBException(new NotFoundException("y")));
        Response r3 = mapper.toResponse(new RuntimeException("z"));

        assertThat(r1.getMediaType().toString()).isEqualTo(MediaType.APPLICATION_JSON);
        assertThat(r2.getMediaType().toString()).isEqualTo(MediaType.APPLICATION_JSON);
        assertThat(r3.getMediaType().toString()).isEqualTo(MediaType.APPLICATION_JSON);
    }
}
