import { useState, useRef, useEffect } from 'react'

const API_URL = 'https://api-adresse.data.gouv.fr/search/'

/**
 * Champ d'autocompletion d'adresse via l'API adresse.data.gouv.fr.
 * - onSelect({ rue, codePostal, ville, pays }) : appele quand l'utilisateur choisit une suggestion
 * - initialValue : texte initial affiche dans le champ
 */
export default function AddressSearch({ onSelect, initialValue }) {
  const [query, setQuery] = useState(initialValue || '')
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = (q) => {
    setQuery(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (q.length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}?q=${encodeURIComponent(q)}&limit=5`)
        const data = await res.json()
        const items = (data.features || []).map((f) => ({
          label: f.properties.label,
          rue: f.properties.name,
          codePostal: f.properties.postcode,
          ville: f.properties.city,
        }))
        setSuggestions(items)
        setOpen(items.length > 0)
      } catch {
        setSuggestions([])
        setOpen(false)
      }
    }, 300)
  }

  const select = (item) => {
    setQuery(item.label)
    setOpen(false)
    setSuggestions([])
    onSelect({
      rue: item.rue,
      codePostal: item.codePostal,
      ville: item.ville,
      pays: 'France',
    })
  }

  return (
    <div className="address-search" ref={ref}>
      <input
        type="text"
        value={query}
        onChange={(e) => search(e.target.value)}
        placeholder="Rechercher une adresse..."
      />
      {open && (
        <ul className="address-suggestions">
          {suggestions.map((s, i) => (
            <li key={i} onClick={() => select(s)}>
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
