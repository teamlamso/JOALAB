import { useState } from 'react'
import Autocomplete from './Autocomplete.jsx'

/**
 * Recherche d'adresse rapide via la BAN (Base Adresse Nationale,
 * api-adresse.data.gouv.fr) pour la France, avec fallback Nominatim
 * (OpenStreetMap) si la BAN ne retourne rien — utile pour les rares
 * adresses étrangères.
 *
 * La BAN est typiquement < 100 ms et renvoie un libellé propre du type
 * « 10 Rue de la Paix 75002 Paris » directement utilisable, contrairement
 * au `display_name` verbeux de Nominatim.
 *
 * @param {(addr: { rue, codePostal, ville, pays }) => void} onSelect
 */
export default function AddressSearch({ onSelect }) {
  const [query, setQuery] = useState('')

  const fetchSuggestions = async (q, signal) => {
    // 1. BAN d'abord — rapide, France, format propre.
    try {
      const banUrl = new URL('https://api-adresse.data.gouv.fr/search/')
      banUrl.searchParams.set('q', q)
      banUrl.searchParams.set('limit', '6')
      banUrl.searchParams.set('autocomplete', '1')
      const res = await fetch(banUrl, { signal })
      if (res.ok) {
        const data = await res.json()
        const items = (data.features || []).map((f, i) => ({
          label: f.properties.label,
          value: 'ban-' + (f.properties.id || i),
          data: {
            source: 'ban',
            rue:        f.properties.name     || '',
            codePostal: f.properties.postcode || '',
            ville:      f.properties.city     || '',
            pays:       'France',
          },
        }))
        if (items.length > 0) return items
      }
    } catch (e) {
      if (e.name === 'AbortError') throw e
      // Sinon on tente Nominatim en fallback ci-dessous.
    }

    // 2. Nominatim en fallback — couvre l'international.
    const nomUrl = new URL('https://nominatim.openstreetmap.org/search')
    nomUrl.searchParams.set('q', q)
    nomUrl.searchParams.set('format', 'json')
    nomUrl.searchParams.set('addressdetails', '1')
    nomUrl.searchParams.set('limit', '6')
    nomUrl.searchParams.set('accept-language', 'fr')
    const res = await fetch(nomUrl, { signal, headers: { Accept: 'application/json' } })
    if (!res.ok) return []
    const data = await res.json()
    return data.map((d) => {
      const a = d.address || {}
      const houseNumber = a.house_number ? `${a.house_number} ` : ''
      const rue = `${houseNumber}${a.road || a.pedestrian || a.path || ''}`.trim()
      const ville = a.city || a.town || a.village || a.municipality || ''
      // Label condensé pour ne pas afficher tout le display_name verbeux.
      const label = [rue, a.postcode, ville, a.country].filter(Boolean).join(', ')
      return {
        label: label || d.display_name,
        value: 'nom-' + d.place_id,
        data: {
          source: 'nominatim',
          rue,
          codePostal: a.postcode || '',
          ville,
          pays: a.country || '',
        },
      }
    })
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
