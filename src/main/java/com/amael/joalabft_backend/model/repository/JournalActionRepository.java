package com.amael.joalabft_backend.model.repository;

import com.amael.joalabft_backend.model.entity.JournalAction;
import com.amael.joalabft_backend.model.enums.TypeEntiteJournal;
import jakarta.ejb.Stateless;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.util.List;

@Stateless
public class JournalActionRepository {

    @PersistenceContext(unitName = "LABFTPU")
    private EntityManager em;

    /** Persiste une nouvelle entrée du journal. */
    public JournalAction save(JournalAction entry) {
        em.persist(entry);
        return entry;
    }

    public List<JournalAction> findAll(int limit) {
        return em.createQuery(
                "SELECT j FROM JournalAction j ORDER BY j.horodatage DESC, j.id DESC",
                JournalAction.class
        ).setMaxResults(limit).getResultList();
    }

    public List<JournalAction> findByEntite(TypeEntiteJournal typeEntite, Long entiteId) {
        return em.createQuery(
                "SELECT j FROM JournalAction j " +
                "WHERE j.typeEntite = :type AND j.entiteId = :id " +
                "ORDER BY j.horodatage DESC, j.id DESC",
                JournalAction.class
        ).setParameter("type", typeEntite)
         .setParameter("id", entiteId)
         .getResultList();
    }
}
