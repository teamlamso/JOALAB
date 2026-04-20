package com.amael.joalabft_backend.model.service;

import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.repository.UtilisateurRepository;
import jakarta.ejb.Stateless;
import jakarta.inject.Inject;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Optional;

/**
 * Gère l'authentification des utilisateurs.
 * Les mots de passe sont comparés après hachage SHA-256.
 */
@Stateless
public class AuthService {

    @Inject
    private UtilisateurRepository utilisateurRepository;

    @Inject
    private SessionStore sessionStore;

    /**
     * Tente d'authentifier un utilisateur.
     *
     * @return le token de session si les identifiants sont valides, {@code null} sinon
     */
    public String login(String identifiant, String motDePasse) {
        Optional<Utilisateur> opt = utilisateurRepository.findByIdentifiant(identifiant);
        if (opt.isEmpty()) return null;

        Utilisateur u = opt.get();
        if (!u.getMotDePasse().equals(hashSha256(motDePasse))) return null;

        return sessionStore.createSession(u);
    }

    /** Retourne l'utilisateur associé au token, ou {@code null}. */
    public Utilisateur getUtilisateur(String token) {
        return sessionStore.getUtilisateur(token);
    }

    /** Invalide la session du token. */
    public void logout(String token) {
        sessionStore.invalidate(token);
    }

    /** Hache une chaîne en SHA-256 et retourne la représentation hexadécimale. */
    private String hashSha256(String input) {
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
