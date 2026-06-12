package com.amael.joalabft_backend.model.repository;

import com.amael.joalabft_backend.model.entity.Utilisateur;
import jakarta.ejb.Stateless;
import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import jakarta.persistence.PersistenceContext;

import java.util.List;
import java.util.Optional;

/**
 * Accès aux données des {@link Utilisateur}.
 */
@Stateless
public class UtilisateurRepository {

    @PersistenceContext(unitName = "LABFTPU")
    private EntityManager em;

    /** Recherche un utilisateur par son identifiant de connexion. */
    public Optional<Utilisateur> findByIdentifiant(String identifiant) {
        try {
            Utilisateur u = em.createQuery(
                    "SELECT u FROM Utilisateur u WHERE u.identifiant = :id",
                    Utilisateur.class
            ).setParameter("id", identifiant).getSingleResult();
            return Optional.of(u);
        } catch (NoResultException e) {
            return Optional.empty();
        }
    }

    /** Recherche un utilisateur par sa clé primaire. */
    public Optional<Utilisateur> findById(Long id) {
        return Optional.ofNullable(em.find(Utilisateur.class, id));
    }

    /** Persiste un nouvel utilisateur. */
    public Utilisateur save(Utilisateur utilisateur) {
        em.persist(utilisateur);
        return utilisateur;
    }

    /** Met à jour un utilisateur attaché ou détaché. */
    public Utilisateur update(Utilisateur utilisateur) {
        return em.merge(utilisateur);
    }

    public List<Utilisateur> findAll(boolean includeArchives) {
        String jpql = includeArchives
                ? "SELECT u FROM Utilisateur u ORDER BY u.archive ASC, u.role ASC, u.nom ASC, u.prenom ASC"
                : "SELECT u FROM Utilisateur u WHERE u.archive = false ORDER BY u.role ASC, u.nom ASC, u.prenom ASC";
        return em.createQuery(jpql, Utilisateur.class).getResultList();
    }

    /** Raccourci historique : ne renvoie que les comptes actifs. */
    public List<Utilisateur> findAll() {
        return findAll(false);
    }

    public boolean existsByIdentifiant(String identifiant, Long excludeId) {
        String jpql = "SELECT COUNT(u) FROM Utilisateur u WHERE u.identifiant = :id"
                + (excludeId != null ? " AND u.id <> :excludeId" : "");
        var query = em.createQuery(jpql, Long.class).setParameter("id", identifiant);
        if (excludeId != null) query.setParameter("excludeId", excludeId);
        return query.getSingleResult() > 0;
    }

    /** Vrai si un utilisateur avec cet identifiant existe déjà (toutes lignes confondues). */
    public boolean existsByIdentifiant(String identifiant) {
        return existsByIdentifiant(identifiant, null);
    }
}
