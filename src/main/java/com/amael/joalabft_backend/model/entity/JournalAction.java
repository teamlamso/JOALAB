package com.amael.joalabft_backend.model.entity;

import com.amael.joalabft_backend.model.enums.TypeActionJournal;
import com.amael.joalabft_backend.model.enums.TypeEntiteJournal;
import com.amael.joalabft_backend.model.util.WorkDay;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "journal_actions")
public class JournalAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "utilisateur_id")
    private Utilisateur utilisateur;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TypeActionJournal action;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_entite", nullable = false, length = 20)
    private TypeEntiteJournal typeEntite;

    @Column(name = "entite_id")
    private Long entiteId;

    @Column(name = "libelle_entite", length = 200)
    private String libelleEntite;

    @Column(length = 2000)
    private String description;

    @Column(nullable = false, updatable = false)
    private LocalDateTime horodatage;

    @PrePersist
    private void onPrePersist() {
        if (horodatage == null) horodatage = WorkDay.now();
    }

    public JournalAction() {}

    public Long getId() { return id; }

    public Utilisateur getUtilisateur() { return utilisateur; }
    public void setUtilisateur(Utilisateur utilisateur) { this.utilisateur = utilisateur; }

    public TypeActionJournal getAction() { return action; }
    public void setAction(TypeActionJournal action) { this.action = action; }

    public TypeEntiteJournal getTypeEntite() { return typeEntite; }
    public void setTypeEntite(TypeEntiteJournal typeEntite) { this.typeEntite = typeEntite; }

    public Long getEntiteId() { return entiteId; }
    public void setEntiteId(Long entiteId) { this.entiteId = entiteId; }

    public String getLibelleEntite() { return libelleEntite; }
    public void setLibelleEntite(String libelleEntite) { this.libelleEntite = libelleEntite; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getHorodatage() { return horodatage; }
}
