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
        normaliserChamps();
    }

    @PreUpdate
    private void onPreUpdate() {
        normaliserChamps();
    }

    /**
     * Normalise les champs à chaque persistance / mise à jour pour que
     * l'application affiche systématiquement le format canonique « Prénom NOM ».
     * Le {@code nom} passe en majuscules, le {@code prenom} en titlecase
     * (« jean-pierre » devient « Jean-Pierre »).
     */
    private void normaliserChamps() {
        if (nom != null) nom = nom.toUpperCase();
        if (prenom != null) prenom = titleCase(prenom);
    }

    private static String titleCase(String s) {
        if (s == null || s.isEmpty()) return s;
        StringBuilder sb = new StringBuilder(s.length());
        boolean upperNext = true;
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if (Character.isWhitespace(ch) || ch == '-' || ch == '\'') {
                sb.append(ch);
                upperNext = true;
            } else {
                sb.append(upperNext ? Character.toUpperCase(ch) : Character.toLowerCase(ch));
                upperNext = false;
            }
        }
        return sb.toString();
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
     * Retourne le libellé d'affichage du client : « Prénom NOM » (nom de
     * famille en capitales) pour un client identifié, description physique
     * sinon. Format appliqué partout dans l'application.
     */
    public String getLibelle() {
        if (identifie) {
            String p = prenom == null ? "" : prenom;
            String n = nom    == null ? "" : nom.toUpperCase();
            return (p + " " + n).trim();
        }
        return descriptionPhysique;
    }

    /**
     * Indique si la fiche client est complète : tous les champs nécessaires
     * pour produire une fiche LAB-FT (état civil, pièce d'identité, adresse)
     * sont renseignés. Utilisé pour afficher un avertissement « À compléter »
     * sur les clients importés en masse depuis un Excel.
     */
    public boolean isComplet() {
        return getChampsManquants().isEmpty();
    }

    /**
     * Liste détaillée des champs qui manquent pour qu'un client soit considéré
     * comme complet. Les noms retournés correspondent aux clés des champs côté
     * front pour pouvoir les surligner dans le formulaire (ex. {@code "rue"},
     * {@code "typePiece"}…). La liste est vide si le client est complet.
     */
    public List<String> getChampsManquants() {
        List<String> manquants = new ArrayList<>();
        if (!identifie) {
            if (!notBlank(descriptionPhysique)) manquants.add("descriptionPhysique");
            return manquants;
        }
        if (!notBlank(nom))              manquants.add("nom");
        if (!notBlank(prenom))           manquants.add("prenom");
        if (dateNaissance == null)       manquants.add("dateNaissance");
        if (!notBlank(lieuNaissance))    manquants.add("lieuNaissance");
        if (!notBlank(typePiece))        manquants.add("typePiece");
        if (!notBlank(numeroPiece))      manquants.add("numeroPiece");
        if (dateDelivrance == null)      manquants.add("dateDelivrance");
        if (!notBlank(paysDelivrance) && !notBlank(prefectureDelivrance))
                                         manquants.add("origineDelivrance");
        if (!notBlank(rue))              manquants.add("rue");
        if (!notBlank(codePostal))       manquants.add("codePostal");
        if (!notBlank(ville))            manquants.add("ville");
        if (!notBlank(pays))             manquants.add("pays");
        return manquants;
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
