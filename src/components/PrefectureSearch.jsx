import Autocomplete, { normalize } from './Autocomplete.jsx'
import { LIEUX_DELIVRANCE } from '../data/lieuxDelivrance.js'

const TYPE_BADGE = {
  'préfecture': 'Préf.',
  'sous-préfecture': 'S.-préf.',
  'consulat': 'Consulat',
}

/**
 * Champ d'autocomplétion pour un lieu de délivrance d'une pièce d'identité française :
 * préfectures, sous-préfectures (chefs-lieux d'arrondissement) ou consulats de France à l'étranger.
 *
 * Format de la valeur stockée : « Ville (XX) » pour la France, « Ville (Pays) » pour les consulats.
 */
export default function PrefectureSearch({ value, onChange, placeholder = 'Préfecture, sous-préfecture ou consulat' }) {
  const fetchSuggestions = async (q) => {
    const nq = normalize(q)
    return LIEUX_DELIVRANCE
      .filter((l) =>
        normalize(l.ville).includes(nq)
        || normalize(l.nom).includes(nq)
        || (typeof l.code === 'string' && l.code.toLowerCase().startsWith(nq))
      )
      .slice(0, 10)
      .map((l) => ({
        label: `${l.libelle}${l.type !== 'préfecture' ? ` — ${TYPE_BADGE[l.type]}` : ''}${l.nom && l.type !== 'consulat' ? ` (${l.nom})` : ''}`,
        value: l.libelle,
      }))
  }

  return (
    <Autocomplete
      value={value}
      onChange={onChange}
      onSelect={(item) => onChange(item.value)}
      fetchSuggestions={fetchSuggestions}
      minChars={1}
      placeholder={placeholder}
    />
  )
}
