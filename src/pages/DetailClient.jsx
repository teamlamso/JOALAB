import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getClient } from '../api/clients.js'

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function formatDate(iso) {
  if (!iso) return '-'
  try {
    const [y, m, d] = iso.slice(0, 10).split('-')
    return `${d}/${m}/${y}`
  } catch {
    return iso
  }
}

function formatEur(value) {
  if (value == null || value === 0) return '-'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
}

export default function DetailClient() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getClient(id)
      .then(setClient)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="loading">Chargement…</div>
  if (error) return <div className="page"><div className="alert-error">{error}</div></div>
  if (!client) return null

  const adresseLines = [
    client.rue,
    client.complement,
    [client.codePostal, client.ville].filter(Boolean).join(' '),
    client.pays,
  ].filter(Boolean)

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Profil client</h1>
          <p>Détail des informations et historique des fiches.</p>
        </div>
        <div className="page-header-actions no-print">
          <button className="btn btn-secondary" onClick={() => navigate('/clients')}>
            Retour
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/fiches/identification', { state: { preselectClient: { id: client.id, libelle: client.libelle } } })}
          >
            + Ajouter une fiche
          </button>
        </div>
      </div>

      {/* Info client */}
      <div className="client-info-card">
        <div className="client-info-main">
          <strong>{client.libelle}</strong>
          {client.identifie ? (
            <p>
              {adresseLines.map((l, i) => <span key={i}>{l}<br /></span>)}
              {client.dateNaissance && <>Né(e) le : {formatDate(client.dateNaissance)}</>}
            </p>
          ) : (
            <p>{client.descriptionPhysique}</p>
          )}
        </div>
        {client.identifie && (
          <div className="client-info-id">
            {client.typePiece && <span>Type de pièce : {client.typePiece}<br /></span>}
            {client.dateDelivrance && <span>Date de délivrance : {formatDate(client.dateDelivrance)}<br /></span>}
            {client.prefectureDelivrance && <span>Préfecture : {client.prefectureDelivrance}</span>}
          </div>
        )}
      </div>

      {/* Historique fiches */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Caissier</th>
              <th>Total RGM</th>
              <th>Total entrant</th>
              <th>Total sortant</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {(!client.fiches || client.fiches.length === 0) ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  Aucune fiche.
                </td>
              </tr>
            ) : (
              client.fiches.map((f) => (
                <tr key={f.id}>
                  <td>{formatDate(f.date)}</td>
                  <td>{f.creePar}</td>
                  <td>{formatEur(f.totalRGM)}</td>
                  <td>{formatEur(f.totalChangeEntrant)}</td>
                  <td>{formatEur(f.totalChangeSortant)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn-icon"
                      title="Voir la fiche"
                      onClick={() => navigate(`/fiches/${f.id}`)}
                    >
                      <EyeIcon />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
