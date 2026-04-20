package com.amael.joalabft_backend.model.repository;

import com.amael.joalabft_backend.model.entity.FicheLABFT;
import jakarta.ejb.Stateless;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

/**
 * Accès aux données des {@link FicheLABFT}.
 */
@Stateless
public class FicheLABFTRepository {

    @PersistenceContext(unitName = "LABFTPU")
    private EntityManager em;

    /**
     * Recherche les fiches dans une plage de dates, avec filtre texte optionnel
     * sur le nom, prénom ou description physique du client.
     *
     * @param from     date de début (incluse)
     * @param to       date de fin (incluse)
     * @param search   terme de recherche (nullable)
     */
    public List<FicheLABFT> findWithFilters(LocalDate from, LocalDate to, String search) {
        LocalDateTime debut = LocalDateTime.of(from, LocalTime.MIDNIGHT);
        LocalDateTime fin   = LocalDateTime.of(to.plusDays(1), LocalTime.MIDNIGHT);

        String jpql;
        TypedQuery<FicheLABFT> q;

        if (search == null || search.isBlank()) {
            jpql = "SELECT f FROM FicheLABFT f " +
                   "WHERE f.dateCreation >= :debut AND f.dateCreation < :fin " +
                   "ORDER BY f.dateCreation DESC";
            q = em.createQuery(jpql, FicheLABFT.class);
        } else {
            String param = "%" + search.toLowerCase() + "%";
            jpql = "SELECT f FROM FicheLABFT f JOIN f.client c " +
                   "WHERE f.dateCreation >= :debut AND f.dateCreation < :fin " +
                   "AND (LOWER(c.nom) LIKE :p OR LOWER(c.prenom) LIKE :p " +
                   "OR LOWER(c.descriptionPhysique) LIKE :p) " +
                   "ORDER BY f.dateCreation DESC";
            q = em.createQuery(jpql, FicheLABFT.class);
            q.setParameter("p", param);
        }

        q.setParameter("debut", debut);
        q.setParameter("fin", fin);
        return q.getResultList();
    }

    /** Retourne toutes les fiches d'un client, triées par date de création décroissante. */
    public List<FicheLABFT> findByClientId(Long clientId) {
        return em.createQuery(
                "SELECT f FROM FicheLABFT f WHERE f.client.id = :id ORDER BY f.dateCreation DESC",
                FicheLABFT.class
        ).setParameter("id", clientId).getResultList();
    }

    /** Retourne une fiche par son identifiant, ou {@link Optional#empty()}. */
    public Optional<FicheLABFT> findById(Long id) {
        return Optional.ofNullable(em.find(FicheLABFT.class, id));
    }

    /** Persiste une nouvelle fiche. */
    public FicheLABFT save(FicheLABFT fiche) {
        em.persist(fiche);
        return fiche;
    }

    /** Fusionne les modifications d'une fiche existante. */
    public FicheLABFT update(FicheLABFT fiche) {
        return em.merge(fiche);
    }
}
