package com.amael.joalabft_backend.test;

import com.amael.joalabft_backend.model.entity.Client;
import com.amael.joalabft_backend.model.entity.FicheLABFT;
import com.amael.joalabft_backend.model.entity.LigneTransaction;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.enums.RoleUtilisateur;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Fabriques d'entités pour les tests. Les identifiants étant générés par la
 * base, on les injecte ici par réflection — c'est pragmatique pour faire passer
 * des objets « managed look-alike » à du code qui s'appuie sur {@code getId()}.
 */
public final class TestEntities {

    private TestEntities() {}

    public static Utilisateur utilisateur(Long id, String identifiant, RoleUtilisateur role) {
        Utilisateur u = new Utilisateur();
        u.setIdentifiant(identifiant);
        u.setMotDePasse("$2a$12$placeholder");
        u.setNom("Doe");
        u.setPrenom("John");
        u.setRole(role);
        setId(u, "id", id);
        return u;
    }

    public static Utilisateur mcd(long id) {
        return utilisateur(id, "mcd" + id, RoleUtilisateur.MCD);
    }

    public static Utilisateur responsable(long id) {
        return utilisateur(id, "resp" + id, RoleUtilisateur.RESPONSABLE_CAISSE);
    }

    public static Utilisateur caissier(long id) {
        return utilisateur(id, "caissier" + id, RoleUtilisateur.CAISSIER);
    }

    public static Client client(Long id, String nom, String prenom) {
        Client c = new Client();
        c.setIdentifie(true);
        c.setNom(nom);
        c.setPrenom(prenom);
        c.setDateNaissance(LocalDate.of(1980, 1, 1));
        c.setLieuNaissance("Paris");
        setId(c, "id", id);
        return c;
    }

    public static FicheLABFT fiche(Long id, Client client, Utilisateur creePar, LocalDateTime dateCreation) {
        FicheLABFT f = new FicheLABFT();
        f.setClient(client);
        f.setCreePar(creePar);
        f.setDateCreation(dateCreation);
        setId(f, "id", id);
        return f;
    }

    public static LigneTransaction ligne(Long id, FicheLABFT fiche) {
        LigneTransaction l = new LigneTransaction();
        l.setFiche(fiche);
        setId(l, "id", id);
        return l;
    }

    private static void setId(Object entity, String fieldName, Object value) {
        try {
            Field f = entity.getClass().getDeclaredField(fieldName);
            f.setAccessible(true);
            f.set(entity, value);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Impossible de positionner " + fieldName, e);
        }
    }
}
