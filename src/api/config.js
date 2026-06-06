const API_BASE = '/api'

export async function request(path, options = {}) {
  const token = localStorage.getItem('token')
  // Pour un FormData (upload de fichier), c'est le navigateur qui doit poser
  // l'en-tête Content-Type avec le boundary multipart — ne pas l'écraser.
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (res.status === 204) return null

  if (res.status === 201) {
    // 201 Created : on essaie d'abord de parser un body JSON. À défaut, on
    // extrait l'id depuis le header Location (format /api/{ressource}/{id})
    // pour que les callers puissent rediriger vers la ressource créée sans
    // avoir à dupliquer du parsing partout.
    try { return await res.json() } catch {
      const loc = res.headers.get('Location')
      if (loc) {
        const match = loc.match(/\/(\d+)(?:\?.*)?$/)
        if (match) return { id: Number(match[1]) }
      }
      return null
    }
  }

  if (res.status === 401 && !path.includes('/auth/login')) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/'
    throw new Error('Session expirée')
  }

  if (!res.ok) {
    let message = `Erreur ${res.status}`
    try {
      const body = await res.json()
      message = body.message || body.error || message
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  return res.json()
}
