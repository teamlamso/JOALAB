package com.amael.joalabft_backend.model.dto.response;

import java.util.ArrayList;
import java.util.List;

/**
 * Résultat d'un import Excel de clients.
 * Tous les compteurs sont incrémentés au fil du parcours du fichier.
 */
public class ImportClientsResponse {
    /** Nombre de clients effectivement créés. */
    public int imported = 0;
    /** Nombre de lignes ignorées car un client similaire existait déjà. */
    public int skipped = 0;
    /** Nombre de clients créés mais avec au moins un champ obligatoire vide. */
    public int incomplete = 0;
    /** Erreurs rencontrées sur des lignes spécifiques (préfixé par "Ligne N : "). */
    public List<String> errors = new ArrayList<>();

    public ImportClientsResponse() {}
}
