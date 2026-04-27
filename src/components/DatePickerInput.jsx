import { useState, useEffect, useRef } from 'react'

/**
 * Champ de saisie de date avec date picker natif.
 * Affiche en dd/mm/yyyy, ouvre un calendrier au clic sur l'icône.
 * - value : date ISO (yyyy-MM-dd) ou vide
 * - onChange(isoString) : appelé avec la date ISO
 */
export default function DatePickerInput({ value, onChange }) {
  const isoToDisplay = (iso) => {
    if (!iso) return ''
    const parts = iso.split('-')
    if (parts.length !== 3) return ''
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  const [text, setText] = useState(isoToDisplay(value))
  const pickerRef = useRef(null)

  useEffect(() => {
    setText(isoToDisplay(value))
  }, [value])

  const handleTextChange = (e) => {
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

  const handlePickerChange = (e) => {
    const iso = e.target.value
    if (iso) {
      onChange(iso)
    }
  }

  const openPicker = () => {
    if (pickerRef.current && pickerRef.current.showPicker) {
      pickerRef.current.showPicker()
    }
  }

  return (
    <div className="date-picker-input">
      <input
        type="text"
        inputMode="numeric"
        value={text}
        onChange={handleTextChange}
        placeholder="jj/mm/aaaa"
        maxLength={10}
      />
      <button type="button" className="date-picker-btn" onClick={openPicker} title="Ouvrir le calendrier">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </button>
      <input
        ref={pickerRef}
        type="date"
        className="date-picker-hidden"
        value={value || ''}
        onChange={handlePickerChange}
        tabIndex={-1}
      />
    </div>
  )
}
