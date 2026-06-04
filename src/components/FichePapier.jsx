import logoJOA from '../assets/logoJOA.svg'
import { formatLibelle } from '../utils/libelle.js'
import { formatDateFr, formatEur } from '../utils/formatters.js'

const NB_LIGNES_MIN = 6

const eur = (v) => formatEur(v, '')

function Check({ on }) {
  return on ? <span className="fp-check">×</span> : null
}

/**
 * Rendu de la fiche LAB-FT au format papier officiel.
 * Utilisé à la fois dans DetailFiche (consultation/impression unique)
 * et dans ImprimerFiches (impression groupée de plusieurs fiches).
 *
 * Si {@code typeFiltre} est fourni, seules les lignes de ce type sont affichées
 * et les totaux sont recalculés en conséquence (utilisé pour rendre une sous-fiche
 * par type de jeu présent).
 */
export default function FichePapier({ fiche, pageBreakBefore = false, typeFiltre = null }) {
  const toutesLignes = fiche.lignes ?? []
  const lignes = typeFiltre
    ? toutesLignes.filter((l) => l.typeJeu === typeFiltre)
    : toutesLignes
  const lignesAffichees = [...lignes]
  while (lignesAffichees.length < NB_LIGNES_MIN) lignesAffichees.push(null)

  // Si filtré, on recalcule les totaux à partir des lignes filtrées.
  const sommer = (champ) => lignes.reduce((s, l) => s + (Number(l[champ]) || 0), 0)
  const totalRGM      = typeFiltre ? sommer('montantRGM')    : (Number(fiche.totalRGM)     || 0)
  const totalEntrant  = typeFiltre ? sommer('changeEntrant') : (Number(fiche.totalEntrant) || 0)
  const totalSortant  = typeFiltre ? sommer('changeSortant') : (Number(fiche.totalSortant) || 0)
  const totalEntrantPlusRGM = totalRGM + totalEntrant

  const adresseLignes = [
    fiche.clientRue,
    [fiche.clientCodePostal, fiche.clientVille].filter(Boolean).join(' '),
    fiche.clientPays,
  ].filter(Boolean)

  const pieceLignes = [
    fiche.clientTypePiece,
    fiche.clientNumeroPiece && `N° ${fiche.clientNumeroPiece}`,
    fiche.clientDateDelivrance && `Délivrée le ${formatDateFr(fiche.clientDateDelivrance)}`,
    fiche.clientPrefecture && `Préfecture : ${fiche.clientPrefecture}`,
    fiche.clientPaysDelivrance && `Pays : ${fiche.clientPaysDelivrance}`,
  ].filter(Boolean)

  return (
    <div
      className={`fiche-papier${pageBreakBefore ? ' fiche-papier-page-break' : ''}`}
      data-fiche-id={fiche.id}
      data-type={typeFiltre || undefined}
    >
      <div className="fp-titre-bar">
        <div className="fp-titre-tag">LAB-FT 1</div>
        <div className="fp-titre-main">FICHE DE SUIVI INFORMEL DES CHANGES MULTIPLES</div>
        <div className="fp-titre-logo">
          <img src={logoJOA} alt="JOA" />
        </div>
      </div>

      <div className="fp-casino-bar">
        <span><strong>CASINO</strong> SLGV</span>
        <span className="fp-casino-right">
          <strong>Date :</strong> {formatDateFr(fiche.date)}
          {typeFiltre && (
            <span className={`fp-badge-jeu fp-badge-jeu-${typeFiltre.toLowerCase()}`}>{typeFiltre}</span>
          )}
          {fiche.clientPpe && <span className="fp-ppe">PPE</span>}
        </span>
      </div>

      <div className="fp-identite-grid">
        <div className="fp-identite-col">
          <div className="fp-identite-titre">IDENTITÉ DU JOUEUR</div>
          {fiche.clientIdentifie ? (
            <>
              <div className="fp-identite-nom">
                {formatLibelle(fiche.clientPrenom, fiche.clientNom)}
              </div>
              {fiche.clientDateNaissance && (
                <div>Né(e) le {formatDateFr(fiche.clientDateNaissance)}</div>
              )}
              {fiche.clientLieuNaissance && (
                <div>à {fiche.clientLieuNaissance}</div>
              )}
            </>
          ) : (
            <div className="fp-identite-desc">{fiche.clientDescriptionPhysique}</div>
          )}
        </div>
        <div className="fp-identite-col">
          <div className="fp-identite-titre">ADRESSE</div>
          {fiche.clientIdentifie && adresseLignes.length > 0 ? (
            adresseLignes.map((l, i) => <div key={i}>{l}</div>)
          ) : (
            <div className="fp-empty">—</div>
          )}
        </div>
        <div className="fp-identite-col">
          <div className="fp-identite-titre">PIÈCE D’IDENTITÉ</div>
          {fiche.clientIdentifie && pieceLignes.length > 0 ? (
            pieceLignes.map((l, i) => <div key={i}>{l}</div>)
          ) : (
            <div className="fp-empty">—</div>
          )}
        </div>
      </div>

      <table className="fp-table">
        <colgroup>
          <col style={{ width: '5.5%' }} />
          <col style={{ width: '6.5%' }} />
          <col style={{ width: '5.5%' }} />
          <col style={{ width: '8.5%' }} />
          <col style={{ width: '8.5%' }} />
          <col style={{ width: '4.5%' }} />
          <col style={{ width: '4.5%' }} />
          <col style={{ width: '4.5%' }} />
          <col style={{ width: '4.5%' }} />
          <col style={{ width: '4.5%' }} />
          <col style={{ width: '4.5%' }} />
          <col style={{ width: '4.5%' }} />
          <col style={{ width: '4.5%' }} />
          <col style={{ width: '4.5%' }} />
          <col style={{ width: '17.5%' }} />
          <col style={{ width: '6.5%' }} />
        </colgroup>
        <thead>
          <tr className="fp-tr-spacer" aria-hidden="true">
            <td colSpan={16}></td>
          </tr>
          <tr className="fp-tr-cat">
            <th rowSpan={2} className="fp-th-change">CHANGE</th>
            <th colSpan={2} className="fp-th-alerte">ALERTE SYSTEME ONLINE</th>
            <th rowSpan={2} className="fp-th-vert">MONTANT DU CHANGE ENTRANT</th>
            <th rowSpan={2} className="fp-th-vert">MONTANT DU CHANGE SORTANT</th>
            <th colSpan={3} className="fp-th-jeu">JEU CONCERNE</th>
            <th colSpan={3} className="fp-th-mode">MODE - PAIEMENT</th>
            <th colSpan={3} className="fp-th-mode">MODE - CHANGE</th>
            <th rowSpan={2} className="fp-th-obs">OBSERVATIONS</th>
            <th rowSpan={2} className="fp-th-caissier">CAISSIER</th>
          </tr>
          <tr className="fp-tr-sub">
            <th className="fp-th-alerte fp-th-alerte-montant">Montant</th>
            <th className="fp-th-alerte fp-th-alerte-num">N° appareil</th>
            <th className="fp-th-jeu">MAS</th>
            <th className="fp-th-jeu">JTE</th>
            <th className="fp-th-jeu">JTT</th>
            <th className="fp-th-mode">Espèces</th>
            <th className="fp-th-mode">Chèque</th>
            <th className="fp-th-mode">CB</th>
            <th className="fp-th-mode">Jeton</th>
            <th className="fp-th-mode">Plaque</th>
            <th className="fp-th-mode">Ticket</th>
          </tr>
        </thead>
        <tbody>
          {lignesAffichees.map((l, i) => (
            <tr key={i}>
              <td className="fp-td-change">{i + 1}.</td>
              <td className="fp-td-num">
                {l ? eur(l.montantRGM) : ''}
                {l?.enregistreFrontCage && (
                  <span className="fp-frontcage" title="Enregistré sur FrontCage"> ✓</span>
                )}
              </td>
              <td className="fp-td-num">{l?.numeroSocle ?? ''}</td>
              <td className="fp-td-num">
                {l ? eur(l.changeEntrant) : ''}
                {l?.enregistreFrontCageEntrant && (
                  <span className="fp-frontcage" title="Enregistré sur FrontCage"> ✓</span>
                )}
              </td>
              <td className="fp-td-num">{l ? eur(l.changeSortant) : ''}</td>
              <td className="fp-td-check"><Check on={l?.typeJeu === 'MAS'} /></td>
              <td className="fp-td-check"><Check on={l?.typeJeu === 'JTE'} /></td>
              <td className="fp-td-check"><Check on={l?.typeJeu === 'JT'} /></td>
              <td className="fp-td-check"><Check on={l?.typePaiement === 'ESPECE'} /></td>
              <td className="fp-td-check"><Check on={l?.typePaiement === 'CHEQUE'} /></td>
              <td className="fp-td-check"><Check on={l?.typePaiement === 'CB'} /></td>
              <td className="fp-td-check"><Check on={l?.typeChange === 'JETON'} /></td>
              <td className="fp-td-check"><Check on={l?.typeChange === 'PLAQUE'} /></td>
              <td className="fp-td-check"><Check on={l?.typeChange === 'TICKET'} /></td>
              <td className="fp-td-obs">{l?.observations ?? ''}</td>
              <td className="fp-td-caissier">{l ? (l.caissier ?? fiche.creePar) : ''}</td>
            </tr>
          ))}
          <tr className="fp-tr-totaux">
            <td className="fp-td-change"><strong>Totaux</strong></td>
            <td colSpan={2}></td>
            <td className="fp-td-num"><strong>{eur(totalEntrantPlusRGM)}</strong></td>
            <td className="fp-td-num"><strong>{eur(totalSortant)}</strong></td>
            <td colSpan={11}></td>
          </tr>
        </tbody>
        <tfoot className="fp-tfoot-spacer" aria-hidden="true">
          <tr><td colSpan={16}></td></tr>
        </tfoot>
      </table>

      <div className="fp-nota">
        <strong><u>Nota Bene</u></strong><br />
        Il y a lieu de procéder à l’enregistrement du joueur sur le registre des changes lorsque :<br />
        - le montant cumulé des changes entrants effectués au cours d’une séance par le joueur est supérieur à 2.000 euros,<br />
        - le montant cumulé des changes sortants effectués au cours d’une séance par le joueur est supérieur à 2.000 euros.
      </div>
    </div>
  )
}
