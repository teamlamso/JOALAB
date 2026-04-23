package com.amael.joalabft_backend.model.repository;

import com.amael.joalabft_backend.model.entity.Client;
import jakarta.ejb.Stateless;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Accès aux données des {@link Client}.
 */
@Stateless
public class ClientRepository {

    @PersistenceContext(unitName = "LABFTPU")
    private EntityManager em;

    /**
     * Retourne tous les clients identifiés, triés par nom puis prénom.
     * Si {@code search} est fourni, filtre sur nom, prénom ou description physique.
     */
    public List<Client> findAll(String search) {
        if (search == null || search.isBlank()) {
            return em.createQuery(
                    "SELECT c FROM Client c ORDER BY c.nom ASC, c.prenom ASC",
                    Client.class
            ).getResultList();
        }
        String param = "%" + search.toLowerCase() + "%";
        return em.createQuery(
                "SELECT c FROM Client c WHERE " +
                "LOWER(c.nom) LIKE :p OR LOWER(c.prenom) LIKE :p " +
                "OR LOWER(c.descriptionPhysique) LIKE :p " +
                "ORDER BY c.nom ASC, c.prenom ASC",
                Client.class
        ).setParameter("p", param).getResultList();
    }

    /** Retourne le client par son identifiant, ou {@link Optional#empty()} s'il n'existe pas. */
    public Optional<Client> findById(Long id) {
        return Optional.ofNullable(em.find(Client.class, id));
    }

    /** Persiste un nouveau client et force la génération de l'ID. */
    public Client save(Client client) {
        em.persist(client);
        em.flush();
        return client;
    }

    /** Fusionne les modifications d'un client existant. */
    public Client update(Client client) {
        return em.merge(client);
    }

    /**
     * Retourne la date de la dernière fiche créée pour un client,
     * ou {@code null} s'il n'en a aucune.
     */
    public LocalDate getDerniereActivite(Long clientId) {
        TypedQuery<LocalDateTime> q = em.createQuery(
                "SELECT MAX(f.dateCreation) FROM FicheLABFT f WHERE f.client.id = :id",
                LocalDateTime.class
        );
        q.setParameter("id", clientId);
        LocalDateTime result = q.getSingleResult();
        return result != null ? result.toLocalDate() : null;
    }
}
