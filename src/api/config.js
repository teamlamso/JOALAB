const API_BASE = '/api'

export async function request(path, options = {}) {
  const token = localStorage.getItem('token')
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (res.status === 204 || res.status === 201) return null

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
