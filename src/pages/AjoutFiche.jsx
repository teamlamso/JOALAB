import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { createClient } from '../api/clients.js'
import { createFiche } from '../api/fiches.js'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { useNotify } from '../context/NotificationContext.jsx'

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
function formatOnBlur(val) {
  if (!val) return val
  const n = parseFloat(val)
  if (isNaN(n)) return val
  return n.toFixed(2)
}

function LigneEditor({ ligne, onChange, onRemove, canRemove }) {
  const set = (field) => (e) => onChange({ ...ligne, [field]: e.target.value })
  const setMoney = (field) => (e) => {
    const filtered = filterMoney(e.target.value)
    onChange({ ...ligne, [field]: toInternal(filtered) })
  }
  const blurMoney = (field) => () => {
    const formatted = formatOnBlur(ligne[field])
    if (formatted !== ligne[field]) onChange({ ...ligne, [field]: formatted })
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
          <label>{"N° de socle :"}{hasRGM && ' *'}</label>
          <input type="text" value={ligne.numeroSocle} onChange={set('numeroSocle')} disabled={socleDisabled} />
        </div>
        <div className={`form-group ${rgmDisabled ? 'field-disabled' : ''}`}>
          <label>
            Montant Online (RGM) :
            {rgmWarnings.length > 0 && (
              <span className="field-warning-icon" title={rgmWarnings.join('\n')}>&#9888;</span>
            )}
          </label>
          <input type="text" inputMode="decimal" value={toDisplay(ligne.montantRGM)} onChange={setMoney('montantRGM')} onBlur={blurMoney('montantRGM')} placeholder={"0 €"} disabled={rgmDisabled} />
        </div>
        <div className="form-group">
          <label>Change Entrant :</label>
          <input type="text" inputMode="decimal" value={toDisplay(ligne.changeEntrant)} onChange={setMoney('changeEntrant')} onBlur={blurMoney('changeEntrant')} placeholder={"0,00 €"} />
        </div>
        <div className="form-group">
          <label>Change Sortant :</label>
          <input type="text" inputMode="decimal" value={toDisplay(ligne.changeSortant)} onChange={setMoney('changeSortant')} onBlur={blurMoney('changeSortant')} placeholder={"0,00 €"} />
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
          style={{ marginBottom: '0', alignSelf: 'flex-end', paddingBottom: '10px' }}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  )
}

function isLigneVide(l) {
  return !l.montantRGM && !l.changeEntrant && !l.changeSortant
    && !l.numeroSocle && !l.typeJeu && !l.typePaiement && !l.typeChange && !l.observations
}

function validateLignes(lignes, options = {}) {
  const { allowAllEmpty = false } = options
  if (allowAllEmpty && lignes.every(isLigneVide)) return null
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

export default function AjoutFiche() {
  const navigate = useNavigate()
  const location = useLocation()
  const notify = useNotify()
  const clientData = location.state?.clientData

  const [lignes, setLignes] = useState([newLigne()])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState(null)

  if (!clientData) {
    navigate('/fiches/identification')
    return null
  }

  const updateLigne = (idx, val) =>
    setLignes((ls) => ls.map((l, i) => (i === idx ? val : l)))

  const requestRemoveLigne = (idx) => setConfirmDeleteIdx(idx)

  const confirmRemoveLigne = () => {
    if (confirmDeleteIdx == null) return
    setLignes((ls) => ls.filter((_, i) => i !== confirmDeleteIdx))
    notify('Ligne supprimée', 'success')
    setConfirmDeleteIdx(null)
  }

  const addLigne = () => setLignes((ls) => [...ls, newLigne()])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const validationError = validateLignes(lignes, { allowAllEmpty: !!clientData.ppe })
    if (validationError) {
      setError(validationError)
      return
    }
    setLoading(true)
    try {
      let clientId = clientData.id

      // Create anonymous client inline if non-identified
      if (!clientId) {
        const created = await createClient({
          identifie: false,
          descriptionPhysique: clientData.descriptionPhysique,
        })
        clientId = created?.id
        if (!clientId) throw new Error('Impossible de créer le client')
      }

      const lignesPayload = lignes.filter((l) => !isLigneVide(l)).map((l) => ({
        typeJeu: l.typeJeu,
        typePaiement: l.typePaiement,
        typeChange: l.typeChange || null,
        numeroSocle: l.numeroSocle || null,
        montantRGM: l.montantRGM ? parseFloat(l.montantRGM) : null,
        changeEntrant: l.changeEntrant ? parseFloat(l.changeEntrant) : null,
        changeSortant: l.changeSortant ? parseFloat(l.changeSortant) : null,
        observations: l.observations || null,
      }))

      const payload = {
        clientId: Number(clientId),
        lignes: lignesPayload,
      }

      await createFiche(payload)
      notify('Fiche enregistrée', 'success')
      navigate('/accueil')
    } catch (e) {
      setError(e.message)
      notify(`Erreur : ${e.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Saisie des transactions :</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Client banner */}
        <div className="fiche-client-banner">
          <span>
            Fiche pour : <strong>{clientData.libelle}</strong>
          </span>
          <a onClick={() => navigate('/fiches/identification')}>Changer</a>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {/* Transaction lines */}
        {lignes.map((l, i) => (
          <LigneEditor
            key={l._id}
            ligne={l}
            onChange={(val) => updateLigne(i, val)}
            onRemove={() => requestRemoveLigne(i)}
            canRemove={lignes.length > 1}
          />
        ))}

        <button type="button" className="add-line-btn" onClick={addLigne}>
          ⊕ Ajouter une ligne
        </button>

        <div className="fiche-form-footer">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Enregistrement\u2026' : 'Enregistrer la fiche'}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDeleteIdx !== null}
        title="Supprimer la ligne ?"
        message="Cette ligne sera retir\u00e9e de la fiche. \u00cates-vous s\u00fbr ?"
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={confirmRemoveLigne}
        onCancel={() => setConfirmDeleteIdx(null)}
      />
    </div>
  )
}
