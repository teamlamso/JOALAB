package com.amael.joalabft_backend.test;

import com.amael.joalabft_backend.controller.GlobalExceptionMapper;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.Application;
import org.glassfish.hk2.utilities.binding.AbstractBinder;
import org.glassfish.jersey.server.ResourceConfig;
import org.glassfish.jersey.test.JerseyTest;

import java.io.IOException;

/**
 * Base pour les tests JAX-RS des ressources REST. Boot une mini-application
 * Jersey en mémoire (transport in-memory, pas de socket réseau), avec :
 *  - le {@link GlobalExceptionMapper} de prod, pour vérifier le mapping
 *    des exceptions ;
 *  - un filtre qui pose un {@link Utilisateur} de test dans la propriété
 *    "utilisateur" du contexte de la requête (comme le ferait l'AuthFilter
 *    avec un token valide en prod) ;
 *  - le binding des services métier mockés, fourni par chaque sous-classe.
 */
public abstract class JaxRsTestBase extends JerseyTest {

    /** L'utilisateur injecté dans la propriété "utilisateur" du contexte. */
    private Utilisateur currentUser;

    /**
     * Permet aux tests de changer l'utilisateur courant entre les requêtes,
     * pour exercer les branches selon le rôle.
     */
    protected void setCurrentUser(Utilisateur user) {
        this.currentUser = user;
    }

    @Override
    protected Application configure() {
        ResourceConfig config = new ResourceConfig();
        register(config);
        config.register(GlobalExceptionMapper.class);
        // Filtre qui simule l'AuthFilter de prod : injecte l'utilisateur dans
        // la propriété "utilisateur" lue par les @Context ContainerRequestContext.
        config.register(new ContainerRequestFilter() {
            @Override
            public void filter(ContainerRequestContext ctx) throws IOException {
                if (currentUser != null) {
                    ctx.setProperty("utilisateur", currentUser);
                }
            }
        });
        config.register(bindings());
        return config;
    }

    /**
     * Sous-classe enregistre la (ou les) ressource(s) sous test.
     */
    protected abstract void register(ResourceConfig config);

    /**
     * Sous-classe fournit le binder qui injecte les mocks de services
     * dans la ressource (HK2 remplace ici l'injection CDI de prod).
     */
    protected abstract AbstractBinder bindings();
}
