import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { createClient } from '../api/clients.js'
import DateInput from '../components/DateInput.jsx'
import AddressSearch from '../components/AddressSearch.jsx'

const TYPES_PIECE = [
  'CNIe',
  'CNI',
  'Permis de Conduire (Carte)',
  'Permis de Conduire (Papier)',
  'Passeport Français',
  'Passeport Etranger',
  'Carte Identité Etrangère',
  'Titre de Séjour',
]

const PIECES_FRANCAISES_AVEC_PREFECTURE = [
  'CNI',
  'Permis de Conduire (Carte)',
  'Permis de Conduire (Papier)',
  'Passeport Français',
]

const PIECES_ETRANGERES = [
  'Passeport Etranger',
  'Carte Identité Etrangère',
  'Titre de Séjour',
]

const EMPTY_IDENTIFIED = {
  nom: '', prenom: '', dateNaissance: '',
  rue: '', complement: '', codePostal: '', ville: '', pays: 'France',
  typePiece: '', numeroPiece: '', dateDelivrance: '',
  prefectureDelivrance: '', paysDelivrance: '',
}

export default function NouveauClient() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = location.state?.returnTo

  const [mode, setMode] = useState('identifie')
  const [form, setForm] = useState(EMPTY_IDENTIFIED)
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const handleAddressSelect = (addr) => {
    setForm((f) => ({
      ...f,
      rue: addr.rue,
      codePostal: addr.codePostal,
      ville: addr.ville,
      pays: addr.pays,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let payload
      if (mode === 'identifie') {
        payload = { identifie: true, ...form }
      } else {
        payload = { identifie: false, descriptionPhysique: description }
      }
      const res = await createClient(payload)
      const newId = res?.id
      if (!newId) throw new Error('Impossible de créer le client')
      if (returnTo === 'fiche') {
        navigate('/fiches/identification', {
          state: { preselectClient: { id: newId, libelle: mode === 'identifie' ? `${form.prenom} ${form.nom}` : description } },
        })
      } else {
        navigate(`/clients/${newId}`)
      }
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
          <h1>Nouveau client :</h1>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>
            Retour
          </button>
        </div>
      </div>

      {/* Mode toggle */}
      <div style={{ marginBottom: '20px' }}>
        <div className="tab-switch">
          <button
            type="button"
            className={`tab-switch-btn ${mode === 'identifie' ? 'active' : ''}`}
            onClick={() => setMode('identifie')}
          >
            Client identifi&eacute;
          </button>
          <button
            type="button"
            className={`tab-switch-btn ${mode === 'non-identifie' ? 'active' : ''}`}
            onClick={() => setMode('non-identifie')}
          >
            Client non-identifi&eacute;
          </button>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        {mode === 'identifie' ? (
          <div className="form-grid-2">
            {/* Informations personnelles */}
            <div className="form-section">
              <div className="form-section-title">Informations personnelles :</div>
              <div className="form-group">
                <label>Nom :</label>
                <input type="text" value={form.nom} onChange={set('nom')} required />
              </div>
              <div className="form-group">
                <label>Pr&eacute;nom :</label>
                <input type="text" value={form.prenom} onChange={set('prenom')} required />
              </div>
              <div className="form-group">
                <label>Date de naissance :</label>
                <DateInput value={form.dateNaissance} onChange={(v) => setField('dateNaissance', v)} />
              </div>

              <div className="form-section-title" style={{ marginTop: '16px' }}>Adresse :</div>
              <div className="form-group">
                <label>Rechercher une adresse :</label>
                <AddressSearch onSelect={handleAddressSelect} initialValue="" />
              </div>
              <div className="form-group">
                <label>Rue :</label>
                <input type="text" value={form.rue} onChange={set('rue')} />
              </div>
              <div className="form-group">
                <label>Compl&eacute;ment :</label>
                <input type="text" value={form.complement} onChange={set('complement')} />
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Code postal :</label>
                  <input type="text" value={form.codePostal} onChange={set('codePostal')} />
                </div>
                <div className="form-group">
                  <label>Ville :</label>
                  <input type="text" value={form.ville} onChange={set('ville')} />
                </div>
              </div>
              <div className="form-group">
                <label>Pays :</label>
                <input type="text" value={form.pays} onChange={set('pays')} />
              </div>
            </div>

            {/* Pièce d'identité */}
            <div className="form-section">
              <div className="form-section-title">Pièce d'identité :</div>
              <div className="form-group">
                <label>Type de pièce :</label>
                <select value={form.typePiece} onChange={set('typePiece')}>
                  <option value="">— Sélectionner —</option>
                  {TYPES_PIECE.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Numéro de pièce :</label>
                <input type="text" value={form.numeroPiece} onChange={set('numeroPiece')} />
              </div>
              <div className="form-group">
                <label>Date de délivrance :</label>
                <DateInput value={form.dateDelivrance} onChange={(v) => setField('dateDelivrance', v)} />
              </div>
              {PIECES_FRANCAISES_AVEC_PREFECTURE.includes(form.typePiece) && (
                <div className="form-group">
                  <label>Préfecture de délivrance :</label>
                  <input type="text" value={form.prefectureDelivrance} onChange={set('prefectureDelivrance')} />
                </div>
              )}
              {PIECES_ETRANGERES.includes(form.typePiece) && (
                <div className="form-group">
                  <label>Pays de délivrance :</label>
                  <input type="text" value={form.paysDelivrance} onChange={set('paysDelivrance')} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="form-section" style={{ maxWidth: '600px' }}>
            <div className="form-section-title">Description physique :</div>
            <div className="form-group">
              <label>Description :</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex : Homme, blond, tatouage bras droit, environ 40 ans..."
                rows={4}
                required
              />
            </div>
          </div>
        )}

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Enregistrement...' : 'Enregistrer le client'}
          </button>
        </div>
      </form>
    </div>
  )
}
