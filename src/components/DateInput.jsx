import { useState, useEffect } from 'react'

/**
 * Champ de saisie de date au format dd/mm/yyyy.
 * - value : date ISO (yyyy-MM-dd) ou vide
 * - onChange(isoString) : appele avec la date ISO quand la saisie est complete
 */
export default function DateInput({ value, onChange, ...props }) {
  const isoToDisplay = (iso) => {
    if (!iso) return ''
    const parts = iso.split('-')
    if (parts.length !== 3) return ''
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  const [text, setText] = useState(isoToDisplay(value))

  useEffect(() => {
    setText(isoToDisplay(value))
  }, [value])

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
      const d = digits.slice(0, 2)
      const m = digits.slice(2, 4)
      const y = digits.slice(4, 8)
      onChange(`${y}-${m}-${d}`)
    } else if (formatted === '') {
      onChange('')
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
      {...props}
    />
  )
}
