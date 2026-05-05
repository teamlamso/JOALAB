import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getFiche } from '../api/fiches.js'
import logoJOA from '../assets/logoJOA.svg'

const NB_LIGNES_MIN = 6

function formatEur(value) {
  if (value == null || Number(value) === 0) return ''
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value)
}

function formatDateFr(str) {
  if (!str) return ''
  if (str.includes('/')) return str.slice(0, 10)
  const [y, m, d] = str.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function Check({ on }) {
  return on ? <span className="fp-check">×</span> : null
}

export default function DetailFiche() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [fiche, setFiche] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getFiche(id)
      .then(setFiche)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="loading">Chargement…</div>
  if (error) return <div className="page"><div className="alert-error">{error}</div></div>
  if (!fiche) return null

  const lignes = fiche.lignes ?? []
  const lignesAffichees = [...lignes]
  while (lignesAffichees.length < NB_LIGNES_MIN) lignesAffichees.push(null)

  const totalEntrantPlusRGM = (Number(fiche.totalRGM) || 0) + (Number(fiche.totalEntrant) || 0)

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
    <div className="page">
      <div className="page-header no-print">
        <div className="page-header-left">
          <h1>Détail de la fiche</h1>
          <p>
            Créée le {formatDateFr(fiche.date) || '-'} par {fiche.creePar}
            {fiche.dateModification && (
              <> — Modifiée le {fiche.dateModification} par {fiche.modifiePar}</>
            )}
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/accueil')}>
            Retour
          </button>
          <button className="btn btn-secondary" onClick={() => navigate(`/fiches/${id}/modifier`)}>
            Compléter la fiche
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            Imprimer
          </button>
        </div>
      </div>

      <div className="fiche-papier">
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
            {fiche.clientPpe && <span className="fp-ppe">PPE</span>}
          </span>
        </div>

        <div className="fp-identite-grid">
          <div className="fp-identite-col">
            <div className="fp-identite-titre">IDENTITÉ DU JOUEUR</div>
            {fiche.clientIdentifie ? (
              <>
                <div className="fp-identite-nom">
                  {fiche.clientPrenom} {fiche.clientNom}
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
            <col style={{ width: '5.5%' }} />   {/* CHANGE */}
            <col style={{ width: '6.5%' }} />   {/* Alerte Montant */}
            <col style={{ width: '5.5%' }} />   {/* Alerte N° appareil */}
            <col style={{ width: '8.5%' }} />   {/* Entrant */}
            <col style={{ width: '8.5%' }} />   {/* Sortant */}
            <col style={{ width: '4.5%' }} />   {/* MAS */}
            <col style={{ width: '4.5%' }} />   {/* JTE */}
            <col style={{ width: '4.5%' }} />   {/* JTT */}
            <col style={{ width: '4.5%' }} />   {/* Espèces */}
            <col style={{ width: '4.5%' }} />   {/* Chèque */}
            <col style={{ width: '4.5%' }} />   {/* CB */}
            <col style={{ width: '4.5%' }} />   {/* Jeton */}
            <col style={{ width: '4.5%' }} />   {/* Plaque */}
            <col style={{ width: '4.5%' }} />   {/* Ticket */}
            <col style={{ width: '17.5%' }} />  {/* Observations */}
            <col style={{ width: '6.5%' }} />   {/* Caissier */}
          </colgroup>
          <thead>
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
                <td className="fp-td-num">{l ? formatEur(l.montantRGM) : ''}</td>
                <td className="fp-td-num">{l?.numeroSocle ?? ''}</td>
                <td className="fp-td-num">{l ? formatEur(l.changeEntrant) : ''}</td>
                <td className="fp-td-num">{l ? formatEur(l.changeSortant) : ''}</td>
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
              <td className="fp-td-num"><strong>{formatEur(totalEntrantPlusRGM)}</strong></td>
              <td className="fp-td-num"><strong>{formatEur(fiche.totalSortant)}</strong></td>
              <td colSpan={11}></td>
            </tr>
          </tbody>
        </table>

        <div className="fp-nota">
          <strong><u>Nota Bene</u></strong><br />
          Il y a lieu de procéder à l’enregistrement du joueur sur le registre des changes lorsque :<br />
          - le montant cumulé des changes entrants effectués au cours d’une séance par le joueur est supérieur à 2.000 euros,<br />
          - le montant cumulé des changes sortants effectués au cours d’une séance par le joueur est supérieur à 2.000 euros.
        </div>
      </div>
    </div>
  )
}
