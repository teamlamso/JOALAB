package com.amael.joalabft_backend.test;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.EntityTransaction;
import jakarta.persistence.Persistence;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;

import java.lang.reflect.Field;

/**
 * Bootstrap minimal pour les tests d'intégration JPA :
 *  - une seule {@link EntityManagerFactory} par classe de test (le coût de
 *    construction d'EclipseLink est non négligeable, on l'amortit) ;
 *  - un {@link EntityManager} et une transaction par test, rollback en
 *    {@link #tearDown()} pour repartir d'une base vierge à chaque cas.
 *
 * <p>Les repositories de prod utilisent {@code @PersistenceContext} (injection
 * container). Comme on ne tourne pas dans un container ici, on injecte
 * l'EntityManager via réflection — c'est plus propre que d'exposer un setter
 * uniquement pour les tests.
 */
public abstract class JpaIntegrationBase {

    protected static EntityManagerFactory emf;
    protected EntityManager em;
    private EntityTransaction tx;

    @BeforeAll
    static void bootstrapEmf() {
        if (emf == null) {
            emf = Persistence.createEntityManagerFactory("LABFTPU-TEST");
        }
    }

    @AfterAll
    static void closeEmf() {
        // On ne ferme pas l'EMF entre les classes de test : H2 en mémoire
        // est partagée et la recréer à chaque classe coûterait gros sans
        // bénéfice (chaque test rollback son propre tx).
    }

    @BeforeEach
    void openEm() {
        em = emf.createEntityManager();
        tx = em.getTransaction();
        tx.begin();
    }

    @AfterEach
    void tearDown() {
        if (tx != null && tx.isActive()) {
            tx.rollback();  // garantit l'isolation entre tests
        }
        if (em != null && em.isOpen()) {
            em.close();
        }
    }

    /**
     * Force le flush + clear pour que la requête suivante traverse vraiment la
     * base au lieu de servir depuis le L1 cache de l'EM courant. Utile pour
     * détecter les régressions de JPQL qui passeraient si EclipseLink se
     * contentait du contexte de persistance.
     */
    protected void flushAndClear() {
        em.flush();
        em.clear();
    }

    /**
     * Injecte l'EntityManager dans le champ {@code em} du repository, qui est
     * normalement câblé par {@code @PersistenceContext} en production.
     */
    protected <T> T injectEm(T repository) {
        try {
            Field f = repository.getClass().getDeclaredField("em");
            f.setAccessible(true);
            f.set(repository, em);
            return repository;
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(
                    "Le repository " + repository.getClass().getSimpleName()
                    + " ne déclare pas un champ 'em' EntityManager", e);
        }
    }
}
