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

@Stateless
public class FicheLABFTRepository {

    @PersistenceContext(unitName = "LABFTPU")
    private EntityManager em;

    private static final LocalTime DEBUT_JOURNEE = LocalTime.of(6, 0);

    public List<FicheLABFT> findWithFilters(LocalDate from, LocalDate to, String search) {
        LocalDateTime debut = LocalDateTime.of(from, DEBUT_JOURNEE);
        LocalDateTime fin   = LocalDateTime.of(to.plusDays(1), DEBUT_JOURNEE);

        StringBuilder jpql = new StringBuilder(
                "SELECT f FROM FicheLABFT f JOIN f.client c " +
                "WHERE f.dateCreation >= :debut AND f.dateCreation < :fin");

        String[] tokens = (search == null || search.isBlank())
                ? new String[0]
                : search.trim().toLowerCase().split("\\s+");

        for (int i = 0; i < tokens.length; i++) {
            jpql.append(" AND (LOWER(c.nom) LIKE :p").append(i)
                .append(" OR LOWER(c.prenom) LIKE :p").append(i)
                .append(" OR LOWER(c.descriptionPhysique) LIKE :p").append(i)
                .append(")");
        }
        jpql.append(" ORDER BY COALESCE(f.dateModification, f.dateCreation) DESC");

        TypedQuery<FicheLABFT> q = em.createQuery(jpql.toString(), FicheLABFT.class);
        q.setParameter("debut", debut);
        q.setParameter("fin", fin);
        for (int i = 0; i < tokens.length; i++) {
            q.setParameter("p" + i, "%" + tokens[i] + "%");
        }
        return q.getResultList();
    }

    /** Retourne toutes les fiches d'un client, triées par date de création décroissante. */
    public List<FicheLABFT> findByClientId(Long clientId) {
        return em.createQuery(
                "SELECT f FROM FicheLABFT f WHERE f.client.id = :id ORDER BY COALESCE(f.dateModification, f.dateCreation) DESC",
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

    public void flush() {
        em.flush();
    }

    /** Supprime une fiche (les lignes sont supprimées en cascade). */
    public void delete(FicheLABFT fiche) {
        em.remove(em.contains(fiche) ? fiche : em.merge(fiche));
    }
}
