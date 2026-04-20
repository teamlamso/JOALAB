package com.amael.joalabft_backend.controller;

import jakarta.ws.rs.ApplicationPath;
import jakarta.ws.rs.core.Application;

/**
 * Point d'entrée de l'API REST.
 * Toutes les ressources sont disponibles sous le préfixe {@code /api}.
 */
@ApplicationPath("/api")
public class JaxRsApplication extends Application {
}
