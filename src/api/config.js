const API_BASE = '/api'

export async function request(path, options = {}) {
  const token = localStorage.getItem('token')
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (res.status === 204) return null

  if (!res.ok) {
    let message = `Erreur ${res.status}`
    try {
      const body = await res.json()
      message = body.message || message
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  return res.json()
}
