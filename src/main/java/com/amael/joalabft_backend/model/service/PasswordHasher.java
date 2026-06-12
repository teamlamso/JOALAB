package com.amael.joalabft_backend.model.service;

import at.favre.lib.crypto.bcrypt.BCrypt;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public final class PasswordHasher {

    /** Facteur de coût BCrypt : 2^12 = 4096 itérations (~250 ms sur un serveur moderne). */
    private static final int BCRYPT_COST = 12;

    private PasswordHasher() {}

    public static String hash(String motDePasse) {
        if (motDePasse == null) {
            throw new IllegalArgumentException("Mot de passe null");
        }
        return BCrypt.withDefaults().hashToString(BCRYPT_COST, motDePasse.toCharArray());
    }

    public static boolean verify(String motDePasse, String hashStocke) {
        if (motDePasse == null || hashStocke == null || hashStocke.isEmpty()) {
            return false;
        }
        if (isLegacyHash(hashStocke)) {
            return constantTimeEquals(sha256Hex(motDePasse), hashStocke);
        }
        return BCrypt.verifyer().verify(motDePasse.toCharArray(), hashStocke).verified;
    }

    /**
     * Indique si le hash est au format legacy SHA-256 (64 caractères hexadécimaux).
     * Un hash legacy doit être re-hashé en BCrypt à la prochaine authentification réussie.
     */
    public static boolean isLegacyHash(String hashStocke) {
        if (hashStocke == null || hashStocke.length() != 64) return false;
        for (int i = 0; i < 64; i++) {
            char c = hashStocke.charAt(i);
            boolean hex = (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
            if (!hex) return false;
        }
        return true;
    }

    // ── Helpers internes (rétrocompatibilité SHA-256) ──────────────────────────────

    private static String sha256Hex(String input) {
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

    /** Comparaison en temps constant pour éviter les timing attacks sur l'ancien format. */
    private static boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) return false;
        int diff = 0;
        for (int i = 0; i < a.length(); i++) {
            diff |= a.charAt(i) ^ b.charAt(i);
        }
        return diff == 0;
    }
}
