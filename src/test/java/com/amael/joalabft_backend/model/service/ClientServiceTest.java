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
}
