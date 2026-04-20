package com.amael.joalabft_backend.model.dto.request;

import java.util.List;

/** Corps de la requête de création ou mise à jour d'une fiche LAB-FT. */
public class FicheRequest {

    /** Identifiant du client associé à la fiche. */
    public Long clientId;

    /** Liste ordonnée des lignes de transaction. */
    public List<LigneTransactionRequest> lignes;
}
