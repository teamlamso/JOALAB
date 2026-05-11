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

    /** Persiste un nouvel utilisateur. */
    public Utilisateur save(Utilisateur utilisateur) {
        em.persist(utilisateur);
        return utilisateur;
    }

    /** Retourne tous les utilisateurs triés par rôle (MCD, RESPONSABLE_CAISSE, CAISSIER) puis nom + prénom. */
    public List<Utilisateur> findAll() {
        return em.createQuery(
                "SELECT u FROM Utilisateur u ORDER BY u.role ASC, u.nom ASC, u.prenom ASC",
                Utilisateur.class
        ).getResultList();
    }

    /** Vrai si un utilisateur avec cet identifiant existe déjà. */
    public boolean existsByIdentifiant(String identifiant) {
        Long count = em.createQuery(
                "SELECT COUNT(u) FROM Utilisateur u WHERE u.identifiant = :id",
                Long.class
        ).setParameter("id", identifiant).getSingleResult();
        return count > 0;
    }
}
