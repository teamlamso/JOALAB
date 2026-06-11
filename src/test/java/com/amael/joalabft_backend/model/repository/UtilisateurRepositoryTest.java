package com.amael.joalabft_backend.model.repository;

import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.enums.RoleUtilisateur;
import com.amael.joalabft_backend.test.JpaIntegrationBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests d'intégration JPA pour {@link UtilisateurRepository}.
 *
 * <p>Validé contre H2 (mode PostgreSQL) — pas Payara ni la vraie BD, mais
 * couvre le JPQL custom et les contraintes (unicité, tri composé).
 */
class UtilisateurRepositoryTest extends JpaIntegrationBase {

    private UtilisateurRepository repo;

    @BeforeEach
    void inject() {
        repo = injectEm(new UtilisateurRepository());
    }

    private Utilisateur persist(String identifiant, String nom, String prenom,
                                RoleUtilisateur role, boolean archive) {
        Utilisateur u = new Utilisateur();
        u.setIdentifiant(identifiant);
        u.setMotDePasse("$2a$12$x");
        u.setNom(nom);
        u.setPrenom(prenom);
        u.setRole(role);
        u.setArchive(archive);
        em.persist(u);
        em.flush();
        return u;
    }

    // ---------------------------------------------------------------------
    // findByIdentifiant
    // ---------------------------------------------------------------------

    @Test
    void findByIdentifiant_renvoieLeMatchExact() {
        persist("mcd1", "Dupont", "Jean", RoleUtilisateur.MCD, false);
        flushAndClear();

        assertThat(repo.findByIdentifiant("mcd1")).isPresent()
                .get().extracting(Utilisateur::getNom).isEqualTo("Dupont");
    }

    @Test
    void findByIdentifiant_inexistant_renvoieEmpty() {
        assertThat(repo.findByIdentifiant("inexistant")).isEmpty();
    }

    @Test
    void findByIdentifiant_estSensibleALaCasse() {
        // Garde-fou : on ne veut pas qu'un caissier puisse se connecter avec
        // MCD1 quand son login réel est mcd1 — ça contournerait le rate
        // limiting basé sur l'identifiant côté front.
        persist("mcd1", "X", "Y", RoleUtilisateur.MCD, false);
        flushAndClear();

        assertThat(repo.findByIdentifiant("MCD1")).isEmpty();
    }

    // ---------------------------------------------------------------------
    // findAll : tri par rôle (MCD avant RESPONSABLE avant CAISSIER)
    // ---------------------------------------------------------------------

    @Test
    void findAll_excluLesArchivesParDefaut() {
        persist("actif", "A", "A", RoleUtilisateur.MCD, false);
        persist("archive", "B", "B", RoleUtilisateur.MCD, true);
        flushAndClear();

        List<Utilisateur> result = repo.findAll();

        assertThat(result).extracting(Utilisateur::getIdentifiant)
                .containsExactly("actif");
    }

    @Test
    void findAll_includeArchives_remetLesArchivesEnFin() {
        // Tri composé : archive ASC (false=0 < true=1) puis role ASC.
        // Note : RoleUtilisateur est mappé @Enumerated(STRING) → le tri est
        // ALPHABÉTIQUE (CAISSIER, MCD, RESPONSABLE_CAISSE) et non par
        // hiérarchie. Si on voulait le tri métier (MCD d'abord), il faudrait
        // un CASE WHEN ou EnumType.ORDINAL.
        persist("a-archive", "A", "A", RoleUtilisateur.MCD, true);
        persist("b-mcd",     "B", "B", RoleUtilisateur.MCD, false);
        persist("c-caissier", "C", "C", RoleUtilisateur.CAISSIER, false);
        flushAndClear();

        List<Utilisateur> result = repo.findAll(true);

        // Actifs d'abord (CAISSIER < MCD alphabétique), archivés en fin.
        assertThat(result).extracting(Utilisateur::getIdentifiant)
                .containsExactly("c-caissier", "b-mcd", "a-archive");
    }

    @Test
    void findAll_trieAlphabetiquementParRolePuisNom() {
        persist("c", "Z", "Z", RoleUtilisateur.MCD, false);
        persist("a", "B", "B", RoleUtilisateur.CAISSIER, false);
        persist("b", "A", "A", RoleUtilisateur.MCD, false);
        flushAndClear();

        List<Utilisateur> result = repo.findAll();

        assertThat(result).hasSize(3);
        // Tri global : CAISSIER, puis MCD (par nom A < Z).
        assertThat(result).extracting(Utilisateur::getIdentifiant)
                .containsExactly("a", "b", "c");
    }

    // ---------------------------------------------------------------------
    // existsByIdentifiant et excludeId
    // ---------------------------------------------------------------------

    @Test
    void existsByIdentifiant_trueSiPresent() {
        persist("mcd1", "X", "Y", RoleUtilisateur.MCD, false);
        flushAndClear();

        assertThat(repo.existsByIdentifiant("mcd1")).isTrue();
        assertThat(repo.existsByIdentifiant("autre")).isFalse();
    }

    @Test
    void existsByIdentifiant_inclutLesArchives() {
        // Régression possible : si on filtrait sur archive=false, on pourrait
        // créer un homonyme d'un compte archivé et casser un éventuel
        // désarchivage futur.
        persist("zombie", "X", "Y", RoleUtilisateur.MCD, true);
        flushAndClear();

        assertThat(repo.existsByIdentifiant("zombie")).isTrue();
    }

    @Test
    void existsByIdentifiant_excludeId_ignoreLeMatchSurLEnregistrementExclu() {
        // Cas d'usage : on modifie un utilisateur en gardant son identifiant.
        // Sans excludeId, la vérif d'unicité dirait « déjà pris » alors que
        // c'est l'utilisateur lui-même.
        Utilisateur u = persist("mcd1", "X", "Y", RoleUtilisateur.MCD, false);
        flushAndClear();

        assertThat(repo.existsByIdentifiant("mcd1", u.getId())).isFalse();
        assertThat(repo.existsByIdentifiant("mcd1", u.getId() + 999)).isTrue();
    }

    // ---------------------------------------------------------------------
    // save / update
    // ---------------------------------------------------------------------

    @Test
    void save_genereId() {
        Utilisateur u = new Utilisateur();
        u.setIdentifiant("nouveau");
        u.setMotDePasse("$2a$12$x");
        u.setNom("X"); u.setPrenom("Y");
        u.setRole(RoleUtilisateur.CAISSIER);

        repo.save(u);
        em.flush();

        assertThat(u.getId()).isNotNull();
    }

    @Test
    void update_metAJourLesChampsModifies() {
        Utilisateur u = persist("mcd1", "Avant", "X", RoleUtilisateur.MCD, false);
        flushAndClear();

        Utilisateur detache = repo.findById(u.getId()).orElseThrow();
        detache.setNom("Après");
        repo.update(detache);
        flushAndClear();

        assertThat(repo.findById(u.getId()).orElseThrow().getNom()).isEqualTo("Après");
    }
}
