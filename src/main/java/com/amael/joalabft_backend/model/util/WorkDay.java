package com.amael.joalabft_backend.model.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;


public final class WorkDay {

    /** Heure de bascule (06h00) du jour de travail. */
    public static final int START_HOUR = 6;

    /** Fuseau métier — l'établissement est en France métropolitaine. */
    public static final ZoneId ZONE = ZoneId.of("Europe/Paris");

    private WorkDay() {}

    /** Convertit un horodatage en sa journée de travail correspondante. */
    public static LocalDate from(LocalDateTime dt) {
        if (dt == null) return null;
        return dt.getHour() < START_HOUR
                ? dt.toLocalDate().minusDays(1)
                : dt.toLocalDate();
    }

    /** Horodatage courant dans le fuseau métier. */
    public static LocalDateTime now() {
        return LocalDateTime.now(ZONE);
    }

    /** Journée de travail courante. */
    public static LocalDate today() {
        return from(now());
    }
}
