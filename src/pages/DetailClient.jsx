import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getClient, deleteClient } from '../api/clients.js'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { EyeIcon } from '../components/Icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useNotify } from '../context/NotificationContext.jsx'
import { peutSupprimerClient } from '../utils/permissions.js'
import { texteChampsManquants } from '../utils/champsClient.js'
import { formatDateFr, formatEur } from '../utils/formatters.js'

export default function DetailClient() {
  const { id } = useParams()
  const navigate = useNavigate()
  const notify = useNotify()
  const { user } = useAuth()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmSuppr, setConfirmSuppr] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getClient(id)
      .then(setClient)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteClient(id)
      notify('Client supprimé', 'success')
      navigate('/clients')
    } catch (e) {
      notify(`Erreur : ${e.message}`, 'error')
      setDeleting(false)
      setConfirmSuppr(false)
    }
  }

  if (loading) return <div className="loading">Chargement…</div>
  if (error) return <div className="page"><div className="alert-error">{error}</div></div>
  if (!client) return null

  const peutSupprimer = peutSupprimerClient(user?.role)

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
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>
            Retour
          </button>
          <button className="btn btn-secondary" onClick={() => navigate(`/clients/${id}/modifier`)}>
            Modifier
          </button>
          {peutSupprimer && (
            <button className="btn btn-danger" onClick={() => setConfirmSuppr(true)}>
              Supprimer
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={() => navigate('/fiches/identification', { state: { preselectClient: { id: client.id, libelle: client.libelle } } })}
          >
            + Ajouter une fiche
          </button>
        </div>
      </div>

      {client.complet === false && (
        <div className="alert-warning">
          Cette fiche client est <strong>incomplète</strong>.{' '}
          {client.champsManquants && client.champsManquants.length > 0 ? (
            <>Champs manquants : <strong>{texteChampsManquants(client.champsManquants)}</strong>. </>
          ) : null}
          Cliquez sur « Modifier » pour les compléter.
        </div>
      )}

      {/* Info client */}
      <div className="client-info-card">
        <div className="client-info-main">
          <strong>
            {client.libelle}
            {client.ppe && <span className="badge-ppe" title="Personne Politiquement Exposée">PPE</span>}
            {client.complet === false && (
              <span
                className="badge-incomplet"
                title={
                  client.champsManquants && client.champsManquants.length > 0
                    ? `Champs manquants : ${texteChampsManquants(client.champsManquants)}`
                    : 'Certains champs sont manquants'
                }
              >
                À compléter
              </span>
            )}
          </strong>
          {client.identifie ? (
            <p>
              {adresseLines.map((l, i) => <span key={i}>{l}<br /></span>)}
              {client.dateNaissance && <>Né(e) le : {formatDateFr(client.dateNaissance)}{client.lieuNaissance ? ` à ${client.lieuNaissance}` : ''}</>}
            </p>
          ) : (
            <p>{client.descriptionPhysique}</p>
          )}
        </div>
        {client.identifie && (
          <div className="client-info-id">
            {client.typePiece && <span>Type de pièce : {client.typePiece}<br /></span>}
            {client.numeroPiece && <span>Numéro : {client.numeroPiece}<br /></span>}
            {client.dateDelivrance && <span>Date de délivrance : {formatDateFr(client.dateDelivrance)}<br /></span>}
            {client.prefectureDelivrance && <span>Préfecture : {client.prefectureDelivrance}<br /></span>}
            {client.paysDelivrance && <span>Pays de délivrance : {client.paysDelivrance}</span>}
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
                  <td>{formatDateFr(f.date)}</td>
                  <td>{f.caissierNom}</td>
                  <td>{formatEur(f.totalRGM)}</td>
                  <td>{formatEur(f.totalEntrant)}</td>
                  <td>{formatEur(f.totalSortant)}</td>
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

      <ConfirmDialog
        open={confirmSuppr}
        title="Supprimer ce client ?"
        message={
          <>
            Le client <strong>{client.libelle}</strong> sera définitivement supprimé.
            {' '}
            <br />Cette action échoue si le client a des fiches associées : il faut les supprimer avant.
          </>
        }
        confirmLabel={deleting ? 'Suppression…' : 'Supprimer'}
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => !deleting && setConfirmSuppr(false)}
      />
    </div>
  )
}
