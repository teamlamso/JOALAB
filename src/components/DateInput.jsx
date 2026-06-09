import { useState, useEffect } from 'react'

/**
 * Champ de saisie de date au format dd/mm/yyyy.
 * - value : date ISO (yyyy-MM-dd) ou vide
 * - onChange(isoString) : appelé avec la date ISO quand la saisie est valide
 *
 * Une saisie invalide (mois > 12, jour incompatible avec le mois, année hors
 * 1900-2100) marque visuellement le champ et NE PROPAGE PAS la valeur :
 * sans cette garde-fou, un « 10/20/2000 » envoyait au backend une chaîne
 * qui faisait planter LocalDate.parse() en 500.
 */
export default function DateInput({ value, onChange, ...props }) {
  const isoToDisplay = (iso) => {
    if (!iso) return ''
    const parts = iso.split('-')
    if (parts.length !== 3) return ''
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  const [text, setText] = useState(isoToDisplay(value))
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    setText(isoToDisplay(value))
    setInvalid(false)
  }, [value])

  /**
   * Vérifie que (jj, mm, aaaa) forme une date civile réelle. Refuse 31/02,
   * 31/04, 29/02 hors année bissextile, etc. — pas seulement le bornage
   * naïf 1≤mm≤12 / 1≤jj≤31.
   */
  const dateEstValide = (d, m, y) => {
    if (y < 1900 || y > 2100) return false
    if (m < 1 || m > 12) return false
    if (d < 1) return false
    const joursParMois = [31,
                          (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28,
                          31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    return d <= joursParMois[m - 1]
  }

  const handleChange = (e) => {
    let digits = e.target.value.replace(/\D/g, '')
    if (digits.length > 8) digits = digits.slice(0, 8)

    let formatted = ''
    for (let i = 0; i < digits.length; i++) {
      if (i === 2 || i === 4) formatted += '/'
      formatted += digits[i]
    }
    setText(formatted)

    if (digits.length === 8) {
      const d = Number(digits.slice(0, 2))
      const m = Number(digits.slice(2, 4))
      const y = Number(digits.slice(4, 8))
      if (dateEstValide(d, m, y)) {
        setInvalid(false)
        onChange(`${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`)
      } else {
        setInvalid(true)
        onChange('')
      }
    } else {
      setInvalid(false)
      if (formatted === '') onChange('')
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      onChange={handleChange}
      placeholder="jj/mm/aaaa"
      maxLength={10}
      aria-invalid={invalid || undefined}
      title={invalid ? 'Date invalide (jour, mois ou année incohérents)' : undefined}
      style={invalid ? { borderColor: 'var(--danger, #c0392b)', backgroundColor: '#fff5f5' } : undefined}
      {...props}
    />
  )
}
