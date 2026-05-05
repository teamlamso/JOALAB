package com.amael.joalabft_backend.model.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Fiche LAB-FT (Lutte Anti-Blanchiment et contre le Financement du Terrorisme).
 *
 * <p>Une fiche regroupe N {@link LigneTransaction} pour un client donné sur une même journée.
 * Les fiches dont le total dépasse 2000 € doivent être inscrites dans les registres officiels.
 */
@Entity
@Table(name = "fiches_labft")
public class FicheLABFT {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "cree_par_id", nullable = false)
    private Utilisateur creePar;

    @Column(name = "date_creation", nullable = false, updatable = false)
    private LocalDateTime dateCreation;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "modifie_par_id")
    private Utilisateur modifiePar;

    @Column(name = "date_modification")
    private LocalDateTime dateModification;

    @OneToMany(mappedBy = "fiche", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("id ASC")
    private List<LigneTransaction> lignes = new ArrayList<>();

    @PrePersist
    private void onPrePersist() {
        if (dateCreation == null) {
            dateCreation = LocalDateTime.now();
        }
    }

    public FicheLABFT() {}

    // --- Getters / Setters ---

    public Long getId() { return id; }

    public Client getClient() { return client; }
    public void setClient(Client client) { this.client = client; }

    public Utilisateur getCreePar() { return creePar; }
    public void setCreePar(Utilisateur creePar) { this.creePar = creePar; }

    public LocalDateTime getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDateTime dateCreation) { this.dateCreation = dateCreation; }

    public Utilisateur getModifiePar() { return modifiePar; }
    public void setModifiePar(Utilisateur modifiePar) { this.modifiePar = modifiePar; }

    public LocalDateTime getDateModification() { return dateModification; }
    public void setDateModification(LocalDateTime dateModification) { this.dateModification = dateModification; }

    public List<LigneTransaction> getLignes() { return lignes; }

    /** Ajoute une ligne et maintient la relation bidirectionnelle. */
    public void addLigne(LigneTransaction ligne) {
        ligne.setFiche(this);
        lignes.add(ligne);
    }

    /** Remplace toutes les lignes existantes (utilisé pour la mise à jour). */
    public void replaceLignes(List<LigneTransaction> nouvelles) {
        lignes.clear();
        nouvelles.forEach(l -> {
            l.setFiche(this);
            lignes.add(l);
        });
    }

    /**
     * Retourne la journée de travail de la fiche.
     * Une journée commence à 06h00 et se termine à 05h59 le lendemain.
     * Une fiche créée avant 06h00 appartient au jour précédent.
     */
    public LocalDate getDate() {
        if (dateCreation == null) return null;
        return dateCreation.getHour() < 6
                ? dateCreation.toLocalDate().minusDays(1)
                : dateCreation.toLocalDate();
    }

    /** Somme du montant RGM de toutes les lignes. */
    public BigDecimal getTotalRGM() {
        return lignes.stream()
                .filter(l -> l.getMontantRGM() != null)
                .map(LigneTransaction::getMontantRGM)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** Somme du change entrant de toutes les lignes. */
    public BigDecimal getTotalChangeEntrant() {
        return lignes.stream()
                .filter(l -> l.getChangeEntrant() != null)
                .map(LigneTransaction::getChangeEntrant)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** Somme du change sortant de toutes les lignes. */
    public BigDecimal getTotalChangeSortant() {
        return lignes.stream()
                .filter(l -> l.getChangeSortant() != null)
                .map(LigneTransaction::getChangeSortant)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
