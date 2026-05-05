import Autocomplete from './Autocomplete.jsx'

/**
 * Recherche de ville (lieu de naissance) basée sur Nominatim (OpenStreetMap).
 * Renvoie un libellé du type :
 * - « Besançon (25) » pour les villes françaises (numéro de département via le code postal)
 * - « Tokyo (Japon) » pour les villes étrangères
 *
 * @param {string} value
 * @param {(lieu: string) => void} onChange
 */
export default function PlaceSearch({ value, onChange, placeholder = 'Lieu de naissance' }) {
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
    return data
      .filter((d) => d.address && (d.address.city || d.address.town || d.address.village || d.address.municipality))
      .map((d) => {
        const a = d.address
        const ville = a.city || a.town || a.village || a.municipality
        let suffixe
        if (a.country_code === 'fr' && a.postcode) {
          const dpt = a.postcode.startsWith('97') ? a.postcode.slice(0, 3) : a.postcode.slice(0, 2)
          suffixe = `(${dpt})`
        } else {
          suffixe = `(${a.country || ''})`
        }
        const label = `${ville} ${suffixe}`
        return { label, value: label }
      })
      .filter((item, i, arr) => arr.findIndex((x) => x.value === item.value) === i)
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
    />
  )
}
