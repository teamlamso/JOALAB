package com.amael.joalabft_backend.model.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PasswordHasherTest {

    @Test
    void hash_produitUnHashBCryptDe60Caracteres() {
        String hash = PasswordHasher.hash("password123");
        assertThat(hash).hasSize(60).startsWith("$2a$12$");
    }

    @Test
    void hash_motDePasseNull_leveIllegalArgumentException() {
        assertThatThrownBy(() -> PasswordHasher.hash(null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void verify_motDePasseCorrect_retourneTrue() {
        String hash = PasswordHasher.hash("Sup3rS3cret!");
        assertThat(PasswordHasher.verify("Sup3rS3cret!", hash)).isTrue();
    }

    @Test
    void verify_motDePasseIncorrect_retourneFalse() {
        String hash = PasswordHasher.hash("Sup3rS3cret!");
        assertThat(PasswordHasher.verify("autreMotDePasse", hash)).isFalse();
    }

    @Test
    void verify_hashNull_retourneFalse() {
        assertThat(PasswordHasher.verify("password", null)).isFalse();
    }

    @Test
    void verify_motDePasseNull_retourneFalse() {
        String hash = PasswordHasher.hash("password");
        assertThat(PasswordHasher.verify(null, hash)).isFalse();
    }

    @Test
    void verify_hashLegacySHA256_correct_retourneTrue() {
        // SHA-256 de "secret" en hexa
        String legacy = "2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b";
        assertThat(PasswordHasher.verify("secret", legacy)).isTrue();
    }

    @Test
    void verify_hashLegacySHA256_incorrect_retourneFalse() {
        String legacy = "2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b";
        assertThat(PasswordHasher.verify("wrong", legacy)).isFalse();
    }

    @Test
    void isLegacyHash_hashSHA256_retourneTrue() {
        String legacy = "2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b";
        assertThat(PasswordHasher.isLegacyHash(legacy)).isTrue();
    }

    @Test
    void isLegacyHash_hashBCrypt_retourneFalse() {
        String bcrypt = PasswordHasher.hash("password");
        assertThat(PasswordHasher.isLegacyHash(bcrypt)).isFalse();
    }

    @Test
    void isLegacyHash_null_retourneFalse() {
        assertThat(PasswordHasher.isLegacyHash(null)).isFalse();
    }

    @Test
    void isLegacyHash_chaineVide_retourneFalse() {
        assertThat(PasswordHasher.isLegacyHash("")).isFalse();
    }

    @Test
    void isLegacyHash_mauvaiseLongueur_retourneFalse() {
        assertThat(PasswordHasher.isLegacyHash("abcdef")).isFalse();
    }

    @Test
    void isLegacyHash_caracteresNonHex_retourneFalse() {
        // 64 caractères mais avec 'z' qui n'est pas hex
        String pasHex = "z".repeat(64);
        assertThat(PasswordHasher.isLegacyHash(pasHex)).isFalse();
    }

    @Test
    void hash_deuxHashes_sontDifferents() {
        // Le salt aléatoire garantit que deux hashes du même mot de passe diffèrent.
        String h1 = PasswordHasher.hash("password");
        String h2 = PasswordHasher.hash("password");
        assertThat(h1).isNotEqualTo(h2);
    }
}
