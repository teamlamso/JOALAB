package com.amael.joalabft_backend.model.entity;

import com.amael.joalabft_backend.model.enums.TypeChange;
import com.amael.joalabft_backend.model.enums.TypeJeu;
import com.amael.joalabft_backend.model.enums.TypePaiement;
import jakarta.persistence.*;

import java.math.BigDecimal;

@Entity
@Table(name = "lignes_transaction")
public class LigneTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "fiche_id", nullable = false)
    private FicheLABFT fiche;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "caissier_id")
    private Utilisateur caissier;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_jeu", length = 10)
    private TypeJeu typeJeu;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_paiement", length = 10)
    private TypePaiement typePaiement;

    /** Type de support de change — facultatif selon la transaction. */
    @Enumerated(EnumType.STRING)
    @Column(name = "type_change", length = 10)
    private TypeChange typeChange;

    /** Numéro de socle de la machine (MAS) — facultatif. */
    @Column(name = "numero_socle")
    private Integer numeroSocle;

    /** Montant Online / RGM (Recette Globale Machine). */
    @Column(name = "montant_rgm", precision = 12, scale = 2)
    private BigDecimal montantRGM;

    @Column(name = "change_entrant", precision = 12, scale = 2)
    private BigDecimal changeEntrant;

    @Column(name = "change_sortant", precision = 12, scale = 2)
    private BigDecimal changeSortant;

    @Column(length = 500)
    private String observations;

    /** Coché par le caissier une fois que le montant RGM a été reporté dans
     *  FrontCage (logiciel de caisse externe). N'a de sens que si
     *  {@link #montantRGM} est renseigné. */
    @Column(name = "enregistre_front_cage", nullable = false)
    private boolean enregistreFrontCage;

    /** Idem mais pour le change entrant (logiciel FrontCage distinct du report
     *  RGM côté caisse). N'a de sens que si {@link #changeEntrant} est renseigné. */
    @Column(name = "enregistre_front_cage_entrant", nullable = false)
    private boolean enregistreFrontCageEntrant;

    public LigneTransaction() {}

    // --- Getters / Setters ---

    public Long getId() { return id; }

    public FicheLABFT getFiche() { return fiche; }
    public void setFiche(FicheLABFT fiche) { this.fiche = fiche; }

    public Utilisateur getCaissier() { return caissier; }
    public void setCaissier(Utilisateur caissier) { this.caissier = caissier; }

    public TypeJeu getTypeJeu() { return typeJeu; }
    public void setTypeJeu(TypeJeu typeJeu) { this.typeJeu = typeJeu; }

    public TypePaiement getTypePaiement() { return typePaiement; }
    public void setTypePaiement(TypePaiement typePaiement) { this.typePaiement = typePaiement; }

    public TypeChange getTypeChange() { return typeChange; }
    public void setTypeChange(TypeChange typeChange) { this.typeChange = typeChange; }

    public Integer getNumeroSocle() { return numeroSocle; }
    public void setNumeroSocle(Integer numeroSocle) { this.numeroSocle = numeroSocle; }

    public BigDecimal getMontantRGM() { return montantRGM; }
    public void setMontantRGM(BigDecimal montantRGM) { this.montantRGM = montantRGM; }

    public BigDecimal getChangeEntrant() { return changeEntrant; }
    public void setChangeEntrant(BigDecimal changeEntrant) { this.changeEntrant = changeEntrant; }

    public BigDecimal getChangeSortant() { return changeSortant; }
    public void setChangeSortant(BigDecimal changeSortant) { this.changeSortant = changeSortant; }

    public String getObservations() { return observations; }
    public void setObservations(String observations) { this.observations = observations; }

    public boolean isEnregistreFrontCage() { return enregistreFrontCage; }
    public void setEnregistreFrontCage(boolean enregistreFrontCage) { this.enregistreFrontCage = enregistreFrontCage; }

    public boolean isEnregistreFrontCageEntrant() { return enregistreFrontCageEntrant; }
    public void setEnregistreFrontCageEntrant(boolean v) { this.enregistreFrontCageEntrant = v; }
}
