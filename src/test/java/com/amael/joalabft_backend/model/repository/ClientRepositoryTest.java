package com.amael.joalabft_backend.model.repository;

import com.amael.joalabft_backend.model.entity.Client;
import com.amael.joalabft_backend.model.entity.FicheLABFT;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.enums.RoleUtilisateur;
import com.amael.joalabft_backend.test.JpaIntegrationBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests d'intégration JPA pour {@link ClientRepository}.
 *
 * <p>Concentré sur les requêtes JPQL custom qui ont déjà causé des bugs en
 * prod :
 * <ul>
 *   <li>{@code findAll(search)} avec sa recherche multi-tokens AND/OR ;</li>
 *   <li>{@code findSimilar} avec sa condition disjointe nom+prénom+date
 *       OU numéro de pièce ;</li>
 *   <li>{@code getDerniereActivitePourIds} — le batch qui remplace le N+1
 *       et qui doit retourner une map vide pour les clients sans fiche.</li>
 * </ul>
 */
class ClientRepositoryTest extends JpaIntegrationBase {

    private ClientRepository repo;

    @BeforeEach
    void inject() {
        repo = injectEm(new ClientRepository());
    }

    private Client persistClient(String prenom, String nom, LocalDate dateN) {
        Client c = new Client();
        c.setIdentifie(true);
        c.setNom(nom); c.setPrenom(prenom);
        c.setDateNaissance(dateN);
        c.setPays("France");
        em.persist(c);
        em.flush();
        return c;
    }

    private Client persistClientNonIdentifie(String description) {
        Client c = new Client();
        c.setIdentifie(false);
        c.setDescriptionPhysique(description);
        em.persist(c);
        em.flush();
        return c;
    }

    private Utilisateur persistCaissier(String identifiant) {
        Utilisateur u = new Utilisateur();
        u.setIdentifiant(identifiant);
        u.setMotDePasse("$2a$12$x");
        u.setNom("X"); u.setPrenom("Y");
        u.setRole(RoleUtilisateur.CAISSIER);
        em.persist(u);
        em.flush();
        return u;
    }

    private FicheLABFT persistFiche(Client client, Utilisateur caissier, LocalDateTime dateCreation) {
        FicheLABFT f = new FicheLABFT();
        f.setClient(client);
        f.setCreePar(caissier);
        f.setDateCreation(dateCreation);
        em.persist(f);
        em.flush();
        return f;
    }

    // ---------------------------------------------------------------------
    // findAll : sans recherche
    // ---------------------------------------------------------------------

    @Test
    void findAll_sansRecherche_renvoieToutTrieParNomPuisPrenom() {
        persistClient("Zoé", "Bert",   LocalDate.of(1990, 1, 1));
        persistClient("Alice", "Aaron", LocalDate.of(1990, 1, 1));
        persistClient("Marie", "Bert",  LocalDate.of(1990, 1, 1));
        flushAndClear();

        List<Client> result = repo.findAll(null);

        // Le @PrePersist du Client normalise le nom en MAJUSCULES.
        assertThat(result).extracting(Client::getNom)
                .containsExactly("AARON", "BERT", "BERT");
        // Au sein de « BERT », Marie avant Zoé.
        assertThat(result).extracting(Client::getPrenom)
                .containsExactly("Alice", "Marie", "Zoé");
    }

    @Test
    void findAll_searchBlank_estEquivalentASansRecherche() {
        persistClient("Marie", "Dupont", LocalDate.of(1990, 1, 1));
        flushAndClear();

        assertThat(repo.findAll("   ")).hasSize(1);
        assertThat(repo.findAll("")).hasSize(1);
    }

    // ---------------------------------------------------------------------
    // findAll : recherche multi-tokens
    // ---------------------------------------------------------------------

    @Test
    void findAll_searchMonotoken_matchePartielSurNomOuPrenomOuDescription() {
        persistClient("Marie", "Dupont", LocalDate.of(1990, 1, 1));
        persistClient("Jean",  "Martin", LocalDate.of(1990, 1, 1));
        persistClientNonIdentifie("Description avec dup dedans");
        flushAndClear();

        List<Client> result = repo.findAll("dup");

        // Match sur nom Dupont ET sur descriptionPhysique « ...dup... ».
        assertThat(result).hasSize(2);
    }

    @Test
    void findAll_searchInsensibleALaCasse() {
        persistClient("Marie", "DUPONT", LocalDate.of(1990, 1, 1));
        flushAndClear();

        assertThat(repo.findAll("dup")).hasSize(1);
        assertThat(repo.findAll("DUP")).hasSize(1);
    }

    @Test
    void findAll_searchMultiTokens_chaqueTokenDoitMatcherUnChamp_AND() {
        // « Alexis Duchat » doit matcher un client {prenom=Alexis, nom=Duchat}
        // → token "alexis" match prenom, token "duchat" match nom.
        persistClient("Alexis", "Duchat", LocalDate.of(1990, 1, 1));
        persistClient("Bob",    "Duchat", LocalDate.of(1990, 1, 1));
        persistClient("Alexis", "Martin", LocalDate.of(1990, 1, 1));
        flushAndClear();

        List<Client> result = repo.findAll("alexis duchat");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getPrenom()).isEqualTo("Alexis");
        assertThat(result.get(0).getNom()).isEqualTo("DUCHAT");
    }

    @Test
    void findAll_searchMultiTokens_ordreInverse_matcheAussi() {
        // « Duchat Alexis » doit aussi marcher — c'est le critère d'usage
        // métier qui motive la recherche multi-tokens.
        persistClient("Alexis", "Duchat", LocalDate.of(1990, 1, 1));
        flushAndClear();

        assertThat(repo.findAll("duchat alexis")).hasSize(1);
    }

    // ---------------------------------------------------------------------
    // findSimilar : doublons potentiels
    // ---------------------------------------------------------------------

    @Test
    void findSimilar_matcheNomPrenomDate_meme_casse() {
        persistClient("Marie", "Dupont", LocalDate.of(1990, 6, 15));
        flushAndClear();

        List<Client> result = repo.findSimilar("DUPONT", "marie",
                LocalDate.of(1990, 6, 15), null);

        assertThat(result).hasSize(1);
    }

    @Test
    void findSimilar_dateDifferente_neMatchePas() {
        persistClient("Marie", "Dupont", LocalDate.of(1990, 6, 15));
        flushAndClear();

        List<Client> result = repo.findSimilar("Dupont", "Marie",
                LocalDate.of(1990, 6, 16), null);

        assertThat(result).isEmpty();
    }

    @Test
    void findSimilar_matcheParNumeroPieceMemeSiAutresDifferent() {
        // Important : un changement de nom ne doit pas créer un doublon
        // si le numéro de pièce est le même → on alerte quand même.
        Client c = persistClient("Marie", "Dupont", LocalDate.of(1990, 6, 15));
        c.setNumeroPiece("ABC123");
        em.merge(c);
        flushAndClear();

        List<Client> result = repo.findSimilar("Martin", "Jean",
                LocalDate.of(2000, 1, 1), "ABC123");

        assertThat(result).hasSize(1);
    }

    @Test
    void findSimilar_numeroPieceVideOuBlanc_estTraiteCommeNull() {
        // Garde-fou : sans cette normalisation, on matcherait tous les
        // clients sans numéro de pièce à la fois — résultat catastrophique.
        persistClient("Marie", "Dupont", LocalDate.of(1990, 6, 15));
        persistClient("Jean",  "Martin", LocalDate.of(1985, 3, 20));
        flushAndClear();

        assertThat(repo.findSimilar("Inconnu", "X", LocalDate.of(1900, 1, 1), "")).isEmpty();
        assertThat(repo.findSimilar("Inconnu", "X", LocalDate.of(1900, 1, 1), "  ")).isEmpty();
    }

    @Test
    void findSimilar_neRamenePasLesClientsNonIdentifies() {
        // Une description physique « Marie Dupont » accidentelle ne doit
        // pas s'agréger à un client identifié.
        persistClientNonIdentifie("Marie Dupont 1990");
        flushAndClear();

        assertThat(repo.findSimilar("Dupont", "Marie", LocalDate.of(1990, 6, 15), null))
                .isEmpty();
    }

    // ---------------------------------------------------------------------
    // countFiches
    // ---------------------------------------------------------------------

    @Test
    void countFiches_renvoieZeroSiAucuneFiche() {
        Client c = persistClient("Marie", "Dupont", LocalDate.of(1990, 6, 15));
        flushAndClear();

        assertThat(repo.countFiches(c.getId())).isZero();
    }

    @Test
    void countFiches_comptePourLeClientCible() {
        Client c1 = persistClient("Marie", "Dupont", LocalDate.of(1990, 6, 15));
        Client c2 = persistClient("Jean",  "Martin", LocalDate.of(1985, 3, 20));
        Utilisateur u = persistCaissier("c1");
        persistFiche(c1, u, LocalDateTime.now());
        persistFiche(c1, u, LocalDateTime.now());
        persistFiche(c2, u, LocalDateTime.now());
        flushAndClear();

        assertThat(repo.countFiches(c1.getId())).isEqualTo(2);
        assertThat(repo.countFiches(c2.getId())).isEqualTo(1);
    }

    // ---------------------------------------------------------------------
    // getDerniereActivitePourIds : le batch anti N+1
    // ---------------------------------------------------------------------

    @Test
    void getDerniereActivitePourIds_listeVide_renvoieMapVideSansRequete() {
        // Garde-fou contre une JPQL « WHERE id IN () » qui plante.
        assertThat(repo.getDerniereActivitePourIds(List.of())).isEmpty();
        assertThat(repo.getDerniereActivitePourIds(null)).isEmpty();
    }

    @Test
    void getDerniereActivitePourIds_renvoieLeMaxParClient() {
        Client c1 = persistClient("A", "A", LocalDate.of(1990, 1, 1));
        Client c2 = persistClient("B", "B", LocalDate.of(1990, 1, 1));
        Utilisateur u = persistCaissier("u1");
        persistFiche(c1, u, LocalDateTime.of(2026, 1, 1, 12, 0));
        persistFiche(c1, u, LocalDateTime.of(2026, 6, 10, 12, 0));  // plus récent
        persistFiche(c2, u, LocalDateTime.of(2026, 3, 1, 12, 0));
        flushAndClear();

        Map<Long, LocalDate> result = repo.getDerniereActivitePourIds(
                List.of(c1.getId(), c2.getId()));

        assertThat(result).containsEntry(c1.getId(), LocalDate.of(2026, 6, 10))
                          .containsEntry(c2.getId(), LocalDate.of(2026, 3, 1));
    }

    @Test
    void getDerniereActivitePourIds_clientSansFiche_estAbsentDeLaMap() {
        // Régression possible : si on incluait l'entrée avec null, le
        // frontend afficherait « 01/01/1970 » ou plante.
        Client c1 = persistClient("A", "A", LocalDate.of(1990, 1, 1));
        Client c2 = persistClient("B", "B", LocalDate.of(1990, 1, 1));
        Utilisateur u = persistCaissier("u1");
        persistFiche(c1, u, LocalDateTime.of(2026, 6, 10, 12, 0));
        flushAndClear();

        Map<Long, LocalDate> result = repo.getDerniereActivitePourIds(
                List.of(c1.getId(), c2.getId()));

        assertThat(result).containsOnlyKeys(c1.getId());
    }

    // ---------------------------------------------------------------------
    // save / update / delete
    // ---------------------------------------------------------------------

    @Test
    void save_genereId() {
        Client c = new Client();
        c.setIdentifie(true);
        c.setNom("X"); c.setPrenom("Y");
        c.setPays("France");
        repo.save(c);

        assertThat(c.getId()).isNotNull();
    }

    @Test
    void delete_supprimeLeClient() {
        Client c = persistClient("Marie", "Dupont", LocalDate.of(1990, 6, 15));
        Long id = c.getId();
        flushAndClear();

        repo.delete(repo.findById(id).orElseThrow());
        em.flush();

        assertThat(repo.findById(id)).isEmpty();
    }
}
