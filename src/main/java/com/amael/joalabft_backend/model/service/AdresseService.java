package com.amael.joalabft_backend.model.service;

import com.amael.joalabft_backend.model.dto.response.SuggestionAdresseResponse;
import com.amael.joalabft_backend.model.dto.response.SuggestionLieuResponse;
import jakarta.ejb.Stateless;
import jakarta.json.Json;
import jakarta.json.JsonArray;
import jakarta.json.JsonObject;
import jakarta.json.JsonReader;
import jakarta.json.JsonValue;

import java.io.StringReader;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Client pour {@code api-adresse.data.gouv.fr} (BAN — Base Adresse Nationale).
 * Résout une chaîne libre en adresse structurée. France uniquement.
 *
 * <p>Stratégie : on tente plusieurs reformulations de la requête (chaîne
 * complète, sans la mention « FRANCE » de fin, première ligne seule), et on
 * accepte le premier résultat qui colle réellement à une adresse postale
 * (type {@code housenumber} ou {@code street}). Si la BAN ne retourne que
 * des résultats trop vagues — type {@code municipality} qui n'a qu'un nom
 * de ville sans rue — on rejette pour laisser le caller faire un fallback.
 */
@Stateless
public class AdresseService {

    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    /** Adresse structurée. {@code pays} toujours « France » (la BAN ne couvre que la France). */
    public record Adresse(String rue, String codePostal, String ville, String pays) {}

    /** Plafond raisonnable de suggestions (pour éviter une réponse trop lourde). */
    private static final int LIMITE_MAX = 10;

    /**
     * Retourne jusqu'à {@code limit} suggestions d'adresses pour la requête
     * {@code q}. On interroge d'abord la BAN (France, rapide, libellés propres) ;
     * si elle ne retourne rien, on bascule sur Nominatim (couverture mondiale).
     * Si les deux échouent, on renvoie une liste vide — le frontend doit
     * traiter ce cas comme « aucune suggestion ».
     */
    public List<SuggestionAdresseResponse> chercherSuggestions(String q, int limit) {
        if (q == null || q.isBlank()) return List.of();
        int n = Math.max(1, Math.min(limit, LIMITE_MAX));
        List<SuggestionAdresseResponse> ban = chercherBan(q, n);
        if (!ban.isEmpty()) return ban;
        return chercherNominatim(q, n);
    }

    /**
     * Retourne jusqu'à {@code limit} suggestions de lieux (villes uniquement,
     * sans rue ni numéro) pour la requête {@code q}. Interroge Nominatim
     * directement et formate les libellés en {@code "Ville (XX)"} où XX est
     * le numéro de département (France) ou le pays (international).
     *
     * <p>Distinct de {@link #chercherSuggestions} qui cible les adresses
     * postales complètes : ici on veut juste localiser une ville pour le
     * champ « lieu de naissance ».
     */
    public List<SuggestionLieuResponse> chercherLieux(String q, int limit) {
        if (q == null || q.isBlank()) return List.of();
        int n = Math.max(1, Math.min(limit, LIMITE_MAX));
        try {
            String url = "https://nominatim.openstreetmap.org/search?q="
                    + URLEncoder.encode(q, StandardCharsets.UTF_8)
                    + "&format=json&addressdetails=1&accept-language=fr&limit=" + n;
            String body = httpGet(url);
            if (body == null) return List.of();
            Set<String> dejaVus = new LinkedHashSet<>();
            try (JsonReader reader = Json.createReader(new StringReader(body))) {
                JsonArray arr = reader.readArray();
                for (JsonValue v : arr) {
                    JsonObject o = v.asJsonObject();
                    JsonObject addr = o.containsKey("address") ? o.getJsonObject("address") : null;
                    if (addr == null) continue;
                    String ville = firstString(addr, "city", "town", "village", "municipality");
                    if (ville.isBlank()) continue;
                    String suffixe;
                    String countryCode = readString(addr, "country_code", "");
                    String postcode    = readString(addr, "postcode",     "");
                    if ("fr".equals(countryCode) && !postcode.isBlank()) {
                        String dpt = postcode.startsWith("97") ? postcode.substring(0, 3)
                                                                : postcode.substring(0, Math.min(2, postcode.length()));
                        suffixe = "(" + dpt + ")";
                    } else {
                        suffixe = "(" + readString(addr, "country", "") + ")";
                    }
                    dejaVus.add(ville + " " + suffixe);
                }
            }
            List<SuggestionLieuResponse> out = new ArrayList<>();
            for (String label : dejaVus) out.add(new SuggestionLieuResponse(label));
            return out;
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private List<SuggestionAdresseResponse> chercherBan(String q, int limit) {
        try {
            String url = "https://api-adresse.data.gouv.fr/search/?q="
                    + URLEncoder.encode(q, StandardCharsets.UTF_8)
                    + "&limit=" + limit
                    + "&autocomplete=1";
            String body = httpGet(url);
            if (body == null) return List.of();
            List<SuggestionAdresseResponse> out = new ArrayList<>();
            try (JsonReader reader = Json.createReader(new StringReader(body))) {
                JsonObject root = reader.readObject();
                if (!root.containsKey("features")) return List.of();
                JsonArray features = root.getJsonArray("features");
                for (JsonValue feat : features) {
                    JsonObject props = feat.asJsonObject().getJsonObject("properties");
                    String label = readString(props, "label", null);
                    if (label == null) continue;
                    out.add(new SuggestionAdresseResponse(
                            label,
                            readString(props, "name",     ""),
                            readString(props, "postcode", ""),
                            readString(props, "city",     ""),
                            "France"
                    ));
                }
            }
            return out;
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private List<SuggestionAdresseResponse> chercherNominatim(String q, int limit) {
        try {
            String url = "https://nominatim.openstreetmap.org/search?q="
                    + URLEncoder.encode(q, StandardCharsets.UTF_8)
                    + "&format=json&addressdetails=1&accept-language=fr&limit=" + limit;
            String body = httpGet(url);
            if (body == null) return List.of();
            List<SuggestionAdresseResponse> out = new ArrayList<>();
            try (JsonReader reader = Json.createReader(new StringReader(body))) {
                JsonArray arr = reader.readArray();
                for (JsonValue v : arr) {
                    JsonObject o = v.asJsonObject();
                    JsonObject addr = o.containsKey("address") ? o.getJsonObject("address") : null;
                    String houseNum = readString(addr, "house_number", "");
                    String road     = firstString(addr, "road", "pedestrian", "path");
                    String rue      = (houseNum.isEmpty() ? "" : houseNum + " ") + road;
                    String ville    = firstString(addr, "city", "town", "village", "municipality");
                    String cp       = readString(addr, "postcode", "");
                    String pays     = readString(addr, "country",  "");
                    StringBuilder labelBuf = new StringBuilder();
                    if (!rue.isBlank())   labelBuf.append(rue.trim());
                    if (!cp.isBlank())    { if (labelBuf.length() > 0) labelBuf.append(", "); labelBuf.append(cp); }
                    if (!ville.isBlank()) { if (labelBuf.length() > 0) labelBuf.append(", "); labelBuf.append(ville); }
                    if (!pays.isBlank())  { if (labelBuf.length() > 0) labelBuf.append(", "); labelBuf.append(pays); }
                    String label = labelBuf.length() > 0
                            ? labelBuf.toString()
                            : readString(o, "display_name", "(adresse)");
                    out.add(new SuggestionAdresseResponse(label, rue.trim(), cp, ville, pays));
                }
            }
            return out;
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private String httpGet(String url) {
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(5))
                    .header("User-Agent", "JOALABFT/1.0 (contact: dev@joa.lab-ft)")
                    .GET()
                    .build();
            HttpResponse<String> resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200) return null;
            return resp.body();
        } catch (Exception e) {
            return null;
        }
    }

    private static String firstString(JsonObject o, String... keys) {
        if (o == null) return "";
        for (String k : keys) {
            String v = readString(o, k, "");
            if (!v.isEmpty()) return v;
        }
        return "";
    }

    /**
     * Résout {@code raw} en adresse structurée. {@code null} si non trouvée
     * ou si tous les essais retournent des résultats trop vagues.
     */
    public Adresse resoudre(String raw) {
        if (raw == null || raw.isBlank()) return null;

        for (String query : variantes(raw)) {
            Adresse a = chercher(query);
            if (a != null) return a;
        }
        return null;
    }

    /** Plusieurs reformulations de la requête, de la plus précise à la plus minimale. */
    private List<String> variantes(String raw) {
        List<String> out = new ArrayList<>();
        String full = raw.replaceAll("\\r?\\n", " ").trim();
        out.add(full);

        // Sans la mention « FRANCE / FR » en fin (qui perturbe parfois la BAN).
        String sansPays = full
                .replaceAll("(?i)\\s*,?\\s*\\bfrance\\b\\s*$", "")
                .replaceAll("(?i)\\s*,?\\s*\\bfr\\b\\s*$", "")
                .trim();
        if (!sansPays.isEmpty() && !sansPays.equalsIgnoreCase(full)) out.add(sansPays);

        // Lignes individuelles : la première ligne (rue + numéro) peut suffire.
        String[] lignes = raw.split("\\r?\\n");
        for (String l : lignes) {
            String t = l.trim();
            if (!t.isEmpty() && !out.contains(t)) out.add(t);
        }
        return out;
    }

    private Adresse chercher(String query) {
        try {
            String url = "https://api-adresse.data.gouv.fr/search/?q="
                    + URLEncoder.encode(query, StandardCharsets.UTF_8)
                    + "&limit=1";
            HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();
            HttpResponse<String> resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200) return null;
            try (JsonReader reader = Json.createReader(new StringReader(resp.body()))) {
                JsonObject root = reader.readObject();
                if (!root.containsKey("features")) return null;
                JsonArray features = root.getJsonArray("features");
                if (features.isEmpty()) return null;
                JsonObject props = features.getJsonObject(0).getJsonObject("properties");

                String type     = readString(props, "type",     null);
                // Seuls housenumber et street produisent une vraie adresse postale ;
                // municipality / locality / poi n'ont pas de rue → on rejette.
                if (!"housenumber".equals(type) && !"street".equals(type)) return null;

                String rue   = readString(props, "name",     null);
                String cp    = readString(props, "postcode", null);
                String ville = readString(props, "city",     null);
                if (rue == null || ville == null) return null;
                return new Adresse(rue, cp, ville, "France");
            }
        } catch (Exception ignored) {
            return null;
        }
    }

    private static String readString(JsonObject obj, String key, String defaultValue) {
        if (!obj.containsKey(key)) return defaultValue;
        JsonValue v = obj.get(key);
        if (v == null || v.getValueType() != JsonValue.ValueType.STRING) return defaultValue;
        return obj.getString(key);
    }
}
