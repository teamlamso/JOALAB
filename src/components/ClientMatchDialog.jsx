import { useNavigate } from 'react-router-dom'

const FIELDS = [
  { key: 'nom', label: 'Nom' },
  { key: 'prenom', label: 'Prénom' },
  { key: 'dateNaissance', label: 'Date de naissance', formatter: formatIso },
  { key: 'lieuNaissance', label: 'Lieu de naissance' },
  { key: 'rue', label: 'Rue' },
  { key: 'codePostal', label: 'Code postal' },
  { key: 'ville', label: 'Ville' },
  { key: 'pays', label: 'Pays' },
  { key: 'typePiece', label: 'Type de pièce' },
  { key: 'numeroPiece', label: 'N° de pièce' },
  { key: 'dateDelivrance', label: 'Date délivrance', formatter: formatIso },
  { key: 'prefectureDelivrance', label: 'Préfecture' },
  { key: 'paysDelivrance', label: 'Pays délivrance' },
]

function formatIso(s) {
  if (!s) return ''
  const [y, m, d] = s.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function diffRow(label, oldValue, newValue, formatter) {
  const f = formatter ?? ((v) => v ?? '')
  const oldStr = f(oldValue) || '—'
  const newStr = f(newValue) || '—'
  const changed = (oldStr !== newStr) && (oldValue || newValue)
  return { label, oldStr, newStr, changed }
}

/**
 * Modal présentant les candidats existants et trois actions :
 * - Modifier : naviguer vers le profil existant
 * - Fusionner : mettre à jour le candidat avec les nouvelles valeurs
 * - Continuer : créer un nouveau client malgré tout
 *
 * @param {Array} candidates - liste de ClientDetailResponse retournée par /clients/match
 * @param {object} newData - les valeurs saisies par l'utilisateur (form)
 * @param {(candidate) => void} onMerge - mettre à jour le candidat sélectionné
 * @param {() => void} onContinue - créer un nouveau client
 * @param {() => void} onCancel - fermer la modale
 */
export default function ClientMatchDialog({ candidates, newData, onMerge, onContinue, onCancel }) {
  const navigate = useNavigate()
  if (!candidates || candidates.length === 0) return null

  return (
    <div className="modal-overlay" onClick={onCancel} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="modal-title">Client potentiellement existant</div>
        <div className="modal-body">
          <p style={{ marginBottom: 14 }}>
            {candidates.length === 1
              ? 'Un client similaire a été trouvé. Souhaitez-vous le modifier, le fusionner avec les nouvelles données ou créer un doublon ?'
              : `${candidates.length} clients similaires ont été trouvés.`}
          </p>

          <div className="match-list">
            {candidates.map((c) => {
              const rows = FIELDS.map((f) => diffRow(f.label, c[f.key], newData[f.key], f.formatter))
              const hasChange = rows.some((r) => r.changed)
              return (
                <div key={c.id} className="match-card">
                  <div className="match-card-name">
                    {c.libelle}
                    {c.ppe && <span className="badge-ppe" title="Personne Politiquement Exposée">PPE</span>}
                  </div>
                  {hasChange ? (
                    <>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                        Différences détectées :
                      </div>
                      {rows.filter((r) => r.changed).map((r, i) => (
                        <div key={i} className="match-diff-row match-diff-changed">
                          <div className="match-label">{r.label}</div>
                          <div className="match-old">{r.oldStr}</div>
                          <div className="match-new">{r.newStr}</div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Aucune différence avec les données saisies.
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => navigate(`/clients/${c.id}`)}>
                      Modifier
                    </button>
                    <button type="button" className="btn btn-primary" onClick={() => onMerge(c)} disabled={!hasChange}>
                      Fusionner
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Annuler</button>
          <button type="button" className="btn btn-primary" onClick={onContinue}>Continuer sans fusionner</button>
        </div>
      </div>
    </div>
  )
}
