import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getClient,
  updateClient,
  updateClientIdentification,
} from '../api/clients.js'
import DateInput from '../components/DateInput.jsx'
import AddressSearch from '../components/AddressSearch.jsx'
import PlaceSearch from '../components/PlaceSearch.jsx'
import CountrySearch from '../components/CountrySearch.jsx'
import PrefectureSearch from '../components/PrefectureSearch.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useNotify } from '../context/NotificationContext.jsx'
import { peutModifierClientComplet } from '../utils/permissions.js'

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

const PIECES_AVEC_PREFECTURE = [
  'CNI',
  'Permis de Conduire (Carte)',
  'Permis de Conduire (Papier)',
  'Passeport Français',
  'Titre de Séjour',
]

const PIECES_AVEC_PAYS = [
  'Passeport Etranger',
  'Carte Identité Etrangère',
]

/**
 * Édition d'un client existant.
 *
 * <p>Le formulaire est unique mais ses champs sont verrouillés selon le rôle :
 * un CAISSIER ne peut éditer que l'adresse et la pièce d'identité (appel
 * {@code PATCH /clients/{id}/identification}). Un RESPONSABLE_CAISSE ou MCD
 * peut tout modifier (appel {@code PUT /clients/{id}}).
 */
export default function EditClient() {
  const { id } = useParams()
  const navigate = useNavigate()
  const notify = useNotify()
  const { user } = useAuth()

  const editionComplete = peutModifierClientComplet(user?.role)

  const [client, setClient]   = useState(null)
  const [form, setForm]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    getClient(id)
      .then((c) => {
        setClient(c)
        setForm({
          nom:                  c.nom || '',
          prenom:               c.prenom || '',
          dateNaissance:        c.dateNaissance || '',
          lieuNaissance:        c.lieuNaissance || '',
          ppe:                  !!c.ppe,
          descriptionPhysique:  c.descriptionPhysique || '',
          rue:                  c.rue || '',
          complement:           c.complement || '',
          codePostal:           c.codePostal || '',
          ville:                c.ville || '',
          pays:                 c.pays || 'France',
          typePiece:            c.typePiece || '',
          numeroPiece:          c.numeroPiece || '',
          dateDelivrance:       c.dateDelivrance || '',
          prefectureDelivrance: c.prefectureDelivrance || '',
          paysDelivrance:       c.paysDelivrance || '',
        })
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const set      = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }))
  const setField = (champ, value) => setForm((f) => ({ ...f, [champ]: value }))

  const handleAddressSelect = (addr) => {
    setForm((f) => ({
      ...f,
      rue: addr.rue,
      codePostal: addr.codePostal,
      ville: addr.ville,
      pays: addr.pays,
    }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (editionComplete) {
        await updateClient(id, { identifie: client.identifie, ...form })
      } else {
        await updateClientIdentification(id, {
          rue:                  form.rue,
          complement:           form.complement,
          codePostal:           form.codePostal,
          ville:                form.ville,
          pays:                 form.pays,
          typePiece:            form.typePiece,
          numeroPiece:          form.numeroPiece,
          dateDelivrance:       form.dateDelivrance,
          prefectureDelivrance: form.prefectureDelivrance,
          paysDelivrance:       form.paysDelivrance,
        })
      }
      notify('Client mis à jour', 'success')
      navigate(`/clients/${id}`)
    } catch (err) {
      setError(err.message)
      notify(`Erreur : ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading">Chargement…</div>
  if (error && !form) return <div className="page"><div className="alert-error">{error}</div></div>
  if (!form || !client) return null

  // Champs d'état civil verrouillés pour un CAISSIER.
  const lockIdentite = !editionComplete

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Modifier le client :</h1>
          {lockIdentite && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Votre rôle ne permet de modifier que l'adresse et la pièce d'identité.
            </p>
          )}
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>
            Retour
          </button>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <form onSubmit={submit}>
        <div className="form-grid-2">
          {/* État civil + adresse */}
          <div className="form-section">
            {client.identifie ? (
              <>
                <div className="form-section-title">Informations personnelles :</div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Nom :</label>
                    <input type="text" value={form.nom} onChange={set('nom')} required disabled={lockIdentite} />
                  </div>
                  <div className="form-group">
                    <label>Pr&eacute;nom :</label>
                    <input type="text" value={form.prenom} onChange={set('prenom')} required disabled={lockIdentite} />
                  </div>
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Date de naissance :</label>
                    <DateInput
                      value={form.dateNaissance}
                      onChange={(v) => setField('dateNaissance', v)}
                      disabled={lockIdentite}
                    />
                  </div>
                  <div className="form-group">
                    <label>Lieu de naissance :</label>
                    <PlaceSearch
                      value={form.lieuNaissance}
                      onChange={(v) => setField('lieuNaissance', v)}
                      disabled={lockIdentite}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="ppe-toggle">
                    <input
                      type="checkbox"
                      checked={form.ppe}
                      onChange={(e) => setField('ppe', e.target.checked)}
                      disabled={lockIdentite}
                    />
                    <span>Personne Politiquement Exposée (PPE)</span>
                  </label>
                </div>
              </>
            ) : (
              <>
                <div className="form-section-title">Description physique :</div>
                <div className="form-group">
                  <textarea
                    value={form.descriptionPhysique}
                    onChange={set('descriptionPhysique')}
                    rows={4}
                    disabled={lockIdentite}
                  />
                </div>
              </>
            )}

            <div className="form-section-title" style={{ marginTop: '16px' }}>Adresse :</div>
            <div className="form-group">
              <label>Rechercher une adresse :</label>
              <AddressSearch onSelect={handleAddressSelect} />
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
              <CountrySearch value={form.pays} onChange={(v) => setField('pays', v)} />
            </div>
          </div>

          {/* Pièce d'identité */}
          {client.identifie && (
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
              {PIECES_AVEC_PREFECTURE.includes(form.typePiece) && (
                <div className="form-group">
                  <label>Préfecture de délivrance :</label>
                  <PrefectureSearch
                    value={form.prefectureDelivrance}
                    onChange={(v) => setField('prefectureDelivrance', v)}
                  />
                </div>
              )}
              {PIECES_AVEC_PAYS.includes(form.typePiece) && (
                <div className="form-group">
                  <label>Pays de délivrance :</label>
                  <CountrySearch
                    value={form.paysDelivrance}
                    onChange={(v) => setField('paysDelivrance', v)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}
