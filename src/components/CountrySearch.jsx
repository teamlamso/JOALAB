import Autocomplete, { normalize } from './Autocomplete.jsx'
import { PAYS } from '../data/pays.js'

/**
 * Champ d'autocomplétion pour un pays (liste statique des pays du monde).
 *
 * @param {string} value
 * @param {(pays: string) => void} onChange
 */
export default function CountrySearch({ value, onChange, placeholder = 'Pays' }) {
  const fetchSuggestions = async (q) => {
    const nq = normalize(q)
    return PAYS
      .filter((p) => normalize(p).includes(nq))
      .slice(0, 8)
      .map((p) => ({ label: p, value: p }))
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
