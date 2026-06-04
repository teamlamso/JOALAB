package com.amael.joalabft_backend.model.service;

import com.amael.joalabft_backend.model.entity.FicheLABFT;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.enums.RoleUtilisateur;
import com.amael.joalabft_backend.model.util.WorkDay;
import com.amael.joalabft_backend.test.TestEntities;
import jakarta.ws.rs.ForbiddenException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;

class PermissionServiceTest {

    private PermissionService service;

    @BeforeEach
    void setUp() {
        service = new PermissionService();
    }

    // ── peutModifierFiche ─────────────────────────────────────────

    @Test
    void mcd_peutModifierFicheAncienne() {
        Utilisateur mcd = TestEntities.mcd(1);
        assertThat(service.peutModifierFiche(mcd, LocalDate.now().minusYears(1))).isTrue();
    }

    @Test
    void caissier_peutModifierFicheDeLaVeille() {
        Utilisateur caissier = TestEntities.caissier(1);
        assertThat(service.peutModifierFiche(caissier, WorkDay.today().minusDays(1))).isTrue();
    }

    @Test
    void caissier_nePeutPasModifierFicheDe2JoursOuPlus() {
        Utilisateur caissier = TestEntities.caissier(1);
        assertThat(service.peutModifierFiche(caissier, WorkDay.today().minusDays(2))).isFalse();
    }

    @Test
    void responsable_peutModifierFicheDeMoinsDe31Jours() {
        Utilisateur resp = TestEntities.responsable(1);
        assertThat(service.peutModifierFiche(resp, WorkDay.today().minusDays(30))).isTrue();
    }

    @Test
    void responsable_nePeutPasModifierFicheDePlusDe31Jours() {
        Utilisateur resp = TestEntities.responsable(1);
        assertThat(service.peutModifierFiche(resp, WorkDay.today().minusDays(32))).isFalse();
    }

    @Test
    void peutModifierFiche_dateFutureRefusee() {
        Utilisateur mcd = TestEntities.mcd(1);
        // Un MCD passe toujours (true) → la garde n'est testée que pour les autres rôles.
        Utilisateur caissier = TestEntities.caissier(2);
        assertThat(service.peutModifierFiche(caissier, WorkDay.today().plusDays(1))).isFalse();
        assertThat(service.peutModifierFiche(mcd,      WorkDay.today().plusDays(1))).isTrue();
    }

    @Test
    void ensurePeutModifierFiche_refus_leveForbidden() {
        Utilisateur caissier = TestEntities.caissier(1);
        FicheLABFT vieille = TestEntities.fiche(1L, null, caissier, WorkDay.today().minusDays(5).atStartOfDay());
        assertThatThrownBy(() -> service.ensurePeutModifierFiche(caissier, vieille))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void ensurePeutModifierFiche_autorise_neLevePas() {
        Utilisateur mcd = TestEntities.mcd(1);
        FicheLABFT vieille = TestEntities.fiche(1L, null, mcd, WorkDay.today().minusYears(1).atStartOfDay());
        assertThatCode(() -> service.ensurePeutModifierFiche(mcd, vieille)).doesNotThrowAnyException();
    }

    // ── peutSupprimerFiche / Client ──────────────────────────────

    @Test
    void seulMcd_peutSupprimerFiche() {
        assertThat(service.peutSupprimerFiche(TestEntities.mcd(1))).isTrue();
        assertThat(service.peutSupprimerFiche(TestEntities.responsable(1))).isFalse();
        assertThat(service.peutSupprimerFiche(TestEntities.caissier(1))).isFalse();
        assertThat(service.peutSupprimerFiche(null)).isFalse();
    }

    @Test
    void seulMcd_peutSupprimerClient() {
        assertThat(service.peutSupprimerClient(TestEntities.mcd(1))).isTrue();
        assertThat(service.peutSupprimerClient(TestEntities.responsable(1))).isFalse();
        assertThat(service.peutSupprimerClient(TestEntities.caissier(1))).isFalse();
    }

    // ── peutModifierClientComplet ────────────────────────────────

    @Test
    void responsableEtMcd_peuventModifierClientComplet() {
        assertThat(service.peutModifierClientComplet(TestEntities.mcd(1))).isTrue();
        assertThat(service.peutModifierClientComplet(TestEntities.responsable(1))).isTrue();
        assertThat(service.peutModifierClientComplet(TestEntities.caissier(1))).isFalse();
    }

    // ── peutCreerUtilisateur ─────────────────────────────────────

    @Test
    void mcd_peutCreerTousLesRoles() {
        Utilisateur mcd = TestEntities.mcd(1);
        for (RoleUtilisateur r : RoleUtilisateur.values()) {
            assertThat(service.peutCreerUtilisateur(mcd, r)).isTrue();
        }
    }

    @Test
    void responsable_peutCreerSeulementCaissier() {
        Utilisateur resp = TestEntities.responsable(1);
        assertThat(service.peutCreerUtilisateur(resp, RoleUtilisateur.CAISSIER)).isTrue();
        assertThat(service.peutCreerUtilisateur(resp, RoleUtilisateur.RESPONSABLE_CAISSE)).isFalse();
        assertThat(service.peutCreerUtilisateur(resp, RoleUtilisateur.MCD)).isFalse();
    }

    @Test
    void caissier_neCreeAucunUtilisateur() {
        Utilisateur caissier = TestEntities.caissier(1);
        for (RoleUtilisateur r : RoleUtilisateur.values()) {
            assertThat(service.peutCreerUtilisateur(caissier, r)).isFalse();
        }
    }

    // ── peutArchiverUtilisateur ──────────────────────────────────

    @Test
    void mcd_nePeutPasSAutoArchiver() {
        Utilisateur mcd = TestEntities.mcd(1);
        assertThatThrownBy(() -> service.ensurePeutArchiverUtilisateur(mcd, mcd))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("propre compte");
    }

    @Test
    void mcd_peutArchiverUnAutreCompte() {
        Utilisateur mcd = TestEntities.mcd(1);
        Utilisateur autre = TestEntities.caissier(2);
        assertThatCode(() -> service.ensurePeutArchiverUtilisateur(mcd, autre))
                .doesNotThrowAnyException();
    }

    @Test
    void nonMcd_neArchivePas() {
        Utilisateur resp = TestEntities.responsable(1);
        Utilisateur cible = TestEntities.caissier(2);
        assertThatThrownBy(() -> service.ensurePeutArchiverUtilisateur(resp, cible))
                .isInstanceOf(ForbiddenException.class);
    }

    // ── peutLireJournal / peutLireHistoriqueFiche / peutImporter ─

    @Test
    void seulMcd_litLeJournal() {
        assertThat(service.peutLireJournal(TestEntities.mcd(1))).isTrue();
        assertThat(service.peutLireJournal(TestEntities.responsable(1))).isFalse();
        assertThat(service.peutLireJournal(TestEntities.caissier(1))).isFalse();
    }

    @Test
    void responsableEtMcd_lisentHistoriqueFiche() {
        assertThat(service.peutLireHistoriqueFiche(TestEntities.mcd(1))).isTrue();
        assertThat(service.peutLireHistoriqueFiche(TestEntities.responsable(1))).isTrue();
        assertThat(service.peutLireHistoriqueFiche(TestEntities.caissier(1))).isFalse();
    }

    @Test
    void responsableEtMcd_importentClients() {
        assertThat(service.peutImporterClients(TestEntities.mcd(1))).isTrue();
        assertThat(service.peutImporterClients(TestEntities.responsable(1))).isTrue();
        assertThat(service.peutImporterClients(TestEntities.caissier(1))).isFalse();
    }
}
