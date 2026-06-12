package com.amael.joalabft_backend.model.entity;

import com.amael.joalabft_backend.model.enums.RoleUtilisateur;
import jakarta.persistence.*;

@Entity
@Table(name = "utilisateurs")
public class Utilisateur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String identifiant;

    @Column(name = "mot_de_passe", nullable = false, length = 100)
    private String motDePasse;

    @Column(nullable = false, length = 50)
    private String nom;

    @Column(nullable = false, length = 50)
    private String prenom;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RoleUtilisateur role;

    /**
     * Soft-delete : un utilisateur archivé n'apparaît plus dans les listes,
     * ne peut plus se connecter, mais reste référencé par les fiches et lignes
     * de transaction historiques afin de préserver l'intégrité de l'audit.
     */
    @Column(nullable = false)
    private boolean archive = false;

    public Utilisateur() {}

    public Long getId() { return id; }

    public String getIdentifiant() { return identifiant; }
    public void setIdentifiant(String identifiant) { this.identifiant = identifiant; }

    public String getMotDePasse() { return motDePasse; }
    public void setMotDePasse(String motDePasse) { this.motDePasse = motDePasse; }

    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }

    public String getPrenom() { return prenom; }
    public void setPrenom(String prenom) { this.prenom = prenom; }

    public RoleUtilisateur getRole() { return role; }
    public void setRole(RoleUtilisateur role) { this.role = role; }

    public boolean isArchive() { return archive; }
    public void setArchive(boolean archive) { this.archive = archive; }

    /** Retourne le nom complet affiché dans l'interface (ex : "Alexis Duchat"). */
    public String getNomComplet() {
        return prenom + " " + nom;
    }
}
