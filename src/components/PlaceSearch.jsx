import Autocomplete from './Autocomplete.jsx'
import { searchLieux } from '../api/lieux.js'

/**
 * Recherche de ville (lieu de naissance) via le proxy backend
 * {@code /api/lieux/search}. Le backend interroge Nominatim et formate
 * les libellés en {@code "Ville (XX)"} où XX est le numéro de département
 * pour la France ou le pays pour l'international.
 *
 * <p>Le proxy évite l'appel direct depuis le navigateur — certains réseaux
 * d'entreprise interceptent les requêtes HTTPS vers nominatim.openstreetmap.org
 * et présentent un certificat invalide ({@code ERR_CERT_AUTHORITY_INVALID}).
 *
 * @param {string} value
 * @param {(lieu: string) => void} onChange
 */
export default function PlaceSearch({ value, onChange, placeholder = 'Lieu de naissance', disabled }) {
  const fetchSuggestions = async (q, signal) => {
    const data = await searchLieux(q, 6)
    if (signal?.aborted) return []
    return (data || []).map((s) => ({ label: s.label, value: s.label }))
  }

  return (
    <Autocomplete
      value={value}
      onChange={onChange}
      onSelect={(item) => onChange(item.value)}
      fetchSuggestions={fetchSuggestions}
      minChars={3}
      debounceMs={350}
      placeholder={placeholder}
      disabled={disabled}
    />
  )
}
