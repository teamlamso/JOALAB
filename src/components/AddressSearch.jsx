import { useState } from 'react'
import Autocomplete from './Autocomplete.jsx'

/**
 * Recherche d'adresse internationale via Nominatim (OpenStreetMap).
 *
 * @param {(addr: { rue, codePostal, ville, pays }) => void} onSelect
 */
export default function AddressSearch({ onSelect }) {
  const [query, setQuery] = useState('')

  const fetchSuggestions = async (q, signal) => {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', q)
    url.searchParams.set('format', 'json')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('limit', '6')
    url.searchParams.set('accept-language', 'fr')
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
    if (!res.ok) return []
    const data = await res.json()
    return data.map((d) => ({
      label: d.display_name,
      value: d.place_id,
      data: d.address || {},
    }))
  }

  const handleSelect = (item) => {
    const a = item.data
    const houseNumber = a.house_number ? `${a.house_number} ` : ''
    const rue = `${houseNumber}${a.road || a.pedestrian || a.path || ''}`.trim()
    const ville = a.city || a.town || a.village || a.municipality || ''
    setQuery(item.label)
    onSelect({
      rue,
      codePostal: a.postcode || '',
      ville,
      pays: a.country || '',
    })
  }

  return (
    <Autocomplete
      value={query}
      onChange={setQuery}
      onSelect={handleSelect}
      fetchSuggestions={fetchSuggestions}
      minChars={3}
      debounceMs={350}
      placeholder="Rechercher une adresse (international)..."
    />
  )
}
