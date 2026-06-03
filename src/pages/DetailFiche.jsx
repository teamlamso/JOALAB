import { Fragment, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getFiche, deleteFiche } from '../api/fiches.js'
import FichePapier from '../components/FichePapier.jsx'
import HistoriqueFicheDialog from '../components/HistoriqueFicheDialog.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useNotify } from '../context/NotificationContext.jsx'
import {
  peutModifierFiche,
  peutSupprimerFiche,
  peutLireHistoriqueFiche,
} from '../utils/permissions.js'
import { imprimerSousFiche, buildPrintTitle, ORDRE_TYPES_JEU } from '../utils/print.js'
import { texteChampsManquants } from '../utils/champsClient.js'
import { formatDateFr } from '../utils/formatters.js'

export default function DetailFiche() {
  const { id } = useParams()
  const navigate = useNavigate()
  const notify = useNotify()
  const { user } = useAuth()
  const [fiche, setFiche] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [historiqueOuvert, setHistoriqueOuvert] = useState(false)
  const [confirmSuppr, setConfirmSuppr] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getFiche(id)
      .then(setFiche)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  // Pose document.title pour que Ctrl+P propose directement le bon nom de
  // fichier PDF. Le bouton « Imprimer cette fiche » repose en plus son
  // titre par sous-fiche dans imprimerSousFiche ; ici on couvre le cas où
  // l'utilisateur passe par le menu du navigateur.
  useEffect(() => {
    if (!fiche) return
    const previous = document.title
    document.title = buildPrintTitle(fiche, null)
    return () => { document.title = previous }
  }, [fiche])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteFiche(id)
      notify('Fiche supprimée', 'success')
      navigate('/accueil')
    } catch (e) {
      notify(`Erreur : ${e.message}`, 'error')
      setDeleting(false)
      setConfirmSuppr(false)
    }
  }

  if (loading) return <div className="loading">Chargement…</div>
  if (error) return <div className="page"><div className="alert-error">{error}</div></div>
  if (!fiche) return null

  const lignes = fiche.lignes ?? []
  const typesPresents = ORDRE_TYPES_JEU.filter((t) => lignes.some((l) => l.typeJeu === t))
  const peutModifier   = peutModifierFiche(user?.role, fiche.date)
  const peutSupprimer  = peutSupprimerFiche(user?.role)
  const peutHistorique = peutLireHistoriqueFiche(user?.role)

  return (
    <div className="page">
      <div className="page-header no-print">
        <div className="page-header-left">
          <h1>
            Détail de la fiche
            {fiche.clientComplet === false && (
              <span className="icone-warning"
                    title={
                      fiche.clientChampsManquants && fiche.clientChampsManquants.length > 0
                        ? `Champs manquants : ${texteChampsManquants(fiche.clientChampsManquants)}`
                        : 'Le profil du client a des champs manquants — à compléter sur sa fiche'
                    }>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L1 21h22L12 2zm0 6c.55 0 1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V9c0-.55.45-1 1-1zm0 10c-.69 0-1.25.56-1.25 1.25S11.31 20.5 12 20.5s1.25-.56 1.25-1.25S12.69 18 12 18z"/>
                </svg>
              </span>
            )}
          </h1>
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
          {peutHistorique && (
            <button className="btn btn-secondary" onClick={() => setHistoriqueOuvert(true)}>
              Historique
            </button>
          )}
          {peutModifier && (
            <button className="btn btn-secondary" onClick={() => navigate(`/fiches/${id}/modifier`)}>
              Compléter la fiche
            </button>
          )}
          {peutSupprimer && (
            <button className="btn btn-danger" onClick={() => setConfirmSuppr(true)}>
              Supprimer
            </button>
          )}
        </div>
      </div>

      {fiche.clientComplet === false && peutModifier && (
        <div className="alert-warning no-print fiche-client-incomplet">
          <span>
            Profil client <strong>incomplet</strong>.{' '}
            {fiche.clientChampsManquants && fiche.clientChampsManquants.length > 0 && (
              <>Champs manquants : <strong>{texteChampsManquants(fiche.clientChampsManquants)}</strong>.</>
            )}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              navigate(`/clients/${fiche.clientId}/modifier`, {
                state: { returnTo: `/fiches/${id}` },
              })
            }
          >
            Compléter le profil
          </button>
        </div>
      )}

      {typesPresents.length === 0 ? (
        <>
          <FichePapier fiche={fiche} />
          <div className="no-print fiche-detail-print-actions">
            <button className="btn btn-primary" onClick={() => imprimerSousFiche(fiche, null)}>
              Imprimer cette fiche
            </button>
          </div>
        </>
      ) : (
        typesPresents.map((t, i) => (
          <Fragment key={t}>
            <FichePapier fiche={fiche} typeFiltre={t} pageBreakBefore={i > 0} />
            <div className="no-print fiche-detail-print-actions">
              <button className="btn btn-primary" onClick={() => imprimerSousFiche(fiche, t)}>
                Imprimer cette fiche
              </button>
            </div>
          </Fragment>
        ))
      )}

      {historiqueOuvert && (
        <HistoriqueFicheDialog ficheId={id} onClose={() => setHistoriqueOuvert(false)} />
      )}

      <ConfirmDialog
        open={confirmSuppr}
        title="Supprimer cette fiche ?"
        message={
          <>
            La fiche n°{id} de <strong>{fiche.clientLibelle}</strong> sera définitivement supprimée
            (lignes incluses). Cette action est tracée dans le journal.
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
