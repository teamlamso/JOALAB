package com.amael.joalabft_backend.model.util;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Représente la journée de travail du casino : commence à {@link #START_HOUR}h
 * et se termine à 05h59 le lendemain. Un horodatage tombant avant 06h00
 * appartient encore au jour précédent.
 */
public final class WorkDay {

    /** Heure de bascule (06h00) du jour de travail. */
    public static final int START_HOUR = 6;

    private WorkDay() {}

    /** Convertit un horodatage en sa journée de travail correspondante. */
    public static LocalDate from(LocalDateTime dt) {
        if (dt == null) return null;
        return dt.getHour() < START_HOUR
                ? dt.toLocalDate().minusDays(1)
                : dt.toLocalDate();
    }

    /** Journée de travail courante (basée sur {@link LocalDateTime#now()}). */
    public static LocalDate today() {
        return from(LocalDateTime.now());
    }
}
