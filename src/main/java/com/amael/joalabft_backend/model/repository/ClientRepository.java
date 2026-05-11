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
     * Si {@code search} est fourni, le terme est découpé en mots (séparés par des espaces) ;
     * chaque mot doit matcher au moins l'un des champs nom, prénom ou description physique
     * (combinaison AND entre mots, OR entre champs). Cela permet de retrouver "Alexis Duchat"
     * ou "Duchat Alexis" indifféremment.
     */
    public List<Client> findAll(String search) {
        if (search == null || search.isBlank()) {
            return em.createQuery(
                    "SELECT c FROM Client c ORDER BY c.nom ASC, c.prenom ASC",
                    Client.class
            ).getResultList();
        }
        String[] tokens = search.trim().toLowerCase().split("\\s+");
        StringBuilder jpql = new StringBuilder("SELECT c FROM Client c WHERE ");
        for (int i = 0; i < tokens.length; i++) {
            if (i > 0) jpql.append(" AND ");
            jpql.append("(LOWER(c.nom) LIKE :p").append(i)
                .append(" OR LOWER(c.prenom) LIKE :p").append(i)
                .append(" OR LOWER(c.descriptionPhysique) LIKE :p").append(i)
                .append(")");
        }
        jpql.append(" ORDER BY c.nom ASC, c.prenom ASC");
        TypedQuery<Client> q = em.createQuery(jpql.toString(), Client.class);
        for (int i = 0; i < tokens.length; i++) {
            q.setParameter("p" + i, "%" + tokens[i] + "%");
        }
        return q.getResultList();
    }

    /** Retourne le client par son identifiant, ou {@link Optional#empty()} s'il n'existe pas. */
    public Optional<Client> findById(Long id) {
        return Optional.ofNullable(em.find(Client.class, id));
    }

    /**
     * Recherche les clients identifiés susceptibles de correspondre à un nouvel
     * enregistrement, sur la base de :
     *   - nom + prénom + date de naissance (correspondance exacte sur les 3),
     *   - ou numéro de pièce d'identité (correspondance exacte).
     * Permet de détecter les doublons potentiels.
     */
    public List<Client> findSimilar(String nom, String prenom, LocalDate dateNaissance, String numeroPiece) {
        return em.createQuery(
                "SELECT c FROM Client c WHERE c.identifie = true AND (" +
                "  (LOWER(c.nom) = :nom AND LOWER(c.prenom) = :prenom AND c.dateNaissance = :dateNaissance) " +
                "  OR (:numeroPiece IS NOT NULL AND c.numeroPiece = :numeroPiece) " +
                ")",
                Client.class
        )
        .setParameter("nom", nom != null ? nom.toLowerCase() : "")
        .setParameter("prenom", prenom != null ? prenom.toLowerCase() : "")
        .setParameter("dateNaissance", dateNaissance)
        .setParameter("numeroPiece", numeroPiece != null && !numeroPiece.isBlank() ? numeroPiece : null)
        .getResultList();
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

    /** Supprime un client. L'appelant doit s'assurer que le client n'a pas de fiches associées. */
    public void delete(Client client) {
        em.remove(em.contains(client) ? client : em.merge(client));
    }

    /** Compte le nombre de fiches associées à un client (utile avant suppression). */
    public long countFiches(Long clientId) {
        return em.createQuery(
                "SELECT COUNT(f) FROM FicheLABFT f WHERE f.client.id = :id",
                Long.class
        ).setParameter("id", clientId).getSingleResult();
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
