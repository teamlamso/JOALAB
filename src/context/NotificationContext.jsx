import { createContext, useContext, useState, useCallback, useRef } from 'react'

const NotificationContext = createContext(null)

let nextId = 1

/**
 * Provider d'un système de notifications "toast".
 * Expose useNotify() qui retourne une fonction notify(message, type='success').
 * Types : 'success' | 'error' | 'info' | 'warning'.
 */
export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const notify = useCallback((message, type = 'success', duration = 4000) => {
    const id = nextId++
    setToasts((list) => [...list, { id, message, type }])
    if (duration > 0) {
      const timer = setTimeout(() => dismiss(id), duration)
      timersRef.current.set(id, timer)
    }
    return id
  }, [dismiss])

  return (
    <NotificationContext.Provider value={{ notify, dismiss }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => dismiss(t.id)}>
            {t.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

export function useNotify() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotify doit être utilisé dans NotificationProvider')
  return ctx.notify
}
