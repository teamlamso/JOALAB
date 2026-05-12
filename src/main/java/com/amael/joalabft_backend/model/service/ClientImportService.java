package com.amael.joalabft_backend.model.service;

import com.amael.joalabft_backend.model.dto.response.ImportClientsResponse;
import com.amael.joalabft_backend.model.entity.Client;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.enums.TypeActionJournal;
import com.amael.joalabft_backend.model.enums.TypeEntiteJournal;
import com.amael.joalabft_backend.model.repository.ClientRepository;
import jakarta.ejb.Stateless;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import org.apache.poi.ss.usermodel.*;

import java.io.IOException;
import java.io.InputStream;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

/**
 * Import en masse de clients à partir d'un fichier Excel (.xlsx ou .xls).
 *
 * <p>Le fichier doit contenir une ligne d'en-tête en première ligne. Les colonnes
 * attendues (insensibles à la casse et aux accents) sont :
 * <ul>
 *   <li>Prénom</li>
 *   <li>Nom de famille</li>
 *   <li>Date de naissance</li>
 *   <li>PPE (« Oui » / « Non »)</li>
 *   <li>PI Numéro</li>
 *   <li>PI Pays de délivrance</li>
 *   <li>PI Pays de naissance</li>
 *   <li>PI Ville de délivrance</li>
 *   <li>PI Ville de naissance</li>
 *   <li>PI Type de document</li>
 *   <li>PI Date de délivrance</li>
 *   <li>Adresse 1 (cellule sur trois lignes : rue / CP ville / pays)</li>
 * </ul>
 *
 * <p>Les colonnes supplémentaires sont ignorées. Les valeurs vides sont permises ;
 * un client créé avec des champs manquants est compté dans
 * {@link ImportClientsResponse#incomplete} pour que le frontend l'affiche avec
 * une pastille « À compléter ». Les doublons (mêmes nom+prénom+date de naissance,
 * ou même numéro de pièce) sont silencieusement ignorés.
 */
@Stateless
public class ClientImportService {

    private static final Logger LOG = Logger.getLogger(ClientImportService.class.getName());

    private static final DateTimeFormatter ISO     = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter FR_SLASH = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter FR_DASH  = DateTimeFormatter.ofPattern("dd-MM-yyyy");

    /** Mapping des intitulés Excel vers nos valeurs internes de typePiece (clé normalisée). */
    private static final Map<String, String> TYPE_PIECE_MAPPING = Map.ofEntries(
            Map.entry("cnie",                          "CNIe"),
            Map.entry("cni",                           "CNI"),
            Map.entry("permis de conduire (carte)",    "Permis de Conduire (Carte)"),
            Map.entry("permis de conduire (3 volets)", "Permis de Conduire (Papier)"),
            Map.entry("permis de conduire (papier)",   "Permis de Conduire (Papier)"),
            Map.entry("passeport francais",            "Passeport Français"),
            Map.entry("passeport etranger",            "Passeport Etranger"),
            Map.entry("carte d'identite europeenne",   "Carte Identité Etrangère"),
            Map.entry("carte identite etrangere",      "Carte Identité Etrangère"),
            Map.entry("carte de sejour",               "Titre de Séjour"),
            Map.entry("titre de sejour",               "Titre de Séjour")
    );

    @Inject
    private ClientRepository clientRepository;

    @Inject
    private PermissionService permissionService;

    @Inject
    private JournalService journalService;

    @Inject
    private GeoService geoService;

    @Inject
    private AdresseService adresseService;

    /**
     * Lit le classeur Excel fourni et crée les clients correspondants.
     *
     * @throws jakarta.ws.rs.ForbiddenException si {@code utilisateur} n'est pas
     *         RESPONSABLE_CAISSE ou MCD
     * @throws BadRequestException si le fichier ne peut pas être lu
     */
    public ImportClientsResponse importer(InputStream input, Utilisateur utilisateur) {
        permissionService.ensurePeutImporterClients(utilisateur);

        ImportClientsResponse result = new ImportClientsResponse();

        try (Workbook wb = WorkbookFactory.create(input)) {
            Sheet sheet = wb.getSheetAt(0);
            if (sheet == null) {
                throw new BadRequestException("Le classeur Excel ne contient aucune feuille.");
            }
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                throw new BadRequestException("Le fichier Excel est vide.");
            }
            Map<String, Integer> columns = mapHeaders(headerRow);
            LOG.info("[IMPORT] Colonnes détectées dans l'Excel : " + columns.keySet());

            DataFormatter formatter = new DataFormatter();
            int lastRow = sheet.getLastRowNum();
            for (int i = 1; i <= lastRow; i++) {
                Row row = sheet.getRow(i);
                if (row == null || isEmptyRow(row, formatter)) continue;
                try {
                    Client c = parseRow(row, columns, formatter);
                    if (c == null) continue;

                    if (estDoublon(c)) {
                        result.skipped++;
                        continue;
                    }

                    clientRepository.save(c);
                    boolean incomplet = !c.isComplet();
                    if (incomplet) result.incomplete++;
                    result.imported++;

                    journalService.log(
                            utilisateur,
                            TypeActionJournal.CREATION,
                            TypeEntiteJournal.CLIENT,
                            c.getId(),
                            c.getLibelle(),
                            "Import Excel : création" + (incomplet ? " (infos incomplètes)" : ""));
                } catch (Exception e) {
                    result.errors.add("Ligne " + (i + 1) + " : " + e.getMessage());
                }
            }
        } catch (IOException e) {
            throw new BadRequestException("Impossible de lire le fichier : " + e.getMessage());
        }

        return result;
    }

    // --- Header mapping ---

    private Map<String, Integer> mapHeaders(Row header) {
        Map<String, Integer> map = new HashMap<>();
        DataFormatter f = new DataFormatter();
        for (int i = 0; i < header.getLastCellNum(); i++) {
            Cell c = header.getCell(i);
            if (c == null) continue;
            String key = normalize(f.formatCellValue(c));
            if (!key.isBlank()) map.put(key, i);
        }
        return map;
    }

    private String cellString(Row row, Map<String, Integer> columns, String header, DataFormatter f) {
        Integer idx = columns.get(normalize(header));
        if (idx == null) return null;
        Cell c = row.getCell(idx);
        if (c == null) return null;
        String value = f.formatCellValue(c).trim();
        return value.isEmpty() ? null : value;
    }

    private LocalDate cellDate(Row row, Map<String, Integer> columns, String header, DataFormatter f) {
        Integer idx = columns.get(normalize(header));
        if (idx == null) return null;
        Cell c = row.getCell(idx);
        if (c == null) return null;
        // Cellule typée date dans Excel
        if (c.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(c)) {
            LocalDateTime dt = c.getLocalDateTimeCellValue();
            return dt == null ? null : dt.toLocalDate();
        }
        // Cellule texte : on essaie plusieurs formats courants
        String s = f.formatCellValue(c).trim();
        if (s.isEmpty()) return null;
        for (DateTimeFormatter fmt : List.of(FR_SLASH, FR_DASH, ISO)) {
            try { return LocalDate.parse(s, fmt); } catch (Exception ignored) {}
        }
        throw new IllegalArgumentException("Date « " + s + " » non reconnue (attendu dd/MM/yyyy)");
    }

    // --- Row parsing ---

    private Client parseRow(Row row, Map<String, Integer> columns, DataFormatter f) {
        String prenom = cellString(row, columns, "Prénom",          f);
        String nom    = cellString(row, columns, "Nom de famille",  f);
        if (prenom == null && nom == null) {
            // Aucune identité : on ignore proprement, sans erreur.
            return null;
        }

        Client c = new Client();
        c.setIdentifie(true);
        c.setPrenom(prenom);
        c.setNom(nom);
        c.setDateNaissance(cellDate(row, columns, "Date de naissance", f));
        c.setPpe(parsePpe(cellString(row, columns, "PPE", f)));

        // Lieu de naissance : pour la France on tente de récupérer le code
        // département via geo.api.gouv.fr et on formate "Ville (XX)". Sinon
        // on retombe sur "Ville (Pays)" / "Ville" / "Pays".
        String villeNaissance = cellString(row, columns, "PI Ville de naissance", f);
        String paysNaissance  = cellString(row, columns, "PI Pays de naissance",  f);
        c.setLieuNaissance(resoudreLieuNaissance(villeNaissance, paysNaissance));

        // Pièce d'identité.
        c.setNumeroPiece(cellString(row, columns, "PI Numéro", f));
        c.setTypePiece(mapTypePiece(cellString(row, columns, "PI Type de document", f)));
        c.setDateDelivrance(cellDate(row, columns, "PI Date de délivrance", f));
        c.setPaysDelivrance(normaliserPays(cellString(row, columns, "PI Pays de délivrance", f)));
        c.setPrefectureDelivrance(cellString(row, columns, "PI Ville de délivrance", f));

        // Adresse : on tente d'abord le parsing maison (rapide, déterministe).
        // Quand la cellule est bien structurée (rue \n CP ville \n pays), ça
        // donne directement le bon résultat. Si maison n'arrive pas à extraire
        // CP+ville (cellule mono-ligne foireuse, format inattendu…), on
        // appelle la BAN en dernier recours.
        String adresseRaw = cellString(row, columns, "Adresse 1", f);
        LOG.info("[IMPORT][ADRESSE] ligne " + (row.getRowNum() + 1) + " — raw = "
                + (adresseRaw == null ? "<null>" : adresseRaw.replace("\n", "\\n").replace("\r", "\\r")));
        if (adresseRaw != null) {
            appliquerAdresse(c, adresseRaw);
            boolean adresseIncomplete = blank(c.getCodePostal()) || blank(c.getVille());
            if (adresseIncomplete) {
                AdresseService.Adresse a = adresseService.resoudre(adresseRaw);
                if (a != null) {
                    c.setRue(a.rue());
                    c.setCodePostal(a.codePostal());
                    c.setVille(a.ville());
                    c.setPays(a.pays());
                }
            }
        }

        return c;
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    private String resoudreLieuNaissance(String ville, String pays) {
        boolean franceImplicite = pays == null || pays.isBlank();
        boolean france = !franceImplicite
                && (normalize(pays).equals("fr") || normalize(pays).equals("france"));
        if (ville != null && (france || franceImplicite)) {
            String formatte = geoService.formatVilleFrance(ville);
            if (formatte != null) return formatte;
        }
        return combinerVillePays(ville, pays);
    }

    private void appliquerAdresse(Client c, String raw) {
        if (raw == null) return;
        // Normalisation : POI / Excel peuvent encoder le saut de ligne
        // intra-cellule de plusieurs façons (LF, CR, CRLF, ou l'échappement
        // littéral _x000A_ pour certains exports). On ramène tout à \n.
        String norm = raw
                .replace("_x000A_", "\n")
                .replace("\r\n", "\n")
                .replace('\r', '\n');
        String[] lines = norm.split("\n");
        LOG.info("[IMPORT][ADRESSE] split en " + lines.length + " ligne(s)");
        if (lines.length >= 2) {
            // Format multi-ligne « rue \n CP ville \n pays ».
            c.setRue(strip(lines[0]));
            String l2 = strip(lines[1]);
            int sep = l2.indexOf(' ');
            if (sep > 0 && l2.substring(0, sep).matches("\\d{4,5}")) {
                c.setCodePostal(l2.substring(0, sep));
                c.setVille(l2.substring(sep + 1).trim());
            } else {
                c.setVille(l2);
            }
            if (lines.length >= 3) c.setPays(normaliserPays(strip(lines[2])));
        } else {
            // Cellule sur une seule ligne : on essaie de repérer le CP
            // n'importe où dans la chaîne (5 chiffres consécutifs).
            String single = strip(raw);
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\b(\\d{5})\\b").matcher(single);
            if (m.find()) {
                String cp     = m.group(1);
                String avant  = single.substring(0, m.start()).trim().replaceAll("[,;]\\s*$", "");
                String apres  = single.substring(m.end()).trim().replaceAll("^[,;]\\s*", "");
                if (!avant.isEmpty()) c.setRue(avant);
                c.setCodePostal(cp);
                // « Paris, France » / « Paris FRANCE » → ville = Paris, pays = France.
                java.util.regex.Matcher mp = java.util.regex.Pattern.compile(
                        "(?i)^(.*?)[,\\s]+\\b(france|fr)\\b\\s*$").matcher(apres);
                if (mp.matches()) {
                    String v = mp.group(1).trim();
                    if (!v.isEmpty()) c.setVille(v);
                    c.setPays("France");
                } else if (!apres.isEmpty()) {
                    c.setVille(apres);
                }
            } else {
                // Aucune structure reconnue : on met tout dans la rue. Le client
                // sera marqué « À compléter » via Client.isComplet().
                c.setRue(single);
            }
        }
    }

    private boolean estDoublon(Client c) {
        if (c.getNom() == null || c.getPrenom() == null || c.getDateNaissance() == null) {
            // Doublon par numéro de pièce uniquement si possible.
            if (c.getNumeroPiece() != null) {
                return !clientRepository.findSimilar(c.getNom(), c.getPrenom(), c.getDateNaissance(), c.getNumeroPiece())
                        .isEmpty();
            }
            return false;
        }
        return !clientRepository.findSimilar(c.getNom(), c.getPrenom(), c.getDateNaissance(), c.getNumeroPiece())
                .isEmpty();
    }

    // --- Helpers ---

    private static boolean parsePpe(String s) {
        if (s == null) return false;
        String n = normalize(s);
        return n.equals("oui") || n.equals("o") || n.equals("yes") || n.equals("y") || n.equals("true") || n.equals("1");
    }

    private static String mapTypePiece(String raw) {
        if (raw == null) return null;
        String key = normalize(raw);
        // On accepte une correspondance exacte sur la clé normalisée. Sinon on
        // renvoie tel quel : le client sera marqué incomplet si l'UI ne sait
        // pas l'afficher dans son select.
        return TYPE_PIECE_MAPPING.getOrDefault(key, raw);
    }

    private static String combinerVillePays(String ville, String pays) {
        boolean v = ville != null && !ville.isBlank();
        boolean p = pays  != null && !pays.isBlank();
        if (v && p) return ville + " (" + pays + ")";
        if (v)      return ville;
        if (p)      return pays;
        return null;
    }

    private static String normaliserPays(String s) {
        if (s == null) return null;
        String trim = s.trim();
        if (trim.isEmpty()) return null;
        String n = normalize(trim);
        if (n.equals("fr") || n.equals("france")) return "France";
        return trim;
    }

    private static boolean isEmptyRow(Row row, DataFormatter f) {
        for (int i = 0; i < row.getLastCellNum(); i++) {
            Cell c = row.getCell(i);
            if (c == null) continue;
            String v = f.formatCellValue(c).trim();
            if (!v.isEmpty()) return false;
        }
        return true;
    }

    private static String strip(String s) {
        return s == null ? null : s.trim();
    }

    /** Normalise une chaîne : trim, lowercase, suppression des accents. */
    private static String normalize(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}", "");
        return n.toLowerCase();
    }
}
