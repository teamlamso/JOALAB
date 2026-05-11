package com.amael.joalabft_backend.model.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * Hashage des mots de passe applicatifs. Centralisé ici pour que la même
 * fonction soit utilisée à la connexion (vérification) et à la création
 * d'utilisateur (stockage).
 */
public final class PasswordHasher {

    private PasswordHasher() {}

    /** Retourne la représentation hexadécimale du SHA-256 de {@code input}. */
    public static String hash(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(64);
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 non disponible", e);
        }
    }
}
