import { useState } from 'react'
import Autocomplete from './Autocomplete.jsx'
import { searchAdresses } from '../api/adresses.js'

/**
 * Recherche d'adresses via le proxy backend {@code /api/adresses/search}.
 * Le backend interroge la BAN en premier, puis Nominatim en fallback —
 * la logique de fallback BAN→Nominatim vit côté serveur, ce qui évite
 * que les postes utilisateurs aient besoin d'un accès direct à
 * api-adresse.data.gouv.fr et à nominatim.openstreetmap.org (souvent
 * bloqués sur les réseaux d'entreprise restrictifs).
 *
 * @param {(addr: { rue, codePostal, ville, pays }) => void} onSelect
 */
export default function AddressSearch({ onSelect }) {
  const [query, setQuery] = useState('')

  const fetchSuggestions = async (q, signal) => {
    // L'AbortSignal n'est pas propagé au fetch côté backend : on annule
    // simplement le rendu si la requête revient après une nouvelle saisie.
    const data = await searchAdresses(q, 6)
    if (signal?.aborted) return []
    return (data || []).map((s, i) => ({
      label: s.label,
      value: `adr-${i}-${s.label}`,
      data: {
        rue:        s.rue        || '',
        codePostal: s.codePostal || '',
        ville:      s.ville      || '',
        pays:       s.pays       || 'France',
      },
    }))
  }

  const handleSelect = (item) => {
    setQuery(item.label)
    onSelect({
      rue:        item.data.rue,
      codePostal: item.data.codePostal,
      ville:      item.data.ville,
      pays:       item.data.pays,
    })
  }

  return (
    <Autocomplete
      value={query}
      onChange={setQuery}
      onSelect={handleSelect}
      fetchSuggestions={fetchSuggestions}
      minChars={3}
      debounceMs={250}
      placeholder="Rechercher une adresse..."
    />
  )
}
