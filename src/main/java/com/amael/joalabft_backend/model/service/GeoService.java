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
import java.text.Normalizer;
import java.time.Duration;
import java.util.HashSet;
import java.util.Set;

/**
 * Petit client pour {@code geo.api.gouv.fr} — résout une ville française en
 * « Ville (XX) » où {@code XX} est le code de département. Utilisé pour
 * formater le lieu de naissance des clients importés depuis Excel.
 */
@Stateless
public class GeoService {

    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    /** URL de base de l'API. Surchargeable côté test pour pointer un HttpServer local. */
    private String baseUrl = "https://geo.api.gouv.fr";

    /** Test-only : permet de pointer l'API sur un HttpServer local. */
    void setBaseUrlForTests(String url) { this.baseUrl = url; }

    /**
     * Si {@code ville} correspond à une commune française, retourne le format
     * « Ville (codeDépartement) ». En cas d'ambiguïté (plusieurs communes
     * portent exactement ce nom, ex. Saint-Denis en 93 et 974), retourne juste
     * le nom de la ville sans département. {@code null} si la BAN ne retourne
     * rien.
     *
     * <p>On demande {@code limit=20} pour récupérer toutes les communes
     * homonymes (geo.api.gouv.fr trie par score donc {@code limit=1} prenait
     * arbitrairement Saint-Denis-93 par exemple), puis on filtre sur égalité
     * stricte du nom normalisé.
     */
    public String formatVilleFrance(String ville) {
        if (ville == null || ville.isBlank()) return null;
        String demande = ville.trim();
        try {
            String url = baseUrl + "/communes?nom="
                    + URLEncoder.encode(demande, StandardCharsets.UTF_8)
                    + "&fields=codeDepartement,nom&limit=20";
            HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();
            HttpResponse<String> resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200) return null;
            try (JsonReader reader = Json.createReader(new StringReader(resp.body()))) {
                JsonArray arr = reader.readArray();
                if (arr.isEmpty()) return null;

                String cible = normalize(demande);
                String nomCanonique = null;
                Set<String> departements = new HashSet<>();
                for (int i = 0; i < arr.size(); i++) {
                    JsonObject c = arr.getJsonObject(i);
                    String nom = readString(c, "nom", null);
                    if (nom == null) continue;
                    if (!normalize(nom).equals(cible)) continue;
                    String code = readString(c, "codeDepartement", null);
                    if (nomCanonique == null) nomCanonique = nom;
                    if (code != null) departements.add(code);
                }
                if (nomCanonique == null) {
                    // Aucun match exact — on retombe sur le 1er résultat « approchant »
                    // pour donner au moins l'orthographe officielle, mais sans dpt.
                    JsonObject first = arr.getJsonObject(0);
                    return readString(first, "nom", demande);
                }
                if (departements.size() == 1) {
                    return nomCanonique + " (" + departements.iterator().next() + ")";
                }
                // Plusieurs départements (ex. Saint-Denis 93/974) → ambigu, on
                // ne devine pas.
                return nomCanonique;
            }
        } catch (Exception ignored) {
            return null;
        }
    }

    /** Normalisation : minuscules + suppression des accents. */
    private static String normalize(String s) {
        String n = Normalizer.normalize(s.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}", "");
        return n.toLowerCase();
    }

    private static String readString(JsonObject obj, String key, String defaultValue) {
        if (!obj.containsKey(key)) return defaultValue;
        JsonValue v = obj.get(key);
        if (v == null || v.getValueType() != JsonValue.ValueType.STRING) return defaultValue;
        return obj.getString(key);
    }
}
