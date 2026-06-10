package com.amael.joalabft_backend.model.service;

import com.amael.joalabft_backend.model.dto.request.ClientIdentificationRequest;
import com.amael.joalabft_backend.model.dto.request.ClientRequest;
import com.amael.joalabft_backend.model.entity.Client;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.repository.ClientRepository;
import com.amael.joalabft_backend.model.repository.FicheLABFTRepository;
import com.amael.joalabft_backend.test.TestEntities;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClientServiceTest {

    @Mock ClientRepository clientRepository;
    @Mock FicheLABFTRepository ficheRepository;
    @Mock PermissionService permissionService;
    @Mock JournalService journalService;

    @InjectMocks ClientService service;

    private Utilisateur mcd;
    private Utilisateur caissier;

    @BeforeEach
    void setUp() {
        mcd = TestEntities.mcd(1);
        caissier = TestEntities.caissier(2);
    }

    @Test
    void listClients_appelleRepoEtDerniereActivite() {
        Client c = TestEntities.client(10L, "Dupont", "Marie");
        when(clientRepository.findAll("Mar")).thenReturn(List.of(c));
        when(clientRepository.getDerniereActivitePourIds(List.of(10L))).thenReturn(java.util.Map.of());

        assertThat(service.listClients("Mar")).hasSize(1);
    }

    @Test
    void getClient_inexistant_leveNotFound() {
        when(clientRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getClient(99L)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void getClient_existant_renvoieDetail() {
        Client c = TestEntities.client(10L, "Dupont", "Marie");
        when(clientRepository.findById(10L)).thenReturn(Optional.of(c));
        when(ficheRepository.findByClientId(10L)).thenReturn(List.of());

        var dto = service.getClient(10L);
        assertThat(dto.id).isEqualTo(10L);
        assertThat(dto.nom).isEqualTo("Dupont");
    }

    @Test
    void createClient_persisteEtRetourneId() {
        ClientRequest req = new ClientRequest();
        req.identifie = true;
        req.nom = "Dupont";
        req.prenom = "Jean";

        ArgumentCaptor<Client> captor = ArgumentCaptor.forClass(Client.class);
        service.createClient(req, mcd);

        verify(clientRepository).save(captor.capture());
        Client saved = captor.getValue();
        assertThat(saved.getNom()).isEqualTo("Dupont");
        assertThat(saved.getPrenom()).isEqualTo("Jean");
    }

    @Test
    void updateClient_caissier_leveForbidden() {
        org.mockito.Mockito.doThrow(new jakarta.ws.rs.ForbiddenException("interdit"))
                .when(permissionService).ensurePeutModifierClientComplet(caissier);
        ClientRequest req = new ClientRequest();
        assertThatThrownBy(() -> service.updateClient(10L, req, caissier))
                .isInstanceOf(jakarta.ws.rs.ForbiddenException.class);
    }

    @Test
    void updateClient_inexistant_leveNotFound() {
        when(clientRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.updateClient(99L, new ClientRequest(), mcd))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void updateClientIdentification_metAJourAdresseEtPiece() {
        Client c = TestEntities.client(10L, "Dupont", "Marie");
        when(clientRepository.findById(10L)).thenReturn(Optional.of(c));

        ClientIdentificationRequest req = new ClientIdentificationRequest();
        req.rue = "1 rue de la Paix";
        req.codePostal = "75002";
        req.ville = "Paris";
        req.pays = "France";
        req.typePiece = "CNI";
        req.numeroPiece = "123456";

        service.updateClientIdentification(10L, req, caissier);

        assertThat(c.getRue()).isEqualTo("1 rue de la Paix");
        assertThat(c.getNumeroPiece()).isEqualTo("123456");
        verify(clientRepository).update(c);
    }

    @Test
    void deleteClient_avecFiches_leveBadRequest() {
        Client c = TestEntities.client(10L, "Dupont", "Marie");
        when(clientRepository.findById(10L)).thenReturn(Optional.of(c));
        when(clientRepository.countFiches(10L)).thenReturn(3L);

        assertThatThrownBy(() -> service.deleteClient(10L, mcd))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("3 fiche");
    }

    @Test
    void deleteClient_sansFiches_supprime() {
        Client c = TestEntities.client(10L, "Dupont", "Marie");
        when(clientRepository.findById(10L)).thenReturn(Optional.of(c));
        when(clientRepository.countFiches(10L)).thenReturn(0L);

        service.deleteClient(10L, mcd);

        verify(clientRepository).delete(c);
    }

    @Test
    void deleteClient_inexistant_leveNotFound() {
        when(clientRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.deleteClient(99L, mcd))
                .isInstanceOf(NotFoundException.class);
    }

    // ---------------------------------------------------------------------
    // updateClientIdentification — branches lieu de naissance / dateN / ppe
    //
    // Ces tests couvrent les règles métier d'`appliquerAjustementsEtatCivil`
    // qui autorisent un CAISSIER à compléter ou corriger un état civil
    // partiel sans pouvoir le réécrire.
    // ---------------------------------------------------------------------

    @Test
    void updateClientIdentification_lieuNaissanceAbsent_estAjoute() {
        Client c = TestEntities.client(10L, "Dupont", "Marie");
        c.setLieuNaissance(null);
        when(clientRepository.findById(10L)).thenReturn(Optional.of(c));

        ClientIdentificationRequest req = new ClientIdentificationRequest();
        req.lieuNaissance = "Lyon (69)";

        service.updateClientIdentification(10L, req, caissier);

        assertThat(c.getLieuNaissance()).isEqualTo("Lyon (69)");
    }

    @Test
    void updateClientIdentification_lieuNaissanceIdentique_silencieux() {
        // Le frontend renvoie tout le formulaire, y compris la valeur inchangée.
        // On ne doit ni jeter ni journaliser un changement fictif.
        Client c = TestEntities.client(10L, "Dupont", "Marie");
        c.setLieuNaissance("Lyon (69)");
        when(clientRepository.findById(10L)).thenReturn(Optional.of(c));

        ClientIdentificationRequest req = new ClientIdentificationRequest();
        req.lieuNaissance = "Lyon (69)";

        service.updateClientIdentification(10L, req, caissier);

        assertThat(c.getLieuNaissance()).isEqualTo("Lyon (69)");
    }

    @Test
    void updateClientIdentification_lieuNonConformeEtMemeVille_corrige() {
        // BESANCON (FRANCE) → Besançon (25) : correction de format autorisée
        // au CAISSIER tant que la ville est la même (accents/casse ignorés).
        Client c = TestEntities.client(10L, "Dupont", "Marie");
        c.setLieuNaissance("BESANCON (FRANCE)");
        when(clientRepository.findById(10L)).thenReturn(Optional.of(c));

        ClientIdentificationRequest req = new ClientIdentificationRequest();
        req.lieuNaissance = "Besançon (25)";

        service.updateClientIdentification(10L, req, caissier);

        assertThat(c.getLieuNaissance()).isEqualTo("Besançon (25)");
    }

    @Test
    void updateClientIdentification_lieuNonConformeEtVilleDifferente_leveBadRequest() {
        Client c = TestEntities.client(10L, "Dupont", "Marie");
        c.setLieuNaissance("BESANCON (FRANCE)");
        when(clientRepository.findById(10L)).thenReturn(Optional.of(c));

        ClientIdentificationRequest req = new ClientIdentificationRequest();
        req.lieuNaissance = "Lyon (69)";

        assertThatThrownBy(() -> service.updateClientIdentification(10L, req, caissier))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("changer la ville")
                .hasMessageContaining("BESANCON (FRANCE)")
                .hasMessageContaining("Lyon (69)");
    }

    @Test
    void updateClientIdentification_lieuDejaConforme_leveBadRequestAvecMessage() {
        // Bug historique : un CAISSIER pouvait passer cette modif en silence.
        // On veut désormais un message explicite côté toast.
        Client c = TestEntities.client(10L, "Dupont", "Marie");
        c.setLieuNaissance("Lyon (69)");
        when(clientRepository.findById(10L)).thenReturn(Optional.of(c));

        ClientIdentificationRequest req = new ClientIdentificationRequest();
        req.lieuNaissance = "Lyon (75)";

        assertThatThrownBy(() -> service.updateClientIdentification(10L, req, caissier))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("déjà")
                .hasMessageContaining("Lyon (69)")
                .hasMessageContaining("Lyon (75)");
    }

    @Test
    void updateClientIdentification_franceMinuscule_estNonConforme() {
        // Régression : « (France) » en mixed-case était considéré conforme à
        // tort, ce qui empêchait toute correction par le CAISSIER.
        Client c = TestEntities.client(10L, "Dupont", "Marie");
        c.setLieuNaissance("Lons-le-Saunier (France)");
        when(clientRepository.findById(10L)).thenReturn(Optional.of(c));

        ClientIdentificationRequest req = new ClientIdentificationRequest();
        req.lieuNaissance = "Lons-le-Saunier (39)";

        service.updateClientIdentification(10L, req, caissier);

        assertThat(c.getLieuNaissance()).isEqualTo("Lons-le-Saunier (39)");
    }

    @Test
    void updateClientIdentification_lieuInternationalConforme_estProtege() {
        // « Tokyo (Japon) » est un format international valide → un CAISSIER
        // ne doit pas pouvoir le toucher, même vers une autre orthographe.
        Client c = TestEntities.client(10L, "Sato", "Akiko");
        c.setLieuNaissance("Tokyo (Japon)");
        when(clientRepository.findById(10L)).thenReturn(Optional.of(c));

        ClientIdentificationRequest req = new ClientIdentificationRequest();
        req.lieuNaissance = "Tōkyō (Japon)";

        assertThatThrownBy(() -> service.updateClientIdentification(10L, req, caissier))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("déjà");
    }

    @Test
    void updateClientIdentification_dateNaissanceAbsente_estAjoutee() {
        Client c = TestEntities.client(10L, "Dupont", "Marie");
        c.setDateNaissance(null);
        when(clientRepository.findById(10L)).thenReturn(Optional.of(c));

        ClientIdentificationRequest req = new ClientIdentificationRequest();
        req.dateNaissance = "1990-06-15";

        service.updateClientIdentification(10L, req, caissier);

        assertThat(c.getDateNaissance()).isEqualTo(java.time.LocalDate.of(1990, 6, 15));
    }

    @Test
    void updateClientIdentification_dateNaissanceDejaPresente_nEstPasEcrasee() {
        // Garde-fou : un CAISSIER ne doit pas pouvoir remplacer une date de
        // naissance déjà saisie, même en envoyant une autre date.
        Client c = TestEntities.client(10L, "Dupont", "Marie");
        c.setDateNaissance(java.time.LocalDate.of(1980, 1, 1));
        when(clientRepository.findById(10L)).thenReturn(Optional.of(c));

        ClientIdentificationRequest req = new ClientIdentificationRequest();
        req.dateNaissance = "1990-06-15";

        service.updateClientIdentification(10L, req, caissier);

        assertThat(c.getDateNaissance()).isEqualTo(java.time.LocalDate.of(1980, 1, 1));
    }

    @Test
    void updateClientIdentification_ppePasseDeFauxAVrai_estActive() {
        Client c = TestEntities.client(10L, "Dupont", "Marie");
        c.setPpe(false);
        when(clientRepository.findById(10L)).thenReturn(Optional.of(c));

        ClientIdentificationRequest req = new ClientIdentificationRequest();
        req.ppe = true;

        service.updateClientIdentification(10L, req, caissier);

        assertThat(c.isPpe()).isTrue();
    }

    @Test
    void updateClientIdentification_ppeFauxSurClientDejaPpe_nEstPasDesactive() {
        // Désactiver le flag PPE est une décision sensible réservée à un
        // responsable — un CAISSIER ne doit jamais l'enlever.
        Client c = TestEntities.client(10L, "Dupont", "Marie");
        c.setPpe(true);
        when(clientRepository.findById(10L)).thenReturn(Optional.of(c));

        ClientIdentificationRequest req = new ClientIdentificationRequest();
        req.ppe = false;

        service.updateClientIdentification(10L, req, caissier);

        assertThat(c.isPpe()).isTrue();
    }

    @Test
    void updateClientIdentification_ppeNull_neTouchePas() {
        Client c = TestEntities.client(10L, "Dupont", "Marie");
        c.setPpe(true);
        when(clientRepository.findById(10L)).thenReturn(Optional.of(c));

        ClientIdentificationRequest req = new ClientIdentificationRequest();
        req.ppe = null;

        service.updateClientIdentification(10L, req, caissier);

        assertThat(c.isPpe()).isTrue();
    }

    @Test
    void updateClientIdentification_inexistant_leveNotFound() {
        when(clientRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.updateClientIdentification(
                99L, new ClientIdentificationRequest(), caissier))
                .isInstanceOf(NotFoundException.class);
    }

    // ---------------------------------------------------------------------
    // Journalisation et helpers
    // ---------------------------------------------------------------------

    @Test
    void createClient_journaliseLAction() {
        ClientRequest req = new ClientRequest();
        req.identifie = true;
        req.nom = "Dupont";
        req.prenom = "Jean";

        service.createClient(req, mcd);

        verify(journalService).log(
                org.mockito.Mockito.eq(mcd),
                org.mockito.Mockito.eq(com.amael.joalabft_backend.model.enums.TypeActionJournal.CREATION),
                org.mockito.Mockito.eq(com.amael.joalabft_backend.model.enums.TypeEntiteJournal.CLIENT),
                any(),
                any(),
                org.mockito.Mockito.contains("Création"));
    }

    @Test
    void updateClient_mcd_metAJourEtJournalise() {
        Client c = TestEntities.client(10L, "Dupont", "Marie");
        when(clientRepository.findById(10L)).thenReturn(Optional.of(c));

        ClientRequest req = new ClientRequest();
        req.identifie = true;
        req.nom = "Martin";
        req.prenom = "Marie";

        service.updateClient(10L, req, mcd);

        assertThat(c.getNom()).isEqualTo("Martin");
        verify(clientRepository).update(c);
        verify(journalService).log(
                org.mockito.Mockito.eq(mcd),
                org.mockito.Mockito.eq(com.amael.joalabft_backend.model.enums.TypeActionJournal.MODIFICATION),
                org.mockito.Mockito.eq(com.amael.joalabft_backend.model.enums.TypeEntiteJournal.CLIENT),
                org.mockito.Mockito.eq(10L),
                any(),
                any());
    }

    @Test
    void findSimilar_delegueAuRepoEtRecharge() {
        Client c = TestEntities.client(20L, "Durand", "Paul");
        when(clientRepository.findSimilar(
                org.mockito.Mockito.eq("Durand"),
                org.mockito.Mockito.eq("Paul"),
                any(),
                org.mockito.Mockito.eq("ABC")))
                .thenReturn(List.of(c));
        when(clientRepository.findById(20L)).thenReturn(Optional.of(c));
        when(ficheRepository.findByClientId(20L)).thenReturn(List.of());

        ClientRequest req = new ClientRequest();
        req.nom = "Durand";
        req.prenom = "Paul";
        req.dateNaissance = "1985-03-20";
        req.numeroPiece = "ABC";

        var res = service.findSimilar(req);

        assertThat(res).hasSize(1);
        assertThat(res.get(0).id).isEqualTo(20L);
    }
}
