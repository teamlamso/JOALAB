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
 * Petit client pour {@code geo.api.gouv.fr} — résout une ville française en
 * « Ville (XX) » où {@code XX} est le code de département. Utilisé pour
 * formater le lieu de naissance des clients importés depuis Excel.
 */
@Stateless
public class GeoService {

    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    /**
     * Si {@code ville} correspond à une commune française, retourne le format
     * canonique « Ville (codeDépartement) ». Sinon retourne {@code null}
     * (caller fait le fallback).
     */
    public String formatVilleFrance(String ville) {
        if (ville == null || ville.isBlank()) return null;
        try {
            String url = "https://geo.api.gouv.fr/communes?nom="
                    + URLEncoder.encode(ville.trim(), StandardCharsets.UTF_8)
                    + "&fields=codeDepartement,nom&limit=1";
            HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();
            HttpResponse<String> resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200) return null;
            try (JsonReader reader = Json.createReader(new StringReader(resp.body()))) {
                JsonArray arr = reader.readArray();
                if (arr.isEmpty()) return null;
                JsonObject first = arr.getJsonObject(0);
                String nom  = readString(first, "nom",             ville);
                String code = readString(first, "codeDepartement", null);
                return code != null ? nom + " (" + code + ")" : nom;
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
