package com.amael.joalabft_backend.model.repository;

import com.amael.joalabft_backend.model.entity.JournalAction;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.enums.RoleUtilisateur;
import com.amael.joalabft_backend.model.enums.TypeActionJournal;
import com.amael.joalabft_backend.model.enums.TypeEntiteJournal;
import com.amael.joalabft_backend.test.JpaIntegrationBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests d'intégration JPA pour {@link JournalActionRepository}.
 *
 * <p>Append-only : on vérifie surtout les tris (du plus récent au plus ancien),
 * le filtre par entité, et que la borne {@code limit} fonctionne.
 */
class JournalActionRepositoryTest extends JpaIntegrationBase {

    private JournalActionRepository repo;

    @BeforeEach
    void inject() {
        repo = injectEm(new JournalActionRepository());
    }

    private Utilisateur persistUtilisateur(String identifiant) {
        Utilisateur u = new Utilisateur();
        u.setIdentifiant(identifiant);
        u.setMotDePasse("$2a$12$x");
        u.setNom("X"); u.setPrenom("Y");
        u.setRole(RoleUtilisateur.MCD);
        em.persist(u);
        em.flush();
        return u;
    }

    private JournalAction persistEntry(Utilisateur u, TypeActionJournal action,
                                       TypeEntiteJournal typeEntite, Long entiteId,
                                       LocalDateTime horodatage, String description) {
        JournalAction j = new JournalAction();
        j.setUtilisateur(u);
        j.setAction(action);
        j.setTypeEntite(typeEntite);
        j.setEntiteId(entiteId);
        // horodatage est protégé par @PrePersist (qui le laisse tel quel s'il
        // est déjà posé) — on le pose par réflection puisque l'entité
        // n'expose pas de setter (champ append-only en prod).
        setField(j, "horodatage", horodatage);
        j.setDescription(description);
        em.persist(j);
        em.flush();
        return j;
    }

    private static void setField(Object o, String field, Object value) {
        try {
            var f = o.getClass().getDeclaredField(field);
            f.setAccessible(true);
            f.set(o, value);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    // ---------------------------------------------------------------------
    // findAll : tri DESC sur horodatage puis id
    // ---------------------------------------------------------------------

    @Test
    void findAll_trieLesEntreesDuPlusRecentAuPlusAncien() {
        Utilisateur u = persistUtilisateur("mcd1");
        persistEntry(u, TypeActionJournal.CREATION, TypeEntiteJournal.CLIENT, 1L,
                LocalDateTime.of(2026, 6, 1, 12, 0), "ancien");
        persistEntry(u, TypeActionJournal.MODIFICATION, TypeEntiteJournal.CLIENT, 1L,
                LocalDateTime.of(2026, 6, 10, 12, 0), "recent");
        flushAndClear();

        List<JournalAction> result = repo.findAll(10);

        assertThat(result).extracting(JournalAction::getDescription)
                .containsExactly("recent", "ancien");
    }

    @Test
    void findAll_horodatageIdentique_trieParIdDecroissant() {
        // Garde-fou : sans le tri secondaire par id, deux entrées créées
        // dans la même milliseconde apparaîtraient dans un ordre indéterminé,
        // ce qui rend l'export d'audit non reproductible.
        Utilisateur u = persistUtilisateur("mcd1");
        LocalDateTime t = LocalDateTime.of(2026, 6, 10, 12, 0);
        JournalAction j1 = persistEntry(u, TypeActionJournal.CREATION, TypeEntiteJournal.CLIENT, 1L, t, "premier");
        JournalAction j2 = persistEntry(u, TypeActionJournal.MODIFICATION, TypeEntiteJournal.CLIENT, 1L, t, "second");
        flushAndClear();

        List<JournalAction> result = repo.findAll(10);

        assertThat(result.get(0).getId()).isEqualTo(j2.getId());
        assertThat(result.get(1).getId()).isEqualTo(j1.getId());
    }

    @Test
    void findAll_limit_borneLesResultats() {
        Utilisateur u = persistUtilisateur("mcd1");
        for (int i = 0; i < 5; i++) {
            persistEntry(u, TypeActionJournal.CREATION, TypeEntiteJournal.CLIENT, (long) i,
                    LocalDateTime.of(2026, 6, 1 + i, 12, 0), "e" + i);
        }
        flushAndClear();

        assertThat(repo.findAll(3)).hasSize(3);
        assertThat(repo.findAll(10)).hasSize(5);
    }

    // ---------------------------------------------------------------------
    // findByEntite : filtre par type + id
    // ---------------------------------------------------------------------

    @Test
    void findByEntite_filtreSurLeCoupleTypeEtId() {
        Utilisateur u = persistUtilisateur("mcd1");
        persistEntry(u, TypeActionJournal.CREATION, TypeEntiteJournal.CLIENT, 42L,
                LocalDateTime.of(2026, 6, 1, 12, 0), "client 42");
        persistEntry(u, TypeActionJournal.MODIFICATION, TypeEntiteJournal.CLIENT, 42L,
                LocalDateTime.of(2026, 6, 10, 12, 0), "client 42 modifié");
        persistEntry(u, TypeActionJournal.CREATION, TypeEntiteJournal.CLIENT, 99L,
                LocalDateTime.of(2026, 6, 5, 12, 0), "client 99 — pas concerné");
        persistEntry(u, TypeActionJournal.CREATION, TypeEntiteJournal.FICHE, 42L,
                LocalDateTime.of(2026, 6, 5, 12, 0), "fiche 42 — autre type");
        flushAndClear();

        List<JournalAction> result = repo.findByEntite(TypeEntiteJournal.CLIENT, 42L);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(JournalAction::getDescription)
                .containsExactly("client 42 modifié", "client 42");
    }

    @Test
    void findByEntite_entiteSansTrace_renvoieListeVide() {
        Utilisateur u = persistUtilisateur("mcd1");
        persistEntry(u, TypeActionJournal.CREATION, TypeEntiteJournal.CLIENT, 1L,
                LocalDateTime.of(2026, 6, 1, 12, 0), "x");
        flushAndClear();

        assertThat(repo.findByEntite(TypeEntiteJournal.CLIENT, 999L)).isEmpty();
    }

    // ---------------------------------------------------------------------
    // save : persiste l'entrée
    // ---------------------------------------------------------------------

    @Test
    void save_persisteLEntreeAvecToutesSesProprietes() {
        Utilisateur u = persistUtilisateur("mcd1");
        JournalAction j = new JournalAction();
        j.setUtilisateur(u);
        j.setAction(TypeActionJournal.CREATION);
        j.setTypeEntite(TypeEntiteJournal.CLIENT);
        j.setEntiteId(42L);
        setField(j, "horodatage", LocalDateTime.of(2026, 6, 10, 12, 0));
        j.setLibelleEntite("Dupont M.");
        j.setDescription("Création client");

        repo.save(j);
        em.flush();
        flushAndClear();

        List<JournalAction> result = repo.findAll(10);
        assertThat(result).hasSize(1);
        JournalAction loaded = result.get(0);
        assertThat(loaded.getAction()).isEqualTo(TypeActionJournal.CREATION);
        assertThat(loaded.getTypeEntite()).isEqualTo(TypeEntiteJournal.CLIENT);
        assertThat(loaded.getEntiteId()).isEqualTo(42L);
        assertThat(loaded.getLibelleEntite()).isEqualTo("Dupont M.");
        assertThat(loaded.getUtilisateur().getIdentifiant()).isEqualTo("mcd1");
    }
}
