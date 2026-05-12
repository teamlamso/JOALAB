package com.amael.joalabft_backend.model.service;

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
import java.util.List;

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
