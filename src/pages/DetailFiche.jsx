import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getFiche } from '../api/fiches.js'

function formatEur(value) {
  if (value == null) return '-'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
}

function formatDate(str) {
  if (!str) return '-'
  // Handle both ISO "YYYY-MM-DD" and "dd/MM/yyyy HH:mm"
  if (str.includes('/')) return str
  try {
    const [y, m, d] = str.slice(0, 10).split('-')
    return `${d}/${m}/${y}`
  } catch {
    return str
  }
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

  const adresseLines = [
    fiche.clientRue,
    [fiche.clientCodePostal, fiche.clientVille].filter(Boolean).join(' '),
    fiche.clientPays,
  ].filter(Boolean)

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Détail de la fiche</h1>
          <p>
            Créée le {fiche.date ?? '-'} par {fiche.creePar}
            {fiche.dateModification && (
              <> — Modifiée le {fiche.dateModification} par {fiche.modifiePar}</>
            )}
          </p>
        </div>
        <div className="page-header-actions no-print">
          <button className="btn btn-secondary" onClick={() => navigate('/accueil')}>
            Retour
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate(`/fiches/${id}/modifier`)}
          >
            Compléter la fiche
          </button>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            Imprimer
          </button>
        </div>
      </div>

      {/* Info client */}
      <div className="detail-client-info">
        <div className="detail-client-info-main">
          <strong>{fiche.clientLibelle || `${fiche.clientPrenom ?? ''} ${fiche.clientNom ?? ''}`.trim()}</strong>
          {fiche.clientIdentifie ? (
            <p>
              {adresseLines.map((l, i) => <span key={i}>{l}<br /></span>)}
              {fiche.clientDateNaissance && <>Né(e) le : {formatDate(fiche.clientDateNaissance)}</>}
            </p>
          ) : (
            <p>{fiche.clientDescriptionPhysique}</p>
          )}
        </div>
        {fiche.clientIdentifie && (
          <div className="detail-client-info-id">
            {fiche.clientTypePiece && <span>Type de pièce : {fiche.clientTypePiece}<br /></span>}
            {fiche.clientNumeroPiece && <span>Numéro : {fiche.clientNumeroPiece}<br /></span>}
            {fiche.clientDateDelivrance && <span>Date de délivrance : {formatDate(fiche.clientDateDelivrance)}<br /></span>}
            {fiche.clientPrefecture && <span>Préfecture : {fiche.clientPrefecture}<br /></span>}
            {fiche.clientPaysDelivrance && <span>Pays de délivrance : {fiche.clientPaysDelivrance}</span>}
          </div>
        )}
      </div>

      {/* Transaction lines */}
      {fiche.lignes?.map((l, i) => (
        <div key={l.id ?? i} className="detail-ligne">
          <div className="detail-ligne-header">
            <div className="detail-ligne-badges">
              {l.typeJeu && <span className={`badge badge-${l.typeJeu}`}>{l.typeJeu}</span>}
              {l.typePaiement && <span className={`badge badge-${l.typePaiement}`}>{l.typePaiement}</span>}
              {l.typeChange && <span className={`badge badge-${l.typeChange}`}>{l.typeChange}</span>}
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              N° Socle : <strong>{l.numeroSocle ?? '-'}</strong>
            </span>
          </div>

          <div className="detail-ligne-grid">
            <div className="detail-ligne-field">
              <label>Montant RGM :</label>
              <strong>{formatEur(l.montantRGM)}</strong>
            </div>
            <div className="detail-ligne-field">
              <label>Change entrant :</label>
              <strong>{formatEur(l.changeEntrant)}</strong>
            </div>
            <div className="detail-ligne-field">
              <label>Change sortant :</label>
              <strong>{formatEur(l.changeSortant)}</strong>
            </div>
          </div>

          <div className="detail-ligne-obs">
            <label>Observations :</label>
            <p>{l.observations || '-'}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
