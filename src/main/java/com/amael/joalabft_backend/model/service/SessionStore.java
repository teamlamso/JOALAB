package com.amael.joalabft_backend.model.service;

import com.amael.joalabft_backend.model.entity.Utilisateur;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Stocke les sessions actives en mémoire (singleton d'application).
 * Les sessions expirent après {@value #TTL_HEURES} heures d'inactivité.
 */
@ApplicationScoped
public class SessionStore {

    private static final int TTL_HEURES = 8;

    private record Session(Utilisateur utilisateur, LocalDateTime createdAt) {}

    private final ConcurrentHashMap<String, Session> sessions = new ConcurrentHashMap<>();

    /** Crée une nouvelle session et retourne le token généré. */
    public String createSession(Utilisateur utilisateur) {
        String token = UUID.randomUUID().toString();
        sessions.put(token, new Session(utilisateur, LocalDateTime.now()));
        return token;
    }

    /**
     * Retourne l'utilisateur associé au token, ou {@code null} si le token
     * est inconnu ou si la session a expiré.
     */
    public Utilisateur getUtilisateur(String token) {
        if (token == null) return null;
        Session session = sessions.get(token);
        if (session == null) return null;
        if (session.createdAt().isBefore(LocalDateTime.now().minusHours(TTL_HEURES))) {
            sessions.remove(token);
            return null;
        }
        return session.utilisateur();
    }

    /** Invalide la session associée au token. */
    public void invalidate(String token) {
        if (token != null) sessions.remove(token);
    }
}
