package com.amael.joalabft_backend.model.util;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

class WorkDayTest {

    @Test
    void from_avant6h_renvoieJourPrecedent() {
        LocalDateTime nuit = LocalDateTime.of(2026, 1, 15, 3, 0);
        assertThat(WorkDay.from(nuit)).isEqualTo(LocalDate.of(2026, 1, 14));
    }

    @Test
    void from_a6hPile_renvoieJourCourant() {
        LocalDateTime aube = LocalDateTime.of(2026, 1, 15, 6, 0);
        assertThat(WorkDay.from(aube)).isEqualTo(LocalDate.of(2026, 1, 15));
    }

    @Test
    void from_apres6h_renvoieJourCourant() {
        LocalDateTime apresMidi = LocalDateTime.of(2026, 1, 15, 14, 30);
        assertThat(WorkDay.from(apresMidi)).isEqualTo(LocalDate.of(2026, 1, 15));
    }

    @Test
    void from_a23h59_renvoieJourCourant() {
        LocalDateTime quasiMinuit = LocalDateTime.of(2026, 1, 15, 23, 59);
        assertThat(WorkDay.from(quasiMinuit)).isEqualTo(LocalDate.of(2026, 1, 15));
    }

    @Test
    void from_null_renvoieNull() {
        assertThat(WorkDay.from(null)).isNull();
    }

    @Test
    void zone_estEuropeParis() {
        assertThat(WorkDay.ZONE).isEqualTo(ZoneId.of("Europe/Paris"));
    }

    @Test
    void now_estDansLaJourneeCourante() {
        // La méthode ne peut pas être mockée sans Clock, mais on peut au moins
        // vérifier qu'elle renvoie un horodatage cohérent et non null.
        LocalDateTime n = WorkDay.now();
        LocalDateTime ref = LocalDateTime.now(WorkDay.ZONE);
        assertThat(n).isNotNull();
        // Tolérance de 5 secondes — l'horloge avance entre les deux appels.
        assertThat(java.time.Duration.between(n, ref).abs().getSeconds()).isLessThanOrEqualTo(5);
    }

    @Test
    void today_estCoherenteAvecNow() {
        LocalDate today = WorkDay.today();
        assertThat(today).isEqualTo(WorkDay.from(WorkDay.now()));
    }
}
