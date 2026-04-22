import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getFiche, updateFiche } from '../api/fiches.js'

const JEUX = ['MAS', 'JTE', 'JT']
const PAIEMENTS = ['ESPECE', 'CHEQUE', 'CB']
const CHANGES = ['JETON', 'PLAQUE', 'TICKET']

function newLigne() {
  return {
    _id: Math.random(),
    typeJeu: null,
    typePaiement: null,
    typeChange: null,
    numeroSocle: '',
    montantRGM: '',
    changeEntrant: '',
    changeSortant: '',
    observations: '',
  }
}

function ligneFromResponse(l) {
  return {
    _id: l.id ?? Math.random(),
    typeJeu: l.typeJeu ?? null,
    typePaiement: l.typePaiement ?? null,
    typeChange: l.typeChange ?? null,
    numeroSocle: l.numeroSocle ?? '',
    montantRGM: l.montantRGM != null ? String(l.montantRGM) : '',
    changeEntrant: l.changeEntrant != null ? String(l.changeEntrant) : '',
    changeSortant: l.changeSortant != null ? String(l.changeSortant) : '',
    observations: l.observations ?? '',
  }
}

function TrashIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}

function Toggle({ options, value, onChange, required }) {
  return (
    <div className="toggle-group">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={`toggle-btn ${value === o ? 'active' : ''}`}
          onClick={() => onChange(required && value === o ? value : value === o ? null : o)}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

function validateRGM(value) {
  if (!value) return []
  const n = parseFloat(value.replace(',', '.'))
  if (isNaN(n)) return []
  const warnings = []
  if (n < 500) warnings.push('Le RGM ne peut pas être inférieur à 500 €')
  if (n % 1 !== 0) warnings.push('Le RGM ne peut pas contenir de décimales (insert billet)')
  if (n % 5 !== 0) warnings.push('Le RGM doit être un multiple de 5 € (insert billet)')
  return warnings
}

function toDisplay(val) { return val ? String(val).replace('.', ',') : '' }
function toInternal(raw) { return raw.replace(',', '.') }

function LigneEditor({ ligne, onChange, onRemove, canRemove }) {
  const set = (field) => (e) => onChange({ ...ligne, [field]: e.target.value })
  const setMoney = (field) => (e) => onChange({ ...ligne, [field]: toInternal(e.target.value) })
  const rgmWarnings = validateRGM(ligne.montantRGM)
  const socleRequired = !!ligne.montantRGM

  return (
    <div className="transaction-line">
      <div className="transaction-line-selectors">
        <div className="transaction-line-selector-group">
          <label>Jeu :</label>
          <Toggle options={JEUX} value={ligne.typeJeu} onChange={(v) => onChange({ ...ligne, typeJeu: v })} />
        </div>
        <div className="transaction-line-selector-group">
          <label>Paiement :</label>
          <Toggle options={PAIEMENTS} value={ligne.typePaiement} onChange={(v) => onChange({ ...ligne, typePaiement: v })} />
        </div>
        <div className="transaction-line-selector-group">
          <label>Change :</label>
          <Toggle options={CHANGES} value={ligne.typeChange} onChange={(v) => onChange({ ...ligne, typeChange: v })} />
        </div>
      </div>

      <div className="transaction-line-fields">
        <div className="form-group">
          <label>N° de socle :{socleRequired && ' *'}</label>
          <input type="text" value={ligne.numeroSocle} onChange={set('numeroSocle')} />
        </div>
        <div className="form-group">
          <label>
            Montant Online (RGM) :
            {rgmWarnings.length > 0 && (
              <span className="field-warning-icon" title={rgmWarnings.join('\n')}>&#9888;</span>
            )}
          </label>
          <input type="text" inputMode="decimal" value={toDisplay(ligne.montantRGM)} onChange={setMoney('montantRGM')} placeholder="0 €" />
        </div>
        <div className="form-group">
          <label>Change Entrant :</label>
          <input type="text" inputMode="decimal" value={toDisplay(ligne.changeEntrant)} onChange={setMoney('changeEntrant')} placeholder="0,00 €" />
        </div>
        <div className="form-group">
          <label>Change Sortant :</label>
          <input type="text" inputMode="decimal" value={toDisplay(ligne.changeSortant)} onChange={setMoney('changeSortant')} placeholder="0,00 €" />
        </div>
        <div className="form-group">
          <label>Observations (ligne) :</label>
          <input type="text" value={ligne.observations} onChange={set('observations')} />
        </div>
        <button
          type="button"
          className="btn-icon btn-icon-danger"
          onClick={onRemove}
          disabled={!canRemove}
          title="Supprimer la ligne"
          style={{ alignSelf: 'flex-end', paddingBottom: '10px' }}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  )
}

export default function EditFiche() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [clientLibelle, setClientLibelle] = useState('')
  const [lignes, setLignes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getFiche(id)
      .then((fiche) => {
        setClientLibelle(fiche.client?.libelle ?? fiche.clientLibelle ?? '')
        setLignes(fiche.lignes?.length ? fiche.lignes.map(ligneFromResponse) : [newLigne()])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const updateLigne = (idx, val) =>
    setLignes((ls) => ls.map((l, i) => (i === idx ? val : l)))

  const removeLigne = (idx) =>
    setLignes((ls) => ls.filter((_, i) => i !== idx))

  const addLigne = () => setLignes((ls) => [...ls, newLigne()])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const missingSocle = lignes.some((l) => l.montantRGM && !l.numeroSocle)
    if (missingSocle) {
      setError('Le numéro de socle est obligatoire lorsqu\'un montant RGM est renseigné.')
      return
    }
    setSaving(true)
    try {
      await updateFiche(id, {
        lignes: lignes.map((l) => ({
          typeJeu: l.typeJeu,
          typePaiement: l.typePaiement,
          typeChange: l.typeChange || null,
          numeroSocle: l.numeroSocle || null,
          montantRGM: l.montantRGM ? parseFloat(l.montantRGM) : null,
          changeEntrant: l.changeEntrant ? parseFloat(l.changeEntrant) : null,
          changeSortant: l.changeSortant ? parseFloat(l.changeSortant) : null,
          observations: l.observations || null,
        })),
      })
      navigate(`/fiches/${id}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading">Chargement…</div>

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Saisie des transactions :</h1>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate(`/fiches/${id}`)}>
            Retour
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Client banner */}
        <div className="fiche-client-banner">
          <span>
            Fiche pour : <strong>{clientLibelle}</strong>
          </span>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {/* Lines */}
        {lignes.map((l, i) => (
          <LigneEditor
            key={l._id}
            ligne={l}
            onChange={(val) => updateLigne(i, val)}
            onRemove={() => removeLigne(i)}
            canRemove={lignes.length > 1}
          />
        ))}

        <button type="button" className="add-line-btn" onClick={addLigne}>
          ⊕ Ajouter une ligne
        </button>

        <div className="fiche-form-footer">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Mise à jour…' : 'Mettre à jour la fiche'}
          </button>
        </div>
      </form>
    </div>
  )
}
