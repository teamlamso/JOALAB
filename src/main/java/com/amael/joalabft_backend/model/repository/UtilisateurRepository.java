package com.amael.joalabft_backend.model.repository;

import com.amael.joalabft_backend.model.entity.Utilisateur;
import jakarta.ejb.Stateless;
import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import jakarta.persistence.PersistenceContext;

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
}
