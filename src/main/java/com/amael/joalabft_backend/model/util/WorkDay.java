package com.amael.joalabft_backend.model.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * Représente la journée de travail du casino : commence à {@link #START_HOUR}h
 * et se termine à 05h59 le lendemain. Un horodatage tombant avant 06h00
 * appartient encore au jour précédent.
 *
 * <p>Toutes les opérations de « maintenant » s'évaluent dans le fuseau
 * {@link #ZONE} (Europe/Paris) plutôt que dans le fuseau du JVM. C'est
 * indispensable en déploiement Docker, où le container est généralement
 * en UTC : sans ce verrouillage, la bascule 06h00 dérive et la journée
 * de travail se confond avec la journée civile UTC.
 */
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
