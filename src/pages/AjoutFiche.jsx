import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { createClient } from '../api/clients.js'
import { createFiche } from '../api/fiches.js'

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
  const n = parseFloat(value)
  const warnings = []
  if (n < 500) warnings.push('Le RGM ne peut pas être inférieur à 500 €.')
  if (value.includes('.') || value.includes(',')) warnings.push('Le RGM ne peut pas contenir de décimales (insert billet).')
  if (n % 5 !== 0) warnings.push('Le RGM doit être un multiple de 5 € (insert billet).')
  return warnings
}

function LigneEditor({ ligne, onChange, onRemove, canRemove }) {
  const set = (field) => (e) => onChange({ ...ligne, [field]: e.target.value })
  const rgmWarnings = validateRGM(ligne.montantRGM)
  const socleRequired = !!ligne.montantRGM

  return (
    <div className="transaction-line">
      <div className="transaction-line-selectors">
        <div className="transaction-line-selector-group">
          <label>Jeu :</label>
          <Toggle
            options={JEUX}
            value={ligne.typeJeu}
            onChange={(v) => onChange({ ...ligne, typeJeu: v })}
          />
        </div>
        <div className="transaction-line-selector-group">
          <label>Paiement :</label>
          <Toggle
            options={PAIEMENTS}
            value={ligne.typePaiement}
            onChange={(v) => onChange({ ...ligne, typePaiement: v })}
          />
        </div>
        <div className="transaction-line-selector-group">
          <label>Change :</label>
          <Toggle
            options={CHANGES}
            value={ligne.typeChange}
            onChange={(v) => onChange({ ...ligne, typeChange: v })}
          />
        </div>
      </div>

      <div className="transaction-line-fields">
        <div className="form-group">
          <label>N° de socle :{socleRequired && ' *'}</label>
          <input type="text" value={ligne.numeroSocle} onChange={set('numeroSocle')} />
        </div>
        <div className="form-group">
          <label>Montant Online (RGM) :</label>
          <input type="number" step="any" value={ligne.montantRGM} onChange={set('montantRGM')} placeholder="0 €" />
          {rgmWarnings.map((w, i) => <small key={i} className="field-warning">{w}</small>)}
        </div>
        <div className="form-group">
          <label>Change Entrant :</label>
          <input type="number" step="0.01" value={ligne.changeEntrant} onChange={set('changeEntrant')} placeholder="0,00 €" />
        </div>
        <div className="form-group">
          <label>Change Sortant :</label>
          <input type="number" step="0.01" value={ligne.changeSortant} onChange={set('changeSortant')} placeholder="0,00 €" />
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
          style={{ marginBottom: '0', alignSelf: 'flex-end', paddingBottom: '10px' }}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  )
}

export default function AjoutFiche() {
  const navigate = useNavigate()
  const location = useLocation()
  const clientData = location.state?.clientData

  const [lignes, setLignes] = useState([newLigne()])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!clientData) {
    navigate('/fiches/identification')
    return null
  }

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
    setLoading(true)
    try {
      let clientId = clientData.id

      // Create anonymous client inline if non-identified
      if (!clientId) {
        const created = await createClient({
          identifie: false,
          descriptionPhysique: clientData.descriptionPhysique,
        })
        clientId = created?.id ?? created
      }

      const payload = {
        clientId,
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
      }

      await createFiche(payload)
      navigate('/accueil')
    } catch (e) {
      setError(e.message)
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
            onRemove={() => removeLigne(i)}
            canRemove={lignes.length > 1}
          />
        ))}

        <button type="button" className="add-line-btn" onClick={addLigne}>
          ⊕ Ajouter une ligne
        </button>

        <div className="fiche-form-footer">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Enregistrement…' : 'Enregistrer la fiche'}
          </button>
        </div>
      </form>
    </div>
  )
}
