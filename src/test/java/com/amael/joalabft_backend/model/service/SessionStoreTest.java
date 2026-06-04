package com.amael.joalabft_backend.model.service;

import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.test.TestEntities;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SessionStoreTest {

    private SessionStore store;

    @BeforeEach
    void setUp() {
        store = new SessionStore();
    }

    @Test
    void createSession_retourneTokenUnique() {
        Utilisateur u = TestEntities.mcd(1);
        String t1 = store.createSession(u);
        String t2 = store.createSession(u);
        assertThat(t1).isNotBlank().isNotEqualTo(t2);
    }

    @Test
    void getUtilisateur_tokenValide_retourneUtilisateur() {
        Utilisateur u = TestEntities.mcd(1);
        String token = store.createSession(u);
        assertThat(store.getUtilisateur(token)).isSameAs(u);
    }

    @Test
    void getUtilisateur_tokenInconnu_retourneNull() {
        assertThat(store.getUtilisateur("token-fantaisiste")).isNull();
    }

    @Test
    void getUtilisateur_tokenNull_retourneNull() {
        assertThat(store.getUtilisateur(null)).isNull();
    }

    @Test
    void invalidate_supprimeLaSession() {
        Utilisateur u = TestEntities.mcd(1);
        String token = store.createSession(u);
        store.invalidate(token);
        assertThat(store.getUtilisateur(token)).isNull();
    }

    @Test
    void invalidate_tokenNull_neJettePas() {
        store.invalidate(null);
        // Aucune exception attendue.
    }

    @Test
    void invalidateByUtilisateurId_supprimeToutesLesSessionsDuMemeCompte() {
        Utilisateur u = TestEntities.mcd(1);
        String t1 = store.createSession(u);
        String t2 = store.createSession(u);
        // Un autre utilisateur en parallèle ne doit pas être touché.
        Utilisateur autre = TestEntities.caissier(2);
        String autreToken = store.createSession(autre);

        store.invalidateByUtilisateurId(1L);

        assertThat(store.getUtilisateur(t1)).isNull();
        assertThat(store.getUtilisateur(t2)).isNull();
        assertThat(store.getUtilisateur(autreToken)).isSameAs(autre);
    }

    @Test
    void invalidateByUtilisateurId_null_neJettePas() {
        Utilisateur u = TestEntities.mcd(1);
        String token = store.createSession(u);
        store.invalidateByUtilisateurId(null);
        assertThat(store.getUtilisateur(token)).isSameAs(u);
    }
}
