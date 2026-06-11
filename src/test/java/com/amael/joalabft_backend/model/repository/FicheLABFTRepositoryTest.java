package com.amael.joalabft_backend.model.repository;

import com.amael.joalabft_backend.model.entity.Client;
import com.amael.joalabft_backend.model.entity.FicheLABFT;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.enums.RoleUtilisateur;
import com.amael.joalabft_backend.test.JpaIntegrationBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests d'intégration JPA pour {@link FicheLABFTRepository}.
 *
 * <p>La logique non triviale ici est la fenêtre métier « jour de travail »
 * (06h00 → 05h59 le lendemain) que la requête doit respecter — sinon on
 * affiche soit la mauvaise journée, soit une fiche est invisible juste
 * après minuit.
 */
class FicheLABFTRepositoryTest extends JpaIntegrationBase {

    private FicheLABFTRepository repo;

    @BeforeEach
    void inject() {
        repo = injectEm(new FicheLABFTRepository());
    }

    private Client persistClient(String prenom, String nom) {
        Client c = new Client();
        c.setIdentifie(true);
        c.setNom(nom); c.setPrenom(prenom);
        c.setDateNaissance(LocalDate.of(1990, 1, 1));
        c.setPays("France");
        em.persist(c);
        em.flush();
        return c;
    }

    private Client persistClientNonIdentifie(String description) {
        Client c = new Client();
        c.setIdentifie(false);
        c.setDescriptionPhysique(description);
        em.persist(c);
        em.flush();
        return c;
    }

    private Utilisateur persistCaissier(String identifiant) {
        Utilisateur u = new Utilisateur();
        u.setIdentifiant(identifiant);
        u.setMotDePasse("$2a$12$x");
        u.setNom("X"); u.setPrenom("Y");
        u.setRole(RoleUtilisateur.CAISSIER);
        em.persist(u);
        em.flush();
        return u;
    }

    private FicheLABFT persistFiche(Client client, Utilisateur caissier, LocalDateTime dateCreation) {
        FicheLABFT f = new FicheLABFT();
        f.setClient(client);
        f.setCreePar(caissier);
        f.setDateCreation(dateCreation);
        em.persist(f);
        em.flush();
        return f;
    }

    // ---------------------------------------------------------------------
    // Fenêtre journée de travail (06h00 → 05h59)
    // ---------------------------------------------------------------------

    @Test
    void findWithFilters_fenetreInclutLeDebutDuJourATravers06h() {
        Client c = persistClient("Marie", "Dupont");
        Utilisateur u = persistCaissier("u1");
        // Fiche créée à 6h du jour de travail = INCLUSE.
        persistFiche(c, u, LocalDateTime.of(2026, 6, 10, 6, 0));
        // Fiche créée à 5h59 le matin du jour de travail = appartient à la
        // journée PRÉCÉDENTE, donc exclue d'une fenêtre 10/06 → 10/06.
        persistFiche(c, u, LocalDateTime.of(2026, 6, 10, 5, 59));
        flushAndClear();

        List<FicheLABFT> result = repo.findWithFilters(
                LocalDate.of(2026, 6, 10), LocalDate.of(2026, 6, 10), null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getDateCreation().getHour()).isEqualTo(6);
    }

    @Test
    void findWithFilters_fenetreExcluLAubeDuJourSuivant() {
        Client c = persistClient("Marie", "Dupont");
        Utilisateur u = persistCaissier("u1");
        // Fiche à 23h du 10/06 = jour de travail 10/06 (INCLUS).
        persistFiche(c, u, LocalDateTime.of(2026, 6, 10, 23, 0));
        // Fiche à 5h59 du 11/06 = JOUR DE TRAVAIL 10/06 (INCLUS).
        persistFiche(c, u, LocalDateTime.of(2026, 6, 11, 5, 59));
        // Fiche à 6h00 du 11/06 = JOUR DE TRAVAIL 11/06 (EXCLUS).
        persistFiche(c, u, LocalDateTime.of(2026, 6, 11, 6, 0));
        flushAndClear();

        List<FicheLABFT> result = repo.findWithFilters(
                LocalDate.of(2026, 6, 10), LocalDate.of(2026, 6, 10), null);

        assertThat(result).hasSize(2);
    }

    // ---------------------------------------------------------------------
    // Tri : dernière modification d'abord (COALESCE)
    // ---------------------------------------------------------------------

    @Test
    void findWithFilters_trieParDateModificationCoalesceCreation() {
        Client c = persistClient("Marie", "Dupont");
        Utilisateur u = persistCaissier("u1");
        // Fiche A : créée à 12h, modifiée à 15h → activité 15h.
        FicheLABFT a = persistFiche(c, u, LocalDateTime.of(2026, 6, 10, 12, 0));
        a.setDateModification(LocalDateTime.of(2026, 6, 10, 15, 0));
        em.merge(a);
        // Fiche B : créée à 14h, jamais modifiée → activité 14h.
        FicheLABFT b = persistFiche(c, u, LocalDateTime.of(2026, 6, 10, 14, 0));
        // Fiche C : créée à 16h, jamais modifiée → activité 16h.
        persistFiche(c, u, LocalDateTime.of(2026, 6, 10, 16, 0));
        flushAndClear();

        List<FicheLABFT> result = repo.findWithFilters(
                LocalDate.of(2026, 6, 10), LocalDate.of(2026, 6, 10), null);

        // C (16h crée) > A (15h modif) > B (14h crée).
        assertThat(result).extracting(f -> f.getDateCreation().getHour())
                .containsExactly(16, 12, 14);
    }

    // ---------------------------------------------------------------------
    // Recherche multi-tokens sur le client
    // ---------------------------------------------------------------------

    @Test
    void findWithFilters_searchFiltreSurNomDuClient() {
        Client marie = persistClient("Marie", "Dupont");
        Client jean = persistClient("Jean", "Martin");
        Utilisateur u = persistCaissier("u1");
        persistFiche(marie, u, LocalDateTime.of(2026, 6, 10, 12, 0));
        persistFiche(jean,  u, LocalDateTime.of(2026, 6, 10, 12, 0));
        flushAndClear();

        List<FicheLABFT> result = repo.findWithFilters(
                LocalDate.of(2026, 6, 10), LocalDate.of(2026, 6, 10), "dupont");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getClient().getNom()).isEqualTo("DUPONT");
    }

    @Test
    void findWithFilters_searchMultiTokens_AND() {
        Client cible    = persistClient("Alexis", "Duchat");
        Client homonyme = persistClient("Bob",    "Duchat");
        Utilisateur u = persistCaissier("u1");
        persistFiche(cible,    u, LocalDateTime.of(2026, 6, 10, 12, 0));
        persistFiche(homonyme, u, LocalDateTime.of(2026, 6, 10, 12, 0));
        flushAndClear();

        List<FicheLABFT> result = repo.findWithFilters(
                LocalDate.of(2026, 6, 10), LocalDate.of(2026, 6, 10), "alexis duchat");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getClient().getPrenom()).isEqualTo("Alexis");
    }

    @Test
    void findWithFilters_searchMatcheLaDescriptionPhysique() {
        Client c = persistClientNonIdentifie("Homme blond, cicatrice");
        Utilisateur u = persistCaissier("u1");
        persistFiche(c, u, LocalDateTime.of(2026, 6, 10, 12, 0));
        flushAndClear();

        List<FicheLABFT> result = repo.findWithFilters(
                LocalDate.of(2026, 6, 10), LocalDate.of(2026, 6, 10), "cicatrice");

        assertThat(result).hasSize(1);
    }

    // ---------------------------------------------------------------------
    // findByClientId
    // ---------------------------------------------------------------------

    @Test
    void findByClientId_renvoieToutesLesFichesDuClientTriees() {
        Client c1 = persistClient("Marie", "Dupont");
        Client c2 = persistClient("Jean",  "Martin");
        Utilisateur u = persistCaissier("u1");
        persistFiche(c1, u, LocalDateTime.of(2026, 1, 1, 12, 0));
        persistFiche(c1, u, LocalDateTime.of(2026, 6, 10, 12, 0));  // récent
        persistFiche(c2, u, LocalDateTime.of(2026, 3, 1, 12, 0));
        flushAndClear();

        List<FicheLABFT> result = repo.findByClientId(c1.getId());

        assertThat(result).hasSize(2);
        // Le plus récent d'abord.
        assertThat(result.get(0).getDateCreation()).isAfter(result.get(1).getDateCreation());
    }

    @Test
    void findByClientId_clientSansFiche_renvoieListeVide() {
        Client c = persistClient("Marie", "Dupont");
        flushAndClear();

        assertThat(repo.findByClientId(c.getId())).isEmpty();
    }
}
