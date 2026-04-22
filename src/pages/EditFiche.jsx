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

function Toggle({ options, value, onChange, disabledOptions }) {
  const disabled = disabledOptions || []
  return (
    <div className="toggle-group">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={`toggle-btn ${value === o ? 'active' : ''} ${disabled.includes(o) ? 'disabled' : ''}`}
          disabled={disabled.includes(o)}
          onClick={() => onChange(value === o ? null : o)}
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
  if (n < 500) warnings.push('Le RGM ne peut pas \u00eatre inf\u00e9rieur \u00e0 500 \u20ac')
  if (n % 1 !== 0) warnings.push('Le RGM ne peut pas contenir de d\u00e9cimales (insert billet)')
  if (n % 5 !== 0) warnings.push('Le RGM doit \u00eatre un multiple de 5 \u20ac (insert billet)')
  return warnings
}

function toDisplay(val) { return val ? String(val).replace('.', ',') : '' }
function toInternal(raw) { return raw.replace(',', '.') }
function filterMoney(val) { return val.replace(/[^0-9.,]/g, '') }

function LigneEditor({ ligne, onChange, onRemove, canRemove }) {
  const set = (field) => (e) => onChange({ ...ligne, [field]: e.target.value })
  const setMoney = (field) => (e) => {
    const filtered = filterMoney(e.target.value)
    onChange({ ...ligne, [field]: toInternal(filtered) })
  }

  const hasRGM = !!ligne.montantRGM
  const isJT = ligne.typeJeu === 'JT'
  const hasEntrantOrSortant = !!ligne.changeEntrant || !!ligne.changeSortant
  const rgmWarnings = validateRGM(ligne.montantRGM)

  // Exclusion mutuelle : RGM ↔ JT
  const disabledJeux = hasRGM ? ['JT'] : []
  const rgmDisabled = isJT
  const socleDisabled = isJT

  return (
    <div className="transaction-line">
      <div className="transaction-line-selectors">
        <div className="transaction-line-selector-group">
          <label>Jeu :{(hasRGM || hasEntrantOrSortant) && ' *'}</label>
          <Toggle options={JEUX} value={ligne.typeJeu} onChange={(v) => onChange({ ...ligne, typeJeu: v })} disabledOptions={disabledJeux} />
        </div>
        <div className="transaction-line-selector-group">
          <label>Paiement :{hasEntrantOrSortant && ' *'}</label>
          <Toggle options={PAIEMENTS} value={ligne.typePaiement} onChange={(v) => onChange({ ...ligne, typePaiement: v })} />
        </div>
        <div className="transaction-line-selector-group">
          <label>Change :</label>
          <Toggle options={CHANGES} value={ligne.typeChange} onChange={(v) => onChange({ ...ligne, typeChange: v })} />
        </div>
      </div>

      <div className="transaction-line-fields">
        <div className={`form-group ${socleDisabled ? 'field-disabled' : ''}`}>
          <label>N\u00b0 de socle :{hasRGM && ' *'}</label>
          <input type="text" value={ligne.numeroSocle} onChange={set('numeroSocle')} disabled={socleDisabled} />
        </div>
        <div className={`form-group ${rgmDisabled ? 'field-disabled' : ''}`}>
          <label>
            Montant Online (RGM) :
            {rgmWarnings.length > 0 && (
              <span className="field-warning-icon" title={rgmWarnings.join('\n')}>&#9888;</span>
            )}
          </label>
          <input type="text" inputMode="decimal" value={toDisplay(ligne.montantRGM)} onChange={setMoney('montantRGM')} placeholder="0 \u20ac" disabled={rgmDisabled} />
        </div>
        <div className="form-group">
          <label>Change Entrant :</label>
          <input type="text" inputMode="decimal" value={toDisplay(ligne.changeEntrant)} onChange={setMoney('changeEntrant')} placeholder="0,00 \u20ac" />
        </div>
        <div className="form-group">
          <label>Change Sortant :</label>
          <input type="text" inputMode="decimal" value={toDisplay(ligne.changeSortant)} onChange={setMoney('changeSortant')} placeholder="0,00 \u20ac" />
        </div>
        <div className="form-group">
          <label>Observations :{hasEntrantOrSortant && ' *'}</label>
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

function validateLignes(lignes) {
  for (let i = 0; i < lignes.length; i++) {
    const l = lignes[i]
    const hasRGM = !!l.montantRGM
    const hasEntrant = !!l.changeEntrant
    const hasSortant = !!l.changeSortant

    if (!hasRGM && !hasEntrant && !hasSortant) {
      return `Ligne ${i + 1} : au moins un montant (RGM, entrant ou sortant) est requis.`
    }
    if (hasRGM && !l.numeroSocle) {
      return `Ligne ${i + 1} : le num\u00e9ro de socle est obligatoire avec un montant RGM.`
    }
    if (hasRGM && !l.typeJeu) {
      return `Ligne ${i + 1} : le type de jeu est obligatoire avec un montant RGM.`
    }
    if ((hasEntrant || hasSortant) && !l.typeJeu) {
      return `Ligne ${i + 1} : le type de jeu est obligatoire avec un montant entrant ou sortant.`
    }
    if ((hasEntrant || hasSortant) && !l.typePaiement) {
      return `Ligne ${i + 1} : le type de paiement est obligatoire avec un montant entrant ou sortant.`
    }
    if ((hasEntrant || hasSortant) && !l.observations) {
      return `Ligne ${i + 1} : l'observation est obligatoire avec un montant entrant ou sortant.`
    }
  }
  return null
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
    const validationError = validateLignes(lignes)
    if (validationError) {
      setError(validationError)
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

  if (loading) return <div className="loading">Chargement\u2026</div>

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
            {saving ? 'Mise \u00e0 jour\u2026' : 'Mettre \u00e0 jour la fiche'}
          </button>
        </div>
      </form>
    </div>
  )
}
