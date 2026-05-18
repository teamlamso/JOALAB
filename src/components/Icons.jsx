export function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

export function ClearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

export function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function WarningIcon({ size = 16, title }) {
  return (
    <span className="icone-warning" title={title}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L1 21h22L12 2zm0 6c.55 0 1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V9c0-.55.45-1 1-1zm0 10c-.69 0-1.25.56-1.25 1.25S11.31 20.5 12 20.5s1.25-.56 1.25-1.25S12.69 18 12 18z" />
      </svg>
    </span>
  )
}
