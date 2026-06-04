package com.amael.joalabft_backend.model.service;

import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.enums.RoleUtilisateur;
import com.amael.joalabft_backend.model.enums.TypeActionJournal;
import com.amael.joalabft_backend.model.enums.TypeEntiteJournal;
import com.amael.joalabft_backend.model.repository.UtilisateurRepository;
import com.amael.joalabft_backend.test.TestEntities;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UtilisateurRepository utilisateurRepository;
    @Mock SessionStore sessionStore;
    @Mock JournalService journalService;

    @InjectMocks AuthService service;

    private Utilisateur utilisateur;

    @BeforeEach
    void setUp() {
        utilisateur = TestEntities.utilisateur(10L, "alice", RoleUtilisateur.CAISSIER);
        utilisateur.setMotDePasse(PasswordHasher.hash("hunter2"));
    }

    @Test
    void login_identifiantsValides_retourneTokenEtJournalise() {
        when(utilisateurRepository.findByIdentifiant("alice")).thenReturn(Optional.of(utilisateur));
        when(sessionStore.createSession(utilisateur)).thenReturn("token-abc");

        String token = service.login("alice", "hunter2");

        assertThat(token).isEqualTo("token-abc");
        verify(journalService).log(
                eq(utilisateur),
                eq(TypeActionJournal.CONNEXION),
                eq(TypeEntiteJournal.UTILISATEUR),
                eq(10L),
                eq("alice"),
                any());
    }

    @Test
    void login_identifiantInconnu_retourneNull() {
        when(utilisateurRepository.findByIdentifiant("ghost")).thenReturn(Optional.empty());
        assertThat(service.login("ghost", "x")).isNull();
        verify(sessionStore, never()).createSession(any());
    }

    @Test
    void login_motDePasseFaux_retourneNull() {
        when(utilisateurRepository.findByIdentifiant("alice")).thenReturn(Optional.of(utilisateur));
        assertThat(service.login("alice", "mauvais")).isNull();
        verify(sessionStore, never()).createSession(any());
    }

    @Test
    void login_compteArchive_retourneNull() {
        utilisateur.setArchive(true);
        when(utilisateurRepository.findByIdentifiant("alice")).thenReturn(Optional.of(utilisateur));
        assertThat(service.login("alice", "hunter2")).isNull();
        verify(sessionStore, never()).createSession(any());
    }

    @Test
    void login_hashLegacy_migreVersBcrypt() {
        // SHA-256 hex de "hunter2"
        String legacy = "f52fbd32b2b3b86ff88ef6c490628285f482af15ddcb29541f94bcf526a3f6c7";
        utilisateur.setMotDePasse(legacy);
        when(utilisateurRepository.findByIdentifiant("alice")).thenReturn(Optional.of(utilisateur));
        when(sessionStore.createSession(utilisateur)).thenReturn("token-bcrypt");

        String token = service.login("alice", "hunter2");

        assertThat(token).isEqualTo("token-bcrypt");
        assertThat(utilisateur.getMotDePasse()).startsWith("$2a$12$");
    }

    @Test
    void logout_journaliseLaDeconnexion() {
        when(sessionStore.getUtilisateur("tk")).thenReturn(utilisateur);
        service.logout("tk");
        verify(sessionStore).invalidate("tk");
        verify(journalService, times(1)).log(
                eq(utilisateur), eq(TypeActionJournal.DECONNEXION),
                any(), any(), any(), any());
    }

    @Test
    void logout_tokenInvalide_neJournalisePas() {
        when(sessionStore.getUtilisateur("tk")).thenReturn(null);
        service.logout("tk");
        verify(journalService, never()).log(any(), any(), any(), any(), any(), any());
    }
}
