package com.amael.joalabft_backend.model.service;

import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.enums.TypeActionJournal;
import com.amael.joalabft_backend.model.enums.TypeEntiteJournal;
import com.amael.joalabft_backend.model.repository.UtilisateurRepository;
import jakarta.ejb.Stateless;
import jakarta.inject.Inject;

import java.util.Optional;

@Stateless
public class AuthService {

    @Inject
    private UtilisateurRepository utilisateurRepository;

    @Inject
    private SessionStore sessionStore;

    @Inject
    private JournalService journalService;

    public String login(String identifiant, String motDePasse) {
        Optional<Utilisateur> opt = utilisateurRepository.findByIdentifiant(identifiant);
        if (opt.isEmpty()) return null;

        Utilisateur u = opt.get();
        if (u.isArchive()) return null;
        if (!PasswordHasher.verify(motDePasse, u.getMotDePasse())) return null;

        if (PasswordHasher.isLegacyHash(u.getMotDePasse())) {
            u.setMotDePasse(PasswordHasher.hash(motDePasse));
        }

        String token = sessionStore.createSession(u);
        journalService.log(
                u,
                TypeActionJournal.CONNEXION,
                TypeEntiteJournal.UTILISATEUR,
                u.getId(),
                u.getIdentifiant(),
                "Connexion réussie");
        return token;
    }

    /** Retourne l'utilisateur associé au token */
    public Utilisateur getUtilisateur(String token) {
        return sessionStore.getUtilisateur(token);
    }

    /** Invalide la session du token. */
    public void logout(String token) {
        Utilisateur u = sessionStore.getUtilisateur(token);
        sessionStore.invalidate(token);
        if (u != null) {
            journalService.log(
                    u,
                    TypeActionJournal.DECONNEXION,
                    TypeEntiteJournal.UTILISATEUR,
                    u.getId(),
                    u.getIdentifiant(),
                    "Déconnexion");
        }
    }
}
