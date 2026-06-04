package com.amael.joalabft_backend.model.service;

import com.amael.joalabft_backend.model.dto.request.UtilisateurRequest;
import com.amael.joalabft_backend.model.dto.request.UtilisateurUpdateRequest;
import com.amael.joalabft_backend.model.dto.response.UtilisateurResponse;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.enums.RoleUtilisateur;
import com.amael.joalabft_backend.model.repository.UtilisateurRepository;
import com.amael.joalabft_backend.test.TestEntities;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UtilisateurServiceTest {

    @Mock UtilisateurRepository utilisateurRepository;
    @Mock PermissionService permissionService;
    @Mock JournalService journalService;
    @Mock SessionStore sessionStore;

    @InjectMocks UtilisateurService service;

    private Utilisateur mcd;

    @BeforeEach
    void setUp() {
        mcd = TestEntities.mcd(1);
    }

    // ── listUtilisateurs ──────────────────────────────────────────

    @Test
    void listUtilisateurs_appliqueLaPermission() {
        when(utilisateurRepository.findAll(false)).thenReturn(List.of(mcd));
        List<UtilisateurResponse> result = service.listUtilisateurs(mcd, false);
        assertThat(result).hasSize(1);
        verify(permissionService).ensurePeutListerUtilisateurs(mcd);
    }

    @Test
    void listUtilisateurs_archivesIgnoresPourNonMcd() {
        Utilisateur resp = TestEntities.responsable(2);
        when(utilisateurRepository.findAll(false)).thenReturn(List.of());
        service.listUtilisateurs(resp, true);
        // RESPONSABLE_CAISSE n'a pas le droit aux archives — findAll(true) ne doit pas être appelé.
        verify(utilisateurRepository, never()).findAll(true);
    }

    // ── createUtilisateur ─────────────────────────────────────────

    @Test
    void create_happyPath() {
        UtilisateurRequest req = new UtilisateurRequest();
        req.identifiant = "bob";
        req.motDePasse  = "p4ssw0rd";
        req.nom         = "Smith";
        req.prenom      = "Bob";
        req.role        = "CAISSIER";

        when(utilisateurRepository.existsByIdentifiant("bob")).thenReturn(false);

        UtilisateurResponse resp = service.createUtilisateur(req, mcd);

        assertThat(resp.identifiant).isEqualTo("bob");
        assertThat(resp.role).isEqualTo("CAISSIER");
        verify(utilisateurRepository).save(any(Utilisateur.class));
    }

    @Test
    void create_corpsNull_leveBadRequest() {
        assertThatThrownBy(() -> service.createUtilisateur(null, mcd))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void create_identifiantDejaPris_leveBadRequest() {
        UtilisateurRequest req = new UtilisateurRequest();
        req.identifiant = "bob"; req.motDePasse = "p"; req.nom = "S"; req.prenom = "B"; req.role = "CAISSIER";
        when(utilisateurRepository.existsByIdentifiant("bob")).thenReturn(true);

        assertThatThrownBy(() -> service.createUtilisateur(req, mcd))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("existe déjà");
    }

    @Test
    void create_roleInconnu_leveBadRequest() {
        UtilisateurRequest req = new UtilisateurRequest();
        req.identifiant = "bob"; req.motDePasse = "p"; req.nom = "S"; req.prenom = "B"; req.role = "WIZARD";

        assertThatThrownBy(() -> service.createUtilisateur(req, mcd))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Rôle inconnu");
    }

    @Test
    void create_champManquant_leveBadRequest() {
        UtilisateurRequest req = new UtilisateurRequest();
        req.identifiant = "bob";  // motDePasse, nom, prenom, role manquants
        assertThatThrownBy(() -> service.createUtilisateur(req, mcd))
                .isInstanceOf(BadRequestException.class);
    }

    // ── updateUtilisateur ─────────────────────────────────────────

    @Test
    void update_renomme_journaliseLeChangement() {
        Utilisateur cible = TestEntities.utilisateur(7L, "ancien", RoleUtilisateur.CAISSIER);
        when(utilisateurRepository.findById(7L)).thenReturn(Optional.of(cible));
        when(utilisateurRepository.existsByIdentifiant("nouveau", 7L)).thenReturn(false);
        when(utilisateurRepository.update(cible)).thenReturn(cible);

        UtilisateurUpdateRequest req = new UtilisateurUpdateRequest();
        req.identifiant = "nouveau";

        UtilisateurResponse out = service.updateUtilisateur(7L, req, mcd);

        assertThat(out.identifiant).isEqualTo("nouveau");
    }

    @Test
    void update_utilisateurArchive_leveBadRequest() {
        Utilisateur archive = TestEntities.utilisateur(7L, "old", RoleUtilisateur.CAISSIER);
        archive.setArchive(true);
        when(utilisateurRepository.findById(7L)).thenReturn(Optional.of(archive));

        UtilisateurUpdateRequest req = new UtilisateurUpdateRequest();
        req.nom = "X";

        assertThatThrownBy(() -> service.updateUtilisateur(7L, req, mcd))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("archivé");
    }

    @Test
    void update_inexistant_leveNotFound() {
        when(utilisateurRepository.findById(99L)).thenReturn(Optional.empty());
        UtilisateurUpdateRequest req = new UtilisateurUpdateRequest();
        req.nom = "X";
        assertThatThrownBy(() -> service.updateUtilisateur(99L, req, mcd))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void update_mcdSeRetrogradeLuiMeme_leveBadRequest() {
        when(utilisateurRepository.findById(1L)).thenReturn(Optional.of(mcd));
        UtilisateurUpdateRequest req = new UtilisateurUpdateRequest();
        req.role = "CAISSIER";
        assertThatThrownBy(() -> service.updateUtilisateur(1L, req, mcd))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("propre rôle MCD");
    }

    // ── archiverUtilisateur ───────────────────────────────────────

    @Test
    void archiver_happyPath_invalideLesSessions() {
        Utilisateur cible = TestEntities.utilisateur(7L, "carl", RoleUtilisateur.CAISSIER);
        when(utilisateurRepository.findById(7L)).thenReturn(Optional.of(cible));
        when(utilisateurRepository.update(cible)).thenReturn(cible);

        service.archiverUtilisateur(7L, mcd);

        assertThat(cible.isArchive()).isTrue();
        verify(sessionStore).invalidateByUtilisateurId(7L);
    }

    @Test
    void archiver_dejaArchive_idempotent() {
        Utilisateur cible = TestEntities.utilisateur(7L, "carl", RoleUtilisateur.CAISSIER);
        cible.setArchive(true);
        when(utilisateurRepository.findById(7L)).thenReturn(Optional.of(cible));

        service.archiverUtilisateur(7L, mcd);

        verify(utilisateurRepository, never()).update(cible);
        verify(sessionStore, never()).invalidateByUtilisateurId(any());
    }

    @Test
    void archiver_inexistant_leveNotFound() {
        when(utilisateurRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.archiverUtilisateur(99L, mcd))
                .isInstanceOf(NotFoundException.class);
    }

    // ── desarchiverUtilisateur ────────────────────────────────────

    @Test
    void desarchiver_happyPath_resetFlagEtJournalise() {
        Utilisateur cible = TestEntities.utilisateur(7L, "carl", RoleUtilisateur.CAISSIER);
        cible.setArchive(true);
        when(utilisateurRepository.findById(7L)).thenReturn(Optional.of(cible));
        when(utilisateurRepository.update(cible)).thenReturn(cible);

        service.desarchiverUtilisateur(7L, mcd);

        assertThat(cible.isArchive()).isFalse();
    }

    @Test
    void desarchiver_dejaActif_idempotent() {
        Utilisateur cible = TestEntities.utilisateur(7L, "carl", RoleUtilisateur.CAISSIER);
        // archive = false par défaut
        when(utilisateurRepository.findById(7L)).thenReturn(Optional.of(cible));

        service.desarchiverUtilisateur(7L, mcd);

        verify(utilisateurRepository, never()).update(cible);
    }

    @Test
    void desarchiver_inexistant_leveNotFound() {
        when(utilisateurRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.desarchiverUtilisateur(99L, mcd))
                .isInstanceOf(NotFoundException.class);
    }
}
