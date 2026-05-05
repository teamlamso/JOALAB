package com.amael.joalabft_backend.model.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Représente un client du casino, identifié ou non.
 *
 * <p>Si {@code identifie = true} : les champs d'état civil et de pièce d'identité sont renseignés.
 * <p>Si {@code identifie = false} : seul {@code descriptionPhysique} est renseigné.
 */
@Entity
@Table(name = "clients")
public class Client {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private boolean identifie;

    // --- Informations personnelles (client identifié) ---

    @Column(length = 100)
    private String nom;

    @Column(length = 100)
    private String prenom;

    @Column(name = "date_naissance")
    private LocalDate dateNaissance;

    @Column(name = "lieu_naissance", length = 200)
    private String lieuNaissance;

    @Column(nullable = false)
    private boolean ppe;

    @Column(length = 200)
    private String rue;

    @Column(length = 100)
    private String complement;

    @Column(name = "code_postal", length = 10)
    private String codePostal;

    @Column(length = 100)
    private String ville;

    @Column(length = 100)
    private String pays;

    // --- Pièce d'identité (client identifié) ---

    @Column(name = "type_piece", length = 50)
    private String typePiece;

    @Column(name = "numero_piece", length = 50)
    private String numeroPiece;

    @Column(name = "date_delivrance")
    private LocalDate dateDelivrance;

    @Column(name = "prefecture_delivrance", length = 100)
    private String prefectureDelivrance;

    @Column(name = "pays_delivrance", length = 100)
    private String paysDelivrance;

    // --- Client non-identifié ---

    @Column(name = "description_physique", length = 500)
    private String descriptionPhysique;

    // --- Métadonnées ---

    @Column(name = "date_creation", nullable = false, updatable = false)
    private LocalDateTime dateCreation;

    @OneToMany(mappedBy = "client", fetch = FetchType.LAZY)
    private List<FicheLABFT> fiches = new ArrayList<>();

    @PrePersist
    private void onPrePersist() {
        dateCreation = LocalDateTime.now();
    }

    public Client() {}

    // --- Getters / Setters ---

    public Long getId() { return id; }

    public boolean isIdentifie() { return identifie; }
    public void setIdentifie(boolean identifie) { this.identifie = identifie; }

    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }

    public String getPrenom() { return prenom; }
    public void setPrenom(String prenom) { this.prenom = prenom; }

    public LocalDate getDateNaissance() { return dateNaissance; }
    public void setDateNaissance(LocalDate dateNaissance) { this.dateNaissance = dateNaissance; }

    public String getLieuNaissance() { return lieuNaissance; }
    public void setLieuNaissance(String lieuNaissance) { this.lieuNaissance = lieuNaissance; }

    public boolean isPpe() { return ppe; }
    public void setPpe(boolean ppe) { this.ppe = ppe; }

    public String getRue() { return rue; }
    public void setRue(String rue) { this.rue = rue; }

    public String getComplement() { return complement; }
    public void setComplement(String complement) { this.complement = complement; }

    public String getCodePostal() { return codePostal; }
    public void setCodePostal(String codePostal) { this.codePostal = codePostal; }

    public String getVille() { return ville; }
    public void setVille(String ville) { this.ville = ville; }

    public String getPays() { return pays; }
    public void setPays(String pays) { this.pays = pays; }

    public String getTypePiece() { return typePiece; }
    public void setTypePiece(String typePiece) { this.typePiece = typePiece; }

    public LocalDate getDateDelivrance() { return dateDelivrance; }
    public void setDateDelivrance(LocalDate dateDelivrance) { this.dateDelivrance = dateDelivrance; }

    public String getNumeroPiece() { return numeroPiece; }
    public void setNumeroPiece(String numeroPiece) { this.numeroPiece = numeroPiece; }

    public String getPrefectureDelivrance() { return prefectureDelivrance; }
    public void setPrefectureDelivrance(String prefectureDelivrance) { this.prefectureDelivrance = prefectureDelivrance; }

    public String getPaysDelivrance() { return paysDelivrance; }
    public void setPaysDelivrance(String paysDelivrance) { this.paysDelivrance = paysDelivrance; }

    public String getDescriptionPhysique() { return descriptionPhysique; }
    public void setDescriptionPhysique(String descriptionPhysique) { this.descriptionPhysique = descriptionPhysique; }

    public LocalDateTime getDateCreation() { return dateCreation; }

    public List<FicheLABFT> getFiches() { return fiches; }

    /**
     * Retourne le libellé d'affichage du client :
     * nom + prénom pour un client identifié, description physique sinon.
     */
    public String getLibelle() {
        if (identifie) {
            return prenom + " " + nom;
        }
        return descriptionPhysique;
    }
}
