package com.amael.joalabft_backend.model.service;

import com.amael.joalabft_backend.model.entity.JournalAction;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.enums.TypeActionJournal;
import com.amael.joalabft_backend.model.enums.TypeEntiteJournal;
import com.amael.joalabft_backend.model.repository.JournalActionRepository;
import com.amael.joalabft_backend.test.TestEntities;
import jakarta.ws.rs.ForbiddenException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JournalServiceTest {

    @Mock JournalActionRepository repository;
    @Mock PermissionService permissionService;

    @InjectMocks JournalService service;

    private Utilisateur mcd;
    private Utilisateur caissier;

    @BeforeEach
    void setUp() {
        mcd = TestEntities.mcd(1);
        caissier = TestEntities.caissier(2);
    }

    @Test
    void log_creeUneEntreeAvecLesChampsAttendus() {
        service.log(mcd, TypeActionJournal.CREATION, TypeEntiteJournal.FICHE,
                42L, "Fiche 42", "Création de la fiche");

        ArgumentCaptor<JournalAction> captor = ArgumentCaptor.forClass(JournalAction.class);
        verify(repository).save(captor.capture());

        JournalAction saved = captor.getValue();
        assertThat(saved.getUtilisateur()).isEqualTo(mcd);
        assertThat(saved.getAction()).isEqualTo(TypeActionJournal.CREATION);
        assertThat(saved.getTypeEntite()).isEqualTo(TypeEntiteJournal.FICHE);
        assertThat(saved.getEntiteId()).isEqualTo(42L);
        assertThat(saved.getLibelleEntite()).isEqualTo("Fiche 42");
        assertThat(saved.getDescription()).isEqualTo("Création de la fiche");
    }

    @Test
    void listGlobal_mcd_renvoieListe() {
        when(repository.findAll(500)).thenReturn(List.of());
        assertThat(service.listGlobal(mcd)).isEmpty();
    }

    @Test
    void listGlobal_nonMcd_leveForbidden() {
        // Le PermissionService réel lèverait : ici on mocke son ensure pour le simuler.
        doThrowForbidden().when(permissionService).ensurePeutLireJournal(caissier);
        assertThatThrownBy(() -> service.listGlobal(caissier)).isInstanceOf(ForbiddenException.class);
    }

    @Test
    void listHistoriqueFiche_caissier_leveForbidden() {
        doThrowForbidden().when(permissionService).ensurePeutLireHistoriqueFiche(caissier);
        assertThatThrownBy(() -> service.listHistoriqueFiche(1L, caissier))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void listHistoriqueFiche_responsable_renvoieListe() {
        Utilisateur resp = TestEntities.responsable(3);
        when(repository.findByEntite(TypeEntiteJournal.FICHE, 7L)).thenReturn(List.of());
        assertThat(service.listHistoriqueFiche(7L, resp)).isEmpty();
    }

    private static org.mockito.stubbing.Stubber doThrowForbidden() {
        return org.mockito.Mockito.doThrow(new ForbiddenException("refusé"));
    }
}
