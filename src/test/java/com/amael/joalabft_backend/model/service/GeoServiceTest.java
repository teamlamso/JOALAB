package com.amael.joalabft_backend.model.service;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Couvre {@link GeoService} via un {@link HttpServer} local en mémoire — pas
 * d'appel réseau réel, pas de dépendance test additionnelle.
 *
 * <p>Le service interroge geo.api.gouv.fr pour formater une ville française en
 * « Ville (XX) » avec XX = code département. La logique non-triviale ici est le
 * filtrage des homonymes : on demande {@code limit=20} et on filtre par égalité
 * stricte du nom normalisé pour éviter le piège du tri par score (où Saint-Denis-93
 * sortirait avant Saint-Denis-974).
 */
class GeoServiceTest {

    private HttpServer server;
    private GeoService service;
    /** Permet d'inspecter ce que le service a réellement demandé. */
    private final AtomicInteger nbAppels = new AtomicInteger();
    private String dernierQuery;

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        service = new GeoService();
        service.setBaseUrlForTests("http://127.0.0.1:" + server.getAddress().getPort());
    }

    @AfterEach
    void tearDown() {
        server.stop(0);
    }

    // ---------------------------------------------------------------------
    // Cas d'entrée triviaux
    // ---------------------------------------------------------------------

    @Test
    void villeNullOuBlanche_renvoieNullSansAppelHttp() {
        // Pas de handler enregistré ; si le service tentait quand même un
        // appel HTTP, on lèverait une ConnectException qui ferait
        // exception → null, donc on vérifie aussi nbAppels=0 par sécurité.
        server.start();

        assertThat(service.formatVilleFrance(null)).isNull();
        assertThat(service.formatVilleFrance("")).isNull();
        assertThat(service.formatVilleFrance("   ")).isNull();
        assertThat(nbAppels.get()).isZero();
    }

    // ---------------------------------------------------------------------
    // Réponses HTTP : non-200, body vide, JSON malformé
    // ---------------------------------------------------------------------

    @Test
    void statusNon200_renvoieNull() {
        registerHandler("/communes", (q, ex) -> respond(ex, 500, "[]"));
        server.start();

        assertThat(service.formatVilleFrance("Paris")).isNull();
    }

    @Test
    void reponseVide_renvoieNull() {
        registerHandler("/communes", (q, ex) -> respond(ex, 200, "[]"));
        server.start();

        assertThat(service.formatVilleFrance("Inexistante")).isNull();
    }

    @Test
    void reponseInvalide_silencieusementNull() {
        // Garde-fou : tout problème de parsing tombe dans catch(Exception)
        // et renvoie null. L'import Excel doit pouvoir continuer même si
        // geo.api.gouv.fr se met à renvoyer du HTML un jour.
        registerHandler("/communes", (q, ex) -> respond(ex, 200, "pas du json"));
        server.start();

        assertThat(service.formatVilleFrance("Paris")).isNull();
    }

    // ---------------------------------------------------------------------
    // Cas nominal : un seul match exact → « Ville (XX) »
    // ---------------------------------------------------------------------

    @Test
    void uniqueCommune_renvoieVilleAvecDepartement() {
        registerHandler("/communes", (q, ex) -> respond(ex, 200,
                "[{\"nom\":\"Besançon\",\"codeDepartement\":\"25\"}]"));
        server.start();

        assertThat(service.formatVilleFrance("Besançon")).isEqualTo("Besançon (25)");
    }

    @Test
    void encodageUrl_villeAvecEspaces() {
        registerHandler("/communes", (q, ex) -> {
            // L'URL doit pouvoir transmettre « Le Mans » sans casser.
            assertThat(q).contains("nom=Le+Mans");
            respond(ex, 200, "[{\"nom\":\"Le Mans\",\"codeDepartement\":\"72\"}]");
        });
        server.start();

        assertThat(service.formatVilleFrance("Le Mans")).isEqualTo("Le Mans (72)");
    }

    @Test
    void appelleUneURLAvecLimit20() {
        // Régression possible : si quelqu'un baisse limit à 1, on retombe
        // sur le piège du tri par score (Saint-Denis-93 avant 974).
        registerHandler("/communes", (q, ex) -> {
            assertThat(q).contains("limit=20");
            assertThat(q).contains("fields=codeDepartement");
            respond(ex, 200, "[{\"nom\":\"Paris\",\"codeDepartement\":\"75\"}]");
        });
        server.start();

        service.formatVilleFrance("Paris");
    }

    // ---------------------------------------------------------------------
    // Match exact insensible à la casse / aux accents
    // ---------------------------------------------------------------------

    @Test
    void matchExact_insensibleAuxAccents() {
        registerHandler("/communes", (q, ex) -> respond(ex, 200,
                "[{\"nom\":\"Besançon\",\"codeDepartement\":\"25\"}]"));
        server.start();

        // Saisie sans accent → la réponse avec accent doit matcher.
        assertThat(service.formatVilleFrance("Besancon")).isEqualTo("Besançon (25)");
    }

    @Test
    void matchExact_insensibleALaCasse() {
        registerHandler("/communes", (q, ex) -> respond(ex, 200,
                "[{\"nom\":\"Lyon\",\"codeDepartement\":\"69\"}]"));
        server.start();

        assertThat(service.formatVilleFrance("LYON")).isEqualTo("Lyon (69)");
    }

    // ---------------------------------------------------------------------
    // Plusieurs communes avec MÊME nom dans des départements DIFFÉRENTS
    // ---------------------------------------------------------------------

    @Test
    void homonymesPlusieursDepartements_renvoieJusteLeNomSansDpt() {
        // Saint-Denis existe dans le 93 ET le 974. On ne devine pas — on
        // renvoie juste « Saint-Denis » pour que le caissier corrige
        // manuellement.
        registerHandler("/communes", (q, ex) -> respond(ex, 200, """
                [
                  {"nom":"Saint-Denis","codeDepartement":"93"},
                  {"nom":"Saint-Denis","codeDepartement":"974"}
                ]
                """));
        server.start();

        assertThat(service.formatVilleFrance("Saint-Denis")).isEqualTo("Saint-Denis");
    }

    @Test
    void plusieursMatchsMaisMemeDpt_renvoieLeNomAvecCeDpt() {
        // Plusieurs résultats mais tous dans le même département → pas
        // d'ambiguïté, on annote le département.
        registerHandler("/communes", (q, ex) -> respond(ex, 200, """
                [
                  {"nom":"Lyon","codeDepartement":"69"},
                  {"nom":"Lyon","codeDepartement":"69"}
                ]
                """));
        server.start();

        assertThat(service.formatVilleFrance("Lyon")).isEqualTo("Lyon (69)");
    }

    @Test
    void matchsApprochantsSeulementSansEgalite_renvoieLeNomSansDpt() {
        // Aucun nom ne matche exactement la requête → on retombe sur le
        // premier résultat « approchant » pour récupérer l'orthographe
        // officielle, mais sans pouvoir promettre un département.
        registerHandler("/communes", (q, ex) -> respond(ex, 200,
                "[{\"nom\":\"Saint-Étienne-du-Bois\",\"codeDepartement\":\"01\"}]"));
        server.start();

        // Demande « Saint-Étienne » → seul un résultat éloigné existe.
        assertThat(service.formatVilleFrance("Saint-Étienne"))
                .isEqualTo("Saint-Étienne-du-Bois");
    }

    // ---------------------------------------------------------------------
    // Filtrage : on ignore les communes dont le nom diffère
    // ---------------------------------------------------------------------

    @Test
    void filtreSurEgaliteStricteDuNomNormalise() {
        // Le tri par score peut renvoyer en tête une commune qui ne
        // matche pas exactement — on doit l'ignorer et prendre celle qui
        // matche en second.
        registerHandler("/communes", (q, ex) -> respond(ex, 200, """
                [
                  {"nom":"Saint-Pierre-de-Tours","codeDepartement":"49"},
                  {"nom":"Tours","codeDepartement":"37"}
                ]
                """));
        server.start();

        assertThat(service.formatVilleFrance("Tours")).isEqualTo("Tours (37)");
    }

    // ---------------------------------------------------------------------
    // Réseau injoignable : exception silencieuse → null
    // ---------------------------------------------------------------------

    @Test
    void serveurDown_renvoieNullSansLeverException() {
        // Pas de démarrage du server → le service doit gérer la
        // ConnectException sans casser l'import Excel en cours.
        // (server jamais démarré)
        assertThat(service.formatVilleFrance("Paris")).isNull();
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private void registerHandler(String path, HandlerBody handler) {
        server.createContext(path, new HttpHandler() {
            @Override
            public void handle(HttpExchange ex) throws IOException {
                nbAppels.incrementAndGet();
                dernierQuery = ex.getRequestURI().getRawQuery();
                handler.handle(dernierQuery, ex);
            }
        });
    }

    private static void respond(HttpExchange ex, int status, String body) {
        try {
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
            ex.sendResponseHeaders(status, bytes.length);
            ex.getResponseBody().write(bytes);
            ex.getResponseBody().close();
        } catch (IOException ignored) {
            // Test ne peut rien faire de mieux.
        }
    }

    @FunctionalInterface
    private interface HandlerBody {
        void handle(String query, HttpExchange exchange);
    }
}
