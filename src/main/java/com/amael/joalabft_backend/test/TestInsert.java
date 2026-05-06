package com.amael.joalabft_backend.test;

import com.amael.joalabft_backend.model.entity.Client;
import com.amael.joalabft_backend.model.entity.FicheLABFT;
import com.amael.joalabft_backend.model.entity.LigneTransaction;
import com.amael.joalabft_backend.model.entity.Utilisateur;
import com.amael.joalabft_backend.model.enums.RoleUtilisateur;
import com.amael.joalabft_backend.model.enums.TypeChange;
import com.amael.joalabft_backend.model.enums.TypeJeu;
import com.amael.joalabft_backend.model.enums.TypePaiement;
import com.amael.joalabft_backend.model.repository.ClientRepository;
import com.amael.joalabft_backend.model.repository.FicheLABFTRepository;
import com.amael.joalabft_backend.model.repository.UtilisateurRepository;
import jakarta.annotation.PostConstruct;
import jakarta.ejb.EJB;
import jakarta.ejb.Singleton;
import jakarta.ejb.Startup;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Bean de démarrage qui insère les données de test au premier lancement.
 *
 * <p>S'exécute automatiquement après le déploiement grâce à {@code @Singleton + @Startup}.
 * Comme EclipseLink est configuré en {@code drop-and-create-tables}, les tables sont
 * recréées à chaque redémarrage et les données sont réinsérées systématiquement.
 *
 * <p><strong>Comptes de test</strong> — mot de passe : {@code password}
 * <ul>
 *   <li>{@code aduchat} — Caissier</li>
 *   <li>{@code mcurie}  — Responsable caisse</li>
 *   <li>{@code jbond}   — MCD</li>
 * </ul>
 */
@Singleton
@Startup
public class TestInsert {

    @EJB
    private UtilisateurRepository utilisateurRepository;

    @EJB
    private ClientRepository clientRepository;

    @EJB
    private FicheLABFTRepository ficheRepository;

    @PostConstruct
    public void init() {
        // ── 1. Utilisateurs ──────────────────────────────────────────────────────
        Utilisateur alexis = utilisateur("aduchat",  "Duchat", "Alexis", RoleUtilisateur.CAISSIER);
        Utilisateur marie  = utilisateur("mcurie",  "Curie",  "Marie",  RoleUtilisateur.RESPONSABLE_CAISSE);
        Utilisateur james  = utilisateur("jbond",   "Bond",   "James",  RoleUtilisateur.MCD);

        alexis = utilisateurRepository.save(alexis);
        marie  = utilisateurRepository.save(marie);
        james  = utilisateurRepository.save(james);

        // ── 2. Clients ───────────────────────────────────────────────────────────
        Client gustavo = new Client();
        gustavo.setIdentifie(true);
        gustavo.setNom("Press");
        gustavo.setPrenom("Gustavo");
        gustavo.setDateNaissance(LocalDate.of(1987, 1, 12));
        gustavo.setLieuNaissance("Paris (75)");
        gustavo.setPpe(true);
        gustavo.setRue("123 Rue de la République");
        gustavo.setCodePostal("75001");
        gustavo.setVille("Paris");
        gustavo.setPays("France");
        gustavo.setTypePiece("CNI");
        gustavo.setNumeroPiece("0512345678901");
        gustavo.setDateDelivrance(LocalDate.of(2020, 1, 10));
        gustavo.setPrefectureDelivrance("Paris (75)");
        gustavo = clientRepository.save(gustavo);
        System.out.println("Client Gustavo Press inséré avec ID : " + gustavo.getId());

        Client julien = new Client();
        julien.setIdentifie(true);
        julien.setNom("Moreau");
        julien.setPrenom("Julien");
        julien.setDateNaissance(LocalDate.of(1985, 5, 15));
        julien.setLieuNaissance("Lyon (69)");
        julien.setRue("8 Avenue Jean Jaurès");
        julien.setCodePostal("69007");
        julien.setVille("Lyon");
        julien.setPays("France");
        julien.setTypePiece("Passeport Français");
        julien.setNumeroPiece("19FR45678");
        julien.setDateDelivrance(LocalDate.of(2019, 3, 22));
        julien.setPrefectureDelivrance("Lyon (69)");
        julien = clientRepository.save(julien);

        Client paityn = new Client();
        paityn.setIdentifie(true);
        paityn.setNom("George");
        paityn.setPrenom("Paityn");
        paityn.setDateNaissance(LocalDate.of(2001, 9, 25));
        paityn.setLieuNaissance("Londres (Royaume-Uni)");
        paityn.setRue("14 Rue Paradis");
        paityn.setCodePostal("13001");
        paityn.setVille("Marseille");
        paityn.setPays("France");
        paityn.setTypePiece("Passeport Etranger");
        paityn.setNumeroPiece("AB1234567");
        paityn.setDateDelivrance(LocalDate.of(2021, 6, 15));
        paityn.setPaysDelivrance("Royaume-Uni");
        paityn = clientRepository.save(paityn);

        Client martin = new Client();
        martin.setIdentifie(true);
        martin.setNom("Defroist");
        martin.setPrenom("Martin");
        martin.setDateNaissance(LocalDate.of(2004, 11, 9));
        martin.setLieuNaissance("Besançon (25)");
        martin.setRue("280 Rue de la Montée");
        martin.setCodePostal("25000");
        martin.setVille("Besançon");
        martin.setPays("France");
        martin.setTypePiece("Passeport Français");
        martin.setNumeroPiece("KF12AD021");
        martin.setDateDelivrance(LocalDate.of(2024, 1, 13));
        martin.setPrefectureDelivrance("Besançon (25)");
        martin = clientRepository.save(martin);

        Client anonyme = new Client();
        anonyme.setIdentifie(false);
        anonyme.setDescriptionPhysique("Homme, blond, tatouage bras droit, environ 40 ans");
        anonyme = clientRepository.save(anonyme);

        // ── 3. Fiches + Lignes (cascade automatique) ─────────────────────────────

        // Fiche 1 — Gustavo Press / aduchat (datée de la veille)
        FicheLABFT fiche1 = new FicheLABFT();
        fiche1.setClient(gustavo);
        fiche1.setCreePar(alexis);
        fiche1.setDateCreation(LocalDateTime.now().minusDays(1));
        fiche1.addLigne(ligne(alexis, TypeJeu.MAS, TypePaiement.ESPECE, null,        36,   "550.00", null,      "1254.78", "BP 546721 Socle 36"));
        fiche1.addLigne(ligne(alexis, TypeJeu.JT,  TypePaiement.CB,     TypeChange.JETON, null, null,      "600.00",      null, "CB JT"));
        ficheRepository.save(fiche1);

        FicheLABFT fiche5 = new FicheLABFT();
        fiche5.setClient(martin);
        fiche5.setCreePar(alexis);
        fiche5.setDateCreation(LocalDateTime.now().minusDays(1));
        fiche5.addLigne(ligne(alexis, TypeJeu.MAS, TypePaiement.ESPECE, null,        102,   "900.00", null,      "725.00", "BP 546725 Socle 102"));
        fiche5.addLigne(ligne(alexis, TypeJeu.MAS, TypePaiement.ESPECE, null,        102,   "725.00", null,      null, null));
        fiche5.addLigne(ligne(alexis, TypeJeu.MAS, TypePaiement.ESPECE, null,        102,   "725.00", null,      null, null));
        fiche5.addLigne(ligne(alexis, TypeJeu.MAS, TypePaiement.ESPECE, null,        102,   "725.00", null,      null, null));
        fiche5.addLigne(ligne(alexis, TypeJeu.MAS, TypePaiement.ESPECE, null,        102,   "725.00", null,      null, null));
        fiche5.addLigne(ligne(alexis, TypeJeu.MAS, TypePaiement.ESPECE, null,        102,   "725.00", null,      null, null));
        fiche5.addLigne(ligne(alexis, TypeJeu.MAS, TypePaiement.ESPECE, null,        102,   "725.00", null,      null, null));
        fiche5.addLigne(ligne(alexis, TypeJeu.MAS, TypePaiement.ESPECE, null,        102,   "725.00", null,      null, null));
        fiche5.addLigne(ligne(alexis, TypeJeu.MAS, TypePaiement.ESPECE, null,        102,   "725.00", null,      null, null));
        fiche5.addLigne(ligne(alexis, TypeJeu.MAS, TypePaiement.ESPECE, null,        102,   "725.00", null,      null, null));
        fiche5.addLigne(ligne(alexis, TypeJeu.MAS, TypePaiement.ESPECE, null,        102,   "725.00", null,      null, null));
        fiche5.addLigne(ligne(alexis, TypeJeu.MAS, TypePaiement.ESPECE, null,        102,   "725.00", null,      null, null));
        fiche5.addLigne(ligne(alexis, TypeJeu.MAS, TypePaiement.ESPECE, null,        102,   "725.00", null,      null, null));
        fiche5.addLigne(ligne(alexis, TypeJeu.MAS, TypePaiement.ESPECE, null,        102,   "725.00", null,      null, null));
        fiche5.addLigne(ligne(marie,  TypeJeu.JT,  TypePaiement.CB,     TypeChange.JETON, null, null,      "2150.00",      null, "CB JT"));
        ficheRepository.save(fiche5);

        // Fiche 2 — Julien Moreau / mcurie
        FicheLABFT fiche2 = new FicheLABFT();
        fiche2.setClient(julien);
        fiche2.setCreePar(marie);
        fiche2.addLigne(ligne(marie, TypeJeu.MAS, TypePaiement.CHEQUE, TypeChange.TICKET,  null, null, "760.00",      null, "Divers Cheques"));
        fiche2.addLigne(ligne(marie, TypeJeu.MAS, TypePaiement.ESPECE, null,  null, null, null,      "876.98", "Remb Tickets"));
        ficheRepository.save(fiche2);

        // Fiche 3 — Paityn George / aduchat
        FicheLABFT fiche3 = new FicheLABFT();
        fiche3.setClient(paityn);
        fiche3.setCreePar(alexis);
        fiche3.addLigne(ligne(alexis, TypeJeu.MAS, TypePaiement.ESPECE, null,         null,  null, null, "1550.56", "BP546727 Socle 101 CSG 212.43"));
        fiche3.addLigne(ligne(alexis, TypeJeu.JT,  TypePaiement.CB,     TypeChange.PLAQUE, null, null,      "2100.00",      null, "Mise sur table blackjack"));
        ficheRepository.save(fiche3);

        // Fiche 4 — Client non-identifié / aduchat
        FicheLABFT fiche4 = new FicheLABFT();
        fiche4.setClient(anonyme);
        fiche4.setCreePar(alexis);
        fiche4.addLigne(ligne(alexis, TypeJeu.MAS, null, null, 35,  "950.00", null, null, null));
        ficheRepository.save(fiche4);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private Utilisateur utilisateur(String identifiant, String nom, String prenom, RoleUtilisateur role) {
        Utilisateur u = new Utilisateur();
        u.setIdentifiant(identifiant);
        u.setMotDePasse(sha256("password"));
        u.setNom(nom);
        u.setPrenom(prenom);
        u.setRole(role);
        return u;
    }

    private LigneTransaction ligne(Utilisateur caissier,
                                   TypeJeu jeu, TypePaiement paiement, TypeChange change,
                                   Integer socle, String rgm, String entrant, String sortant,
                                   String obs) {
        LigneTransaction l = new LigneTransaction();
        l.setCaissier(caissier);
        l.setTypeJeu(jeu);
        l.setTypePaiement(paiement);
        l.setTypeChange(change);
        l.setNumeroSocle(socle);
        l.setMontantRGM(rgm != null ? new BigDecimal(rgm) : null);
        l.setChangeEntrant(entrant != null ? new BigDecimal(entrant) : null);
        l.setChangeSortant(sortant != null ? new BigDecimal(sortant) : null);
        l.setObservations(obs);
        return l;
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(64);
            for (byte b : hash) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 non disponible", e);
        }
    }
}
