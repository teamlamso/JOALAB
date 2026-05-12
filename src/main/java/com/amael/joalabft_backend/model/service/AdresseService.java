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

/**
 * Client pour {@code api-adresse.data.gouv.fr} (BAN — Base Adresse Nationale).
 * Résout une chaîne libre en adresse structurée. France uniquement.
 */
@Stateless
public class AdresseService {

    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    /** Adresse structurée. Champ {@code pays} toujours « France » (la BAN ne couvre que la France). */
    public record Adresse(String rue, String codePostal, String ville, String pays) {}

    /**
     * Résout {@code raw} en adresse structurée. Accepte une chaîne multi-ligne
     * (les retours-ligne sont remplacés par des espaces pour la requête).
     * Retourne {@code null} si la BAN ne trouve rien ou si l'appel échoue —
     * le caller fait alors un fallback (parsing maison ou conservation telle quelle).
     */
    public Adresse resoudre(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String query = raw.replaceAll("\\r?\\n", " ").trim();
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
                String rue   = readString(props, "name",     null);
                String cp    = readString(props, "postcode", null);
                String ville = readString(props, "city",     null);
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
