import { useState, useEffect, useRef } from 'react'

/**
 * Champ d'autocomplétion générique.
 *
 * @param {string} value - texte courant affiché
 * @param {(string) => void} onChange - appelé à chaque frappe (texte libre)
 * @param {(item) => void} onSelect - appelé quand l'utilisateur clique une suggestion
 * @param {(query: string, signal: AbortSignal) => Promise<Array<{label, value, ...}>>} fetchSuggestions
 * @param {number} [minChars=2] - nombre minimal de caractères pour déclencher la recherche
 * @param {number} [debounceMs=200] - délai de debounce
 * @param {string} [placeholder]
 * @param {boolean} [required]
 */
export default function Autocomplete({
  value,
  onChange,
  onSelect,
  fetchSuggestions,
  minChars = 2,
  debounceMs = 200,
  placeholder,
  required,
  disabled,
}) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const timerRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleChange = (e) => {
    const q = e.target.value
    onChange(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (abortRef.current) abortRef.current.abort()
    if (q.length < minChars) {
      setSuggestions([])
      setOpen(false)
      return
    }
    timerRef.current = setTimeout(async () => {
      const ctrl = new AbortController()
      abortRef.current = ctrl
      try {
        const items = await fetchSuggestions(q, ctrl.signal)
        if (!ctrl.signal.aborted) {
          setSuggestions(items)
          setOpen(items.length > 0)
        }
      } catch {
        if (!ctrl.signal.aborted) {
          setSuggestions([])
          setOpen(false)
        }
      }
    }, debounceMs)
  }

  const handleSelect = (item) => {
    setOpen(false)
    setSuggestions([])
    onSelect(item)
  }

  return (
    <div className="address-search" ref={ref}>
      <input
        type="text"
        value={value || ''}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete="off"
      />
      {open && !disabled && (
        <ul className="address-suggestions">
          {suggestions.map((s, i) => (
            <li key={s.value ?? i} onClick={() => handleSelect(s)}>
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Normalise une chaîne pour comparaison insensible aux accents et à la casse. */
export function normalize(s) {
  return (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}
