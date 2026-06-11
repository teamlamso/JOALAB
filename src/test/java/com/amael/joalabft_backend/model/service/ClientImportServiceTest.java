package com.amael.joalabft_backend.model.service;

import com.amael.joalabft_backend.model.dto.response.ImportClientsResponse;
import com.amael.joalabft_backend.model.entity.Client;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.repository.ClientRepository;
import com.amael.joalabft_backend.test.TestEntities;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ForbiddenException;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.CreationHelper;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.util.Date;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Couvre le parser d'import Excel : entêtes insensibles à la casse et aux
 * accents, dates aux multiples formats, parsing de l'adresse multi-lignes
 * ou monoligne, dédoublonnage, et fallback vers GeoService / AdresseService.
 *
 * <p>Les workbooks sont construits en mémoire avec Apache POI plutôt que
 * lus depuis des fixtures sur disque — ça garde les tests autonomes et
 * facilite l'expression de chaque cas borderline.
 */
@ExtendWith(MockitoExtension.class)
class ClientImportServiceTest {

    @Mock ClientRepository clientRepository;
    @Mock PermissionService permissionService;
    @Mock JournalService journalService;
    @Mock GeoService geoService;
    @Mock AdresseService adresseService;

    @InjectMocks ClientImportService service;

    private Utilisateur responsable;

    @BeforeEach
    void setUp() {
        responsable = TestEntities.responsable(1);
        // Par défaut, geoService ne reformate rien — chaque test qui en a
        // besoin stubbera son comportement explicite.
        lenient().when(geoService.formatVilleFrance(anyString())).thenReturn(null);
        // findSimilar n'est consulté que pour les clients ayant nom + prénom
        // + date OU un numéro de pièce. Beaucoup de tests n'atteignent pas
        // cette branche — on stubbe lenient pour éviter de surcharger chaque
        // test avec un when() qui serait inutile.
        lenient().when(clientRepository.findSimilar(any(), any(), any(), any()))
                .thenReturn(List.of());
    }

    // ---------------------------------------------------------------------
    // Permissions et erreurs de structure
    // ---------------------------------------------------------------------

    @Test
    void roleNonAutorise_leveForbidden() {
        org.mockito.Mockito.doThrow(new ForbiddenException("interdit"))
                .when(permissionService).ensurePeutImporterClients(any());

        Utilisateur caissier = TestEntities.caissier(2);
        assertThatThrownBy(() -> service.importer(emptyStream(), caissier))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void fichierIllisible_leveBadRequest() {
        // Un stream contenant n'importe quoi qui n'est pas un classeur valide.
        InputStream broken = new ByteArrayInputStream("pas un xlsx".getBytes());

        assertThatThrownBy(() -> service.importer(broken, responsable))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Impossible de lire");
    }

    @Test
    void fichierVide_leveBadRequest() throws Exception {
        // Classeur valide mais avec aucune ligne du tout : on attend une
        // erreur explicite plutôt qu'un import vide.
        byte[] xls = workbook(wb -> { wb.createSheet("Clients"); });

        assertThatThrownBy(() -> service.importer(new ByteArrayInputStream(xls), responsable))
                .isInstanceOf(BadRequestException.class);
    }

    // ---------------------------------------------------------------------
    // Parcours nominal : un client identifié, complet
    // ---------------------------------------------------------------------

    @Test
    void importNominal_creeUnClientEtJournalise() throws Exception {
        byte[] xls = workbook(wb -> {
            Sheet s = wb.createSheet("Clients");
            ecrireLigne(s, 0,
                    "Prénom", "Nom de famille", "Date de naissance", "PPE",
                    "PI Numéro", "PI Type de document", "PI Date de délivrance",
                    "PI Ville de délivrance", "PI Pays de délivrance",
                    "PI Ville de naissance", "PI Pays de naissance", "Adresse 1");
            ecrireLigne(s, 1,
                    "Jean", "Dupont", "01/06/1985", "Non",
                    "ABC123", "CNI", "01/01/2020",
                    "Paris", "France",
                    "Lyon", "France",
                    "1 rue de la Paix\n75002 Paris\nFrance");
        });


        ImportClientsResponse r = service.importer(new ByteArrayInputStream(xls), responsable);

        assertThat(r.imported).isEqualTo(1);
        assertThat(r.skipped).isZero();
        assertThat(r.errors).isEmpty();

        ArgumentCaptor<Client> cap = ArgumentCaptor.forClass(Client.class);
        verify(clientRepository).save(cap.capture());
        Client c = cap.getValue();
        assertThat(c.getNom()).isEqualTo("Dupont");
        assertThat(c.getPrenom()).isEqualTo("Jean");
        assertThat(c.getDateNaissance()).isEqualTo(LocalDate.of(1985, 6, 1));
        assertThat(c.getTypePiece()).isEqualTo("CNI");
        assertThat(c.getRue()).isEqualTo("1 rue de la Paix");
        assertThat(c.getCodePostal()).isEqualTo("75002");
        assertThat(c.getVille()).isEqualTo("Paris");
        assertThat(c.getPays()).isEqualTo("France");

        verify(journalService).log(eq(responsable), any(), any(), any(), any(),
                org.mockito.Mockito.contains("Import"));
    }

    // ---------------------------------------------------------------------
    // Headers : insensibilité aux accents, à la casse, aux espaces
    // ---------------------------------------------------------------------

    @Test
    void headersInsensibles_aLaCasseEtAuxAccents() throws Exception {
        // L'export typique Microsoft Dynamics envoie « PRENOM » sans accent
        // ni casse normale. Le parser doit s'aligner.
        byte[] xls = workbook(wb -> {
            Sheet s = wb.createSheet("Clients");
            ecrireLigne(s, 0,
                    "PRENOM", "NOM DE FAMILLE", "DATE DE NAISSANCE");
            ecrireLigne(s, 1, "Marie", "Martin", "15/03/1990");
        });

        ImportClientsResponse r = service.importer(new ByteArrayInputStream(xls), responsable);

        assertThat(r.imported).isEqualTo(1);
        ArgumentCaptor<Client> cap = ArgumentCaptor.forClass(Client.class);
        verify(clientRepository).save(cap.capture());
        assertThat(cap.getValue().getPrenom()).isEqualTo("Marie");
        assertThat(cap.getValue().getDateNaissance()).isEqualTo(LocalDate.of(1990, 3, 15));
    }

    @Test
    void headersAvecEspacesInsecables_sontReconnus() throws Exception {
        // Export Excel chargé en NBSP (U+00A0) ou autres séparateurs Unicode
        // dans les headers — bug rencontré en prod, le parser doit le tolérer.
        byte[] xls = workbook(wb -> {
            Sheet s = wb.createSheet("Clients");
            ecrireLigne(s, 0, "Prénom", "Nom de famille", "Date de naissance");
            ecrireLigne(s, 1, "Marie", "Martin", "15/03/1990");
        });

        ImportClientsResponse r = service.importer(new ByteArrayInputStream(xls), responsable);

        assertThat(r.imported).isEqualTo(1);
    }

    // ---------------------------------------------------------------------
    // Lignes vides et identités absentes : ignorées sans erreur
    // ---------------------------------------------------------------------

    @Test
    void ligneEntierementVide_estIgnoreeSansErreur() throws Exception {
        byte[] xls = workbook(wb -> {
            Sheet s = wb.createSheet("Clients");
            ecrireLigne(s, 0, "Prénom", "Nom de famille");
            ecrireLigne(s, 1, "Marie", "Martin");
            ecrireLigne(s, 2, "", "");
            ecrireLigne(s, 3, "Jean", "Durand");
        });

        ImportClientsResponse r = service.importer(new ByteArrayInputStream(xls), responsable);

        assertThat(r.imported).isEqualTo(2);
        assertThat(r.errors).isEmpty();
    }

    @Test
    void ligneSansNomNiPrenom_estIgnoreeSansErreur() throws Exception {
        // Cas observé : ligne avec une PPE et un numéro de pièce mais zéro
        // identité — on n'a pas de quoi créer le client, on saute en silence.
        byte[] xls = workbook(wb -> {
            Sheet s = wb.createSheet("Clients");
            ecrireLigne(s, 0, "Prénom", "Nom de famille", "PPE");
            ecrireLigne(s, 1, "", "", "Oui");
        });

        ImportClientsResponse r = service.importer(new ByteArrayInputStream(xls), responsable);

        assertThat(r.imported).isZero();
        assertThat(r.errors).isEmpty();
        verify(clientRepository, never()).save(any());
    }

    // ---------------------------------------------------------------------
    // PPE et types de pièce : valeurs courantes mappées
    // ---------------------------------------------------------------------

    @Test
    void ppe_acceptePlusieursLibellesEnLecture() throws Exception {
        byte[] xls = workbook(wb -> {
            Sheet s = wb.createSheet("Clients");
            ecrireLigne(s, 0, "Prénom", "Nom de famille", "PPE");
            ecrireLigne(s, 1, "A", "X", "Oui");
            ecrireLigne(s, 2, "B", "X", "OUI");
            ecrireLigne(s, 3, "C", "X", "Yes");
            ecrireLigne(s, 4, "D", "X", "1");
            ecrireLigne(s, 5, "E", "X", "Non");
            ecrireLigne(s, 6, "F", "X", "");
        });

        service.importer(new ByteArrayInputStream(xls), responsable);

        ArgumentCaptor<Client> cap = ArgumentCaptor.forClass(Client.class);
        verify(clientRepository, org.mockito.Mockito.times(6)).save(cap.capture());
        List<Client> clients = cap.getAllValues();
        assertThat(clients).extracting(Client::isPpe)
                .containsExactly(true, true, true, true, false, false);
    }

    @Test
    void typePiece_remappeLesLibellesMetier() throws Exception {
        byte[] xls = workbook(wb -> {
            Sheet s = wb.createSheet("Clients");
            ecrireLigne(s, 0, "Prénom", "Nom de famille", "PI Type de document");
            ecrireLigne(s, 1, "A", "X", "CNI");
            ecrireLigne(s, 2, "B", "X", "Permis de conduire (carte)");
            ecrireLigne(s, 3, "C", "X", "Passeport francais");
            ecrireLigne(s, 4, "D", "X", "Carte de séjour");
            ecrireLigne(s, 5, "E", "X", "Autre type non reconnu");
        });

        service.importer(new ByteArrayInputStream(xls), responsable);

        ArgumentCaptor<Client> cap = ArgumentCaptor.forClass(Client.class);
        verify(clientRepository, org.mockito.Mockito.times(5)).save(cap.capture());
        assertThat(cap.getAllValues()).extracting(Client::getTypePiece)
                .containsExactly("CNI", "Permis de Conduire (Carte)", "Passeport Français",
                        "Titre de Séjour", "Autre type non reconnu");
    }

    // ---------------------------------------------------------------------
    // Dates : cellule typée Date OU texte (dd/MM/yyyy, dd-MM-yyyy, ISO)
    // ---------------------------------------------------------------------

    @Test
    void date_acceptePlusieursFormatsTexte() throws Exception {
        byte[] xls = workbook(wb -> {
            Sheet s = wb.createSheet("Clients");
            ecrireLigne(s, 0, "Prénom", "Nom de famille", "Date de naissance");
            ecrireLigne(s, 1, "A", "X", "01/06/1985");
            ecrireLigne(s, 2, "B", "X", "01-06-1985");
            ecrireLigne(s, 3, "C", "X", "1985-06-01");
        });

        service.importer(new ByteArrayInputStream(xls), responsable);

        ArgumentCaptor<Client> cap = ArgumentCaptor.forClass(Client.class);
        verify(clientRepository, org.mockito.Mockito.times(3)).save(cap.capture());
        assertThat(cap.getAllValues()).extracting(Client::getDateNaissance)
                .containsOnly(LocalDate.of(1985, 6, 1));
    }

    @Test
    void date_celluleTypeeDate_estLueDirectement() throws Exception {
        byte[] xls = workbook(wb -> {
            Sheet s = wb.createSheet("Clients");
            ecrireLigne(s, 0, "Prénom", "Nom de famille", "Date de naissance");
            Row r = s.createRow(1);
            r.createCell(0).setCellValue("Marie");
            r.createCell(1).setCellValue("Martin");
            CreationHelper helper = wb.getCreationHelper();
            CellStyle dateStyle = wb.createCellStyle();
            dateStyle.setDataFormat(helper.createDataFormat().getFormat("dd/mm/yyyy"));
            org.apache.poi.ss.usermodel.Cell dateCell = r.createCell(2);
            dateCell.setCellValue(java.sql.Date.valueOf("1985-06-01"));
            dateCell.setCellStyle(dateStyle);
        });

        service.importer(new ByteArrayInputStream(xls), responsable);

        ArgumentCaptor<Client> cap = ArgumentCaptor.forClass(Client.class);
        verify(clientRepository).save(cap.capture());
        assertThat(cap.getValue().getDateNaissance()).isEqualTo(LocalDate.of(1985, 6, 1));
    }

    @Test
    void date_formatInconnu_estReporteeEnErreurDeLigne() throws Exception {
        byte[] xls = workbook(wb -> {
            Sheet s = wb.createSheet("Clients");
            ecrireLigne(s, 0, "Prénom", "Nom de famille", "Date de naissance");
            ecrireLigne(s, 1, "Marie", "Martin", "01.06.1985");
        });

        ImportClientsResponse r = service.importer(new ByteArrayInputStream(xls), responsable);

        assertThat(r.imported).isZero();
        assertThat(r.errors).hasSize(1);
        assertThat(r.errors.get(0))
                .startsWith("Ligne 2 :")
                .contains("non reconnue");
    }

    // ---------------------------------------------------------------------
    // Adresse : multi-ligne, mono-ligne, fallback BAN
    // ---------------------------------------------------------------------

    @Test
    void adresseMultiLigne_estDecomposeeEnRueCpVillePays() throws Exception {
        byte[] xls = workbook(wb -> {
            Sheet s = wb.createSheet("Clients");
            ecrireLigne(s, 0, "Prénom", "Nom de famille", "Adresse 1");
            ecrireLigne(s, 1, "A", "X", "10 rue de Lyon\n75012 Paris\nFrance");
        });

        service.importer(new ByteArrayInputStream(xls), responsable);

        ArgumentCaptor<Client> cap = ArgumentCaptor.forClass(Client.class);
        verify(clientRepository).save(cap.capture());
        Client c = cap.getValue();
        assertThat(c.getRue()).isEqualTo("10 rue de Lyon");
        assertThat(c.getCodePostal()).isEqualTo("75012");
        assertThat(c.getVille()).isEqualTo("Paris");
        assertThat(c.getPays()).isEqualTo("France");
        // Pas de fallback BAN nécessaire — l'adresse est complète.
        verify(adresseService, never()).resoudre(anyString());
    }

    @Test
    void adresseMonoLigneAvecCP_estDecomposeeViaCpDetectionRegex() throws Exception {
        byte[] xls = workbook(wb -> {
            Sheet s = wb.createSheet("Clients");
            ecrireLigne(s, 0, "Prénom", "Nom de famille", "Adresse 1");
            ecrireLigne(s, 1, "A", "X", "10 rue de Lyon, 75012 Paris, France");
        });

        service.importer(new ByteArrayInputStream(xls), responsable);

        ArgumentCaptor<Client> cap = ArgumentCaptor.forClass(Client.class);
        verify(clientRepository).save(cap.capture());
        Client c = cap.getValue();
        assertThat(c.getCodePostal()).isEqualTo("75012");
        assertThat(c.getVille()).isEqualTo("Paris");
        assertThat(c.getPays()).isEqualTo("France");
    }

    @Test
    void adresseIncomplete_declencheLeFallbackAdresseService() throws Exception {
        // Cellule mono-ligne où on ne reconnaît pas le format → on doit
        // tomber sur AdresseService.resoudre() pour interroger la BAN.
        byte[] xls = workbook(wb -> {
            Sheet s = wb.createSheet("Clients");
            ecrireLigne(s, 0, "Prénom", "Nom de famille", "Adresse 1");
            ecrireLigne(s, 1, "A", "X", "domicile non structuré");
        });
        when(adresseService.resoudre("domicile non structuré"))
                .thenReturn(new AdresseService.Adresse(
                        "1 rue X", "75001", "Paris", "France"));

        service.importer(new ByteArrayInputStream(xls), responsable);

        ArgumentCaptor<Client> cap = ArgumentCaptor.forClass(Client.class);
        verify(clientRepository).save(cap.capture());
        Client c = cap.getValue();
        assertThat(c.getRue()).isEqualTo("1 rue X");
        assertThat(c.getVille()).isEqualTo("Paris");
        verify(adresseService).resoudre("domicile non structuré");
    }

    @Test
    void adresse_sautDeLigneExcelEchappe_x000A_estTraite() throws Exception {
        // Certains exports écrivent littéralement « _x000A_ » au lieu d'un
        // vrai saut de ligne. Le parser doit le normaliser.
        byte[] xls = workbook(wb -> {
            Sheet s = wb.createSheet("Clients");
            ecrireLigne(s, 0, "Prénom", "Nom de famille", "Adresse 1");
            ecrireLigne(s, 1, "A", "X", "10 rue X_x000A_75012 Paris_x000A_France");
        });

        service.importer(new ByteArrayInputStream(xls), responsable);

        ArgumentCaptor<Client> cap = ArgumentCaptor.forClass(Client.class);
        verify(clientRepository).save(cap.capture());
        Client c = cap.getValue();
        assertThat(c.getRue()).isEqualTo("10 rue X");
        assertThat(c.getCodePostal()).isEqualTo("75012");
        assertThat(c.getVille()).isEqualTo("Paris");
    }

    // ---------------------------------------------------------------------
    // Lieu de naissance : GeoService consulté pour la France
    // ---------------------------------------------------------------------

    @Test
    void lieuNaissanceFrance_passeParGeoServicePourLeFormat() throws Exception {
        when(geoService.formatVilleFrance("Besançon")).thenReturn("Besançon (25)");

        byte[] xls = workbook(wb -> {
            Sheet s = wb.createSheet("Clients");
            ecrireLigne(s, 0, "Prénom", "Nom de famille",
                    "PI Ville de naissance", "PI Pays de naissance");
            ecrireLigne(s, 1, "A", "X", "Besançon", "France");
        });

        service.importer(new ByteArrayInputStream(xls), responsable);

        ArgumentCaptor<Client> cap = ArgumentCaptor.forClass(Client.class);
        verify(clientRepository).save(cap.capture());
        assertThat(cap.getValue().getLieuNaissance()).isEqualTo("Besançon (25)");
    }

    @Test
    void lieuNaissanceInternational_combineVillePays() throws Exception {
        byte[] xls = workbook(wb -> {
            Sheet s = wb.createSheet("Clients");
            ecrireLigne(s, 0, "Prénom", "Nom de famille",
                    "PI Ville de naissance", "PI Pays de naissance");
            ecrireLigne(s, 1, "A", "X", "Tokyo", "Japon");
        });

        service.importer(new ByteArrayInputStream(xls), responsable);

        ArgumentCaptor<Client> cap = ArgumentCaptor.forClass(Client.class);
        verify(clientRepository).save(cap.capture());
        assertThat(cap.getValue().getLieuNaissance()).isEqualTo("Tokyo (Japon)");
        // GeoService ne doit PAS être consulté pour l'international.
        verify(geoService, never()).formatVilleFrance(anyString());
    }

    @Test
    void lieuNaissance_paysVide_estTraiteCommeFranceImplicite() throws Exception {
        when(geoService.formatVilleFrance("Lyon")).thenReturn("Lyon (69)");

        byte[] xls = workbook(wb -> {
            Sheet s = wb.createSheet("Clients");
            ecrireLigne(s, 0, "Prénom", "Nom de famille", "PI Ville de naissance");
            ecrireLigne(s, 1, "A", "X", "Lyon");
        });

        service.importer(new ByteArrayInputStream(xls), responsable);

        ArgumentCaptor<Client> cap = ArgumentCaptor.forClass(Client.class);
        verify(clientRepository).save(cap.capture());
        assertThat(cap.getValue().getLieuNaissance()).isEqualTo("Lyon (69)");
    }

    // ---------------------------------------------------------------------
    // Doublons et clients incomplets
    // ---------------------------------------------------------------------

    @Test
    void doublonDetecte_incrementeSkippedSansSauvegarder() throws Exception {
        byte[] xls = workbook(wb -> {
            Sheet s = wb.createSheet("Clients");
            ecrireLigne(s, 0, "Prénom", "Nom de famille", "Date de naissance");
            ecrireLigne(s, 1, "Marie", "Martin", "15/03/1990");
        });
        when(clientRepository.findSimilar(any(), any(), any(), any()))
                .thenReturn(List.of(new Client()));

        ImportClientsResponse r = service.importer(new ByteArrayInputStream(xls), responsable);

        assertThat(r.imported).isZero();
        assertThat(r.skipped).isEqualTo(1);
        verify(clientRepository, never()).save(any());
    }

    @Test
    void clientCreeIncomplet_incrementeIncomplete() throws Exception {
        // Aucun lieu de naissance, pas d'adresse, pas de pièce → incomplet.
        byte[] xls = workbook(wb -> {
            Sheet s = wb.createSheet("Clients");
            ecrireLigne(s, 0, "Prénom", "Nom de famille", "Date de naissance");
            ecrireLigne(s, 1, "Marie", "Martin", "15/03/1990");
        });

        ImportClientsResponse r = service.importer(new ByteArrayInputStream(xls), responsable);

        assertThat(r.imported).isEqualTo(1);
        assertThat(r.incomplete).isEqualTo(1);
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private static InputStream emptyStream() {
        return new ByteArrayInputStream(new byte[0]);
    }

    /**
     * Construit un workbook XLSX en mémoire et renvoie ses bytes. Le block
     * lambda reçoit le workbook pour le remplir.
     */
    private static byte[] workbook(java.util.function.Consumer<Workbook> filler) throws IOException {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            filler.accept(wb);
            wb.write(out);
            return out.toByteArray();
        }
    }

    /** Écrit une ligne de cellules texte à la position donnée. */
    private static void ecrireLigne(Sheet sheet, int rowIndex, String... cells) {
        Row r = sheet.createRow(rowIndex);
        for (int i = 0; i < cells.length; i++) {
            r.createCell(i).setCellValue(cells[i]);
        }
    }
}
