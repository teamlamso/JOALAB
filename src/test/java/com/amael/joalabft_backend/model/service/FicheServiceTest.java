package com.amael.joalabft_backend.model.service;

import com.amael.joalabft_backend.model.dto.request.FicheRequest;
import com.amael.joalabft_backend.model.dto.request.LigneTransactionRequest;
import com.amael.joalabft_backend.model.entity.Client;
import com.amael.joalabft_backend.model.entity.FicheLABFT;
import com.amael.joalabft_backend.model.entity.LigneTransaction;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.repository.ClientRepository;
import com.amael.joalabft_backend.model.repository.FicheLABFTRepository;
import com.amael.joalabft_backend.model.util.WorkDay;
import com.amael.joalabft_backend.test.TestEntities;
import jakarta.ws.rs.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FicheServiceTest {

    @Mock FicheLABFTRepository ficheRepository;
    @Mock ClientRepository clientRepository;
    @Mock PermissionService permissionService;
    @Mock JournalService journalService;

    @InjectMocks FicheService service;

    private Utilisateur mcd;
    private Client client;

    @BeforeEach
    void setUp() {
        mcd = TestEntities.mcd(1);
        client = TestEntities.client(50L, "Dupont", "Marie");
    }

    // ── listFiches ────────────────────────────────────────────────

    @Test
    void listFiches_datesParDefaut_utiliseJourDeTravail() {
        when(ficheRepository.findWithFilters(any(), any(), any())).thenReturn(List.of());
        service.listFiches(null, null, null);
        verify(ficheRepository).findWithFilters(WorkDay.today(), WorkDay.today(), null);
    }

    // ── createFiche ───────────────────────────────────────────────

    @Test
    void createFiche_clientInconnu_leveNotFound() {
        FicheRequest req = new FicheRequest();
        req.clientId = 99L;
        when(clientRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.createFiche(req, mcd))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void createFiche_sansLignes_estAutorise() {
        FicheRequest req = new FicheRequest();
        req.clientId = 50L;
        req.lignes = List.of();
        when(clientRepository.findById(50L)).thenReturn(Optional.of(client));

        service.createFiche(req, mcd);

        verify(ficheRepository).save(any(FicheLABFT.class));
    }

    @Test
    void createFiche_avecUneLigne_persisteAvecLigne() {
        FicheRequest req = new FicheRequest();
        req.clientId = 50L;
        LigneTransactionRequest l = new LigneTransactionRequest();
        l.typeJeu = "MAS";
        l.typePaiement = "ESPECE";
        l.montantRGM = new BigDecimal("500");
        l.numeroSocle = 42;
        req.lignes = List.of(l);
        when(clientRepository.findById(50L)).thenReturn(Optional.of(client));

        service.createFiche(req, mcd);

        verify(ficheRepository).save(any(FicheLABFT.class));
    }

    // ── updateFiche ───────────────────────────────────────────────

    @Test
    void updateFiche_inexistante_leveNotFound() {
        when(ficheRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.updateFiche(99L, new FicheRequest(), mcd))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void updateFiche_suppressionLigne_retireLaLigneEtFlush() {
        // Setup : fiche en base avec 2 lignes (id=1, id=2).
        FicheLABFT fiche = TestEntities.fiche(7L, client, mcd, WorkDay.today().atStartOfDay());
        LigneTransaction l1 = TestEntities.ligne(1L, fiche);
        LigneTransaction l2 = TestEntities.ligne(2L, fiche);
        fiche.getLignes().add(l1);
        fiche.getLignes().add(l2);

        when(ficheRepository.findById(7L)).thenReturn(Optional.of(fiche));

        // Requête : on garde la ligne 1, on supprime la 2, on ajoute une nouvelle.
        FicheRequest req = new FicheRequest();
        LigneTransactionRequest garder = new LigneTransactionRequest();
        garder.id = 1L;
        garder.typeJeu = "MAS";
        LigneTransactionRequest nouvelle = new LigneTransactionRequest();
        nouvelle.id = null;
        nouvelle.typeJeu = "JTE";
        req.lignes = List.of(garder, nouvelle);

        service.updateFiche(7L, req, mcd);

        // La ligne 2 est bien retirée de la collection (orphan removal).
        assertThat(fiche.getLignes()).extracting(LigneTransaction::getId)
                .doesNotContain(2L);
        // flush() est appelé au moins deux fois : une fois APRÈS le removeIf
        // (pour faire partir le DELETE avant les INSERT) et une fois en fin
        // de méthode pour propager toutes les modifs avant le log d'audit.
        verify(ficheRepository, atLeast(2)).flush();
        // Plus de em.merge() : la fiche est managée par em.find, le commit
        // de la transaction JTA fait le reste.
        verify(ficheRepository, never()).update(fiche);
    }

    @Test
    void updateFiche_aucuneSuppression_flushUneSeuleFois() {
        FicheLABFT fiche = TestEntities.fiche(7L, client, mcd, WorkDay.today().atStartOfDay());
        LigneTransaction l1 = TestEntities.ligne(1L, fiche);
        fiche.getLignes().add(l1);
        when(ficheRepository.findById(7L)).thenReturn(Optional.of(fiche));

        FicheRequest req = new FicheRequest();
        LigneTransactionRequest garder = new LigneTransactionRequest();
        garder.id = 1L;
        garder.typeJeu = "MAS";
        req.lignes = List.of(garder);

        service.updateFiche(7L, req, mcd);

        // Pas de suppression : un seul flush en fin de méthode.
        verify(ficheRepository, times(1)).flush();
        verify(ficheRepository, never()).update(fiche);
    }

    @Test
    void updateFiche_metAJourDateModification() {
        FicheLABFT fiche = TestEntities.fiche(7L, client, mcd, WorkDay.today().atStartOfDay());
        when(ficheRepository.findById(7L)).thenReturn(Optional.of(fiche));

        FicheRequest req = new FicheRequest();
        req.lignes = List.of();
        service.updateFiche(7L, req, mcd);

        assertThat(fiche.getDateModification()).isNotNull();
        assertThat(fiche.getModifiePar()).isEqualTo(mcd);
    }

    // ── deleteFiche ───────────────────────────────────────────────

    @Test
    void deleteFiche_inexistante_leveNotFound() {
        when(ficheRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.deleteFiche(99L, mcd))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void deleteFiche_mcd_supprime() {
        FicheLABFT fiche = TestEntities.fiche(7L, client, mcd, WorkDay.today().atStartOfDay());
        when(ficheRepository.findById(7L)).thenReturn(Optional.of(fiche));

        service.deleteFiche(7L, mcd);

        verify(ficheRepository).delete(fiche);
    }

    @Test
    void deleteFiche_caissier_leveForbidden() {
        Utilisateur caissier = TestEntities.caissier(2);
        org.mockito.Mockito.doThrow(new jakarta.ws.rs.ForbiddenException("interdit"))
                .when(permissionService).ensurePeutSupprimerFiche(caissier);
        assertThatThrownBy(() -> service.deleteFiche(7L, caissier))
                .isInstanceOf(jakarta.ws.rs.ForbiddenException.class);
    }
}
