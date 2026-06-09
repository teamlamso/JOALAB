import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
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
import {
  peutModifierClientComplet,
  peutModifierLieuNaissance,
  peutModifierDateNaissance,
  peutToucherPpe,
} from '../utils/permissions.js'
import {
  TYPES_PIECE,
  PIECES_AVEC_PREFECTURE,
  PIECES_AVEC_PAYS,
  texteChampsManquants,
} from '../utils/champsClient.js'

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
  const location = useLocation()
  const notify = useNotify()
  const { user } = useAuth()
  // Permet de revenir sur la fiche d'où vient l'utilisateur quand il a cliqué
  // « Compléter le profil » depuis DetailFiche. Sinon on retombe sur le détail
  // du client après enregistrement.
  const returnTo = location.state?.returnTo

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

  /**
   * Indique si un champ doit être surligné « à compléter ». On combine la
   * liste des champs manquants au chargement et la valeur courante du
   * formulaire pour faire disparaître le surlignage quand l'utilisateur a
   * saisi quelque chose.
   */
  const manque = (champ) => {
    if (!client?.champsManquants?.includes(champ)) return false
    if (champ === 'origineDelivrance') {
      return !form?.paysDelivrance && !form?.prefectureDelivrance
    }
    const v = form?.[champ]
    return v === undefined || v === null || v === ''
  }
  const cls = (champ) => `form-group${manque(champ) ? ' champ-manquant' : ''}`

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
        // Un CAISSIER passe ici. Il complète l'adresse, la pièce d'identité,
        // et peut aussi remplir les champs d'état civil restés vides ou
        // corriger un lieu de naissance mal formaté. Le backend applique
        // ces ajustements seulement quand ils sont autorisés.
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
          dateNaissance:        form.dateNaissance || null,
          lieuNaissance:        form.lieuNaissance || null,
          ppe:                  form.ppe ? true : null,
        })
      }
      notify('Client mis à jour', 'success')
      // Si l'utilisateur a un returnTo explicite (ex. DetailFiche → Compléter
      // le profil), on y va directement avec replace. Sinon on revient d'un
      // cran : EditClient est toujours ouvert depuis DetailClient ou
      // ListeClients, donc navigate(-1) ramène à l'écran d'avant sans
      // empiler de doublon dans l'historique.
      if (returnTo) navigate(returnTo, { replace: true })
      else navigate(-1)
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

  // Pour un CAISSIER, certains champs d'état civil restent verrouillés ;
  // d'autres sont éditables sous conditions (complément possible si vide ou
  // mal formaté). Pour un MCD/RESPONSABLE_CAISSE, tout est éditable.
  const lockIdentite       = !editionComplete
  const lockNomPrenom      = lockIdentite
  const lockDateNaissance  = !peutModifierDateNaissance(user?.role, client.dateNaissance)
  const lockLieuNaissance  = !peutModifierLieuNaissance(user?.role, client.lieuNaissance)
  const lockPpe            = !peutToucherPpe(user?.role, client.ppe)

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

      {client.champsManquants && client.champsManquants.length > 0 && (
        <div className="alert-warning">
          Champs à compléter (surlignés ci-dessous) :{' '}
          <strong>{texteChampsManquants(client.champsManquants)}</strong>.
        </div>
      )}

      <form onSubmit={submit}>
        <div className="form-grid-2">
          {/* État civil + adresse */}
          <div className="form-section">
            {client.identifie ? (
              <>
                <div className="form-section-title">Informations personnelles :</div>
                <div className="form-row-2">
                  <div className={cls('nom')}>
                    <label>Nom :</label>
                    <input type="text" value={form.nom} onChange={set('nom')} required disabled={lockNomPrenom} />
                  </div>
                  <div className={cls('prenom')}>
                    <label>Prénom :</label>
                    <input type="text" value={form.prenom} onChange={set('prenom')} required disabled={lockNomPrenom} />
                  </div>
                </div>
                <div className="form-row-2">
                  <div className={cls('dateNaissance')}>
                    <label>Date de naissance :</label>
                    <DateInput
                      value={form.dateNaissance}
                      onChange={(v) => setField('dateNaissance', v)}
                      disabled={lockDateNaissance}
                    />
                  </div>
                  <div className={cls('lieuNaissance')}>
                    <label>Lieu de naissance :</label>
                    <PlaceSearch
                      value={form.lieuNaissance}
                      onChange={(v) => setField('lieuNaissance', v)}
                      disabled={lockLieuNaissance}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="ppe-toggle">
                    <input
                      type="checkbox"
                      checked={form.ppe}
                      onChange={(e) => setField('ppe', e.target.checked)}
                      disabled={lockPpe}
                      title={lockPpe && form.ppe ? 'Seul un MCD ou un Responsable Caisse peut désactiver le flag PPE.' : undefined}
                    />
                    <span>Personne Politiquement Exposée (PPE)</span>
                  </label>
                </div>
              </>
            ) : (
              <>
                <div className="form-section-title">Description physique :</div>
                <div className={cls('descriptionPhysique')}>
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
            <div className={cls('rue')}>
              <label>Rue :</label>
              <input type="text" value={form.rue} onChange={set('rue')} />
            </div>
            <div className="form-group">
              <label>Complément :</label>
              <input type="text" value={form.complement} onChange={set('complement')} />
            </div>
            <div className="form-row-2">
              <div className={cls('codePostal')}>
                <label>Code postal :</label>
                <input type="text" value={form.codePostal} onChange={set('codePostal')} />
              </div>
              <div className={cls('ville')}>
                <label>Ville :</label>
                <input type="text" value={form.ville} onChange={set('ville')} />
              </div>
            </div>
            <div className={cls('pays')}>
              <label>Pays :</label>
              <CountrySearch value={form.pays} onChange={(v) => setField('pays', v)} />
            </div>
          </div>

          {/* Pièce d'identité */}
          {client.identifie && (
            <div className="form-section">
              <div className="form-section-title">Pièce d'identité :</div>
              <div className={cls('typePiece')}>
                <label>Type de pièce :</label>
                <select value={form.typePiece} onChange={set('typePiece')}>
                  <option value="">— Sélectionner —</option>
                  {TYPES_PIECE.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className={cls('numeroPiece')}>
                <label>Numéro de pièce :</label>
                <input type="text" value={form.numeroPiece} onChange={set('numeroPiece')} />
              </div>
              <div className={cls('dateDelivrance')}>
                <label>Date de délivrance :</label>
                <DateInput value={form.dateDelivrance} onChange={(v) => setField('dateDelivrance', v)} />
              </div>
              {PIECES_AVEC_PREFECTURE.includes(form.typePiece) && (
                <div className={cls('origineDelivrance')}>
                  <label>Préfecture de délivrance :</label>
                  <PrefectureSearch
                    value={form.prefectureDelivrance}
                    onChange={(v) => setField('prefectureDelivrance', v)}
                  />
                </div>
              )}
              {PIECES_AVEC_PAYS.includes(form.typePiece) && (
                <div className={cls('origineDelivrance')}>
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
