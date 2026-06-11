import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { request } from '../config.js'

/**
 * Verrouille le contrat entre `request()` et le `GlobalExceptionMapper`
 * backend : toute réponse non-OK contenant `{"message": "..."}` doit
 * remonter ce message exact côté caller. Sans ce test, une refactorisation
 * silencieuse (lecture de `.error` uniquement, ou message générique) ne
 * casserait rien de visible mais ferait disparaître les toasts métier.
 */
describe('request()', () => {
  let originalFetch
  let originalLocation
  let originalLocalStorage

  beforeEach(() => {
    originalFetch = globalThis.fetch
    originalLocation = window.location
    // Node 26 expose un `globalThis.localStorage` expérimental qui éteint
    // celui de jsdom et lève dès qu'on l'utilise sans `--localstorage-file`.
    // On le remplace par un Map en mémoire, le temps du test.
    originalLocalStorage = globalThis.localStorage
    const store = new Map()
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    }
    // window.location.href est en lecture-seule par défaut — on le remplace
    // par un objet mutable pour observer la redirection sur 401.
    delete window.location
    window.location = { href: '/' }
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    window.location = originalLocation
    globalThis.localStorage = originalLocalStorage
    vi.restoreAllMocks()
  })

  const mockFetch = (response) => {
    globalThis.fetch = vi.fn().mockResolvedValue(response)
  }

  const jsonResponse = (status, body, headers = {}) => ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
    headers: { get: (k) => headers[k] ?? null },
  })

  const nonJsonResponse = (status, headers = {}) => ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => { throw new Error('not json') },
    headers: { get: (k) => headers[k] ?? null },
  })

  // --- chemin nominal ---------------------------------------------------

  it('200 renvoie le JSON parsé', async () => {
    mockFetch(jsonResponse(200, { id: 42, nom: 'Dupont' }))
    const res = await request('/clients/42')
    expect(res).toEqual({ id: 42, nom: 'Dupont' })
  })

  it('204 renvoie null sans tenter de parser', async () => {
    // Tenter un .json() sur un 204 lèverait — on doit court-circuiter avant.
    mockFetch({ status: 204, ok: true, json: async () => { throw new Error('boom') }, headers: { get: () => null } })
    const res = await request('/clients/42', { method: 'DELETE' })
    expect(res).toBeNull()
  })

  it('201 avec body JSON renvoie le body', async () => {
    mockFetch(jsonResponse(201, { id: 99 }))
    const res = await request('/clients', { method: 'POST', body: '{}' })
    expect(res).toEqual({ id: 99 })
  })

  it('201 sans body parsable extrait l\'id du header Location', async () => {
    mockFetch(nonJsonResponse(201, { Location: '/api/clients/123' }))
    const res = await request('/clients', { method: 'POST' })
    expect(res).toEqual({ id: 123 })
  })

  it('201 sans body ni Location renvoie null', async () => {
    mockFetch(nonJsonResponse(201))
    const res = await request('/clients', { method: 'POST' })
    expect(res).toBeNull()
  })

  // --- contrat avec GlobalExceptionMapper -------------------------------

  it('400 avec {"message": "..."} remonte le message tel quel', async () => {
    // Le backend (GlobalExceptionMapper) émet toujours cette forme. Si on
    // perd cette lecture, tous les toasts métier deviennent "Erreur 400".
    mockFetch(jsonResponse(400, {
      message: 'Votre rôle ne vous permet pas de modifier ce lieu de naissance.',
    }))
    await expect(request('/clients/10/identification', { method: 'PUT' }))
      .rejects.toThrow('Votre rôle ne vous permet pas de modifier ce lieu de naissance.')
  })

  it('400 avec {"error": "..."} (fallback ancien format) remonte error', async () => {
    mockFetch(jsonResponse(400, { error: 'ancien format' }))
    await expect(request('/x')).rejects.toThrow('ancien format')
  })

  it('message prime sur error si les deux sont présents', async () => {
    mockFetch(jsonResponse(400, { message: 'lisible', error: 'CODE_42' }))
    await expect(request('/x')).rejects.toThrow('lisible')
  })

  it('500 sans body JSON parsable retombe sur "Erreur {status}"', async () => {
    mockFetch(nonJsonResponse(500))
    await expect(request('/x')).rejects.toThrow('Erreur 500')
  })

  it('403 avec body vide retombe sur "Erreur {status}"', async () => {
    // body JSON {} → ni message ni error → fallback générique.
    mockFetch(jsonResponse(403, {}))
    await expect(request('/x')).rejects.toThrow('Erreur 403')
  })

  // --- gestion du 401 / session ----------------------------------------

  it('401 hors login efface le token, redirige et jette', async () => {
    localStorage.setItem('token', 'expiré')
    localStorage.setItem('user', '{"id":1}')
    mockFetch(jsonResponse(401, {}))

    await expect(request('/clients')).rejects.toThrow('Session expirée')
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    expect(window.location.href).toBe('/')
  })

  it('401 sur /auth/login n\'efface pas le token et ne redirige pas', async () => {
    // Sur la page de login, un 401 = mauvais mot de passe, pas une session
    // expirée — il faut afficher le message et laisser l'utilisateur réessayer.
    localStorage.setItem('token', 'présent')
    mockFetch(jsonResponse(401, { message: 'Identifiant ou mot de passe incorrect' }))

    await expect(request('/auth/login', { method: 'POST' }))
      .rejects.toThrow('Identifiant ou mot de passe incorrect')
    expect(localStorage.getItem('token')).toBe('présent')
  })

  // --- en-têtes --------------------------------------------------------

  it('ajoute Authorization Bearer quand un token est en localStorage', async () => {
    localStorage.setItem('token', 'xyz')
    mockFetch(jsonResponse(200, {}))

    await request('/clients')

    const headers = globalThis.fetch.mock.calls[0][1].headers
    expect(headers.Authorization).toBe('Bearer xyz')
  })

  it('omet Authorization si pas de token', async () => {
    mockFetch(jsonResponse(200, {}))
    await request('/auth/login', { method: 'POST', body: '{}' })
    const headers = globalThis.fetch.mock.calls[0][1].headers
    expect(headers.Authorization).toBeUndefined()
  })

  it('pose Content-Type: application/json par défaut', async () => {
    mockFetch(jsonResponse(200, {}))
    await request('/x', { method: 'POST', body: '{}' })
    const headers = globalThis.fetch.mock.calls[0][1].headers
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('omet Content-Type quand body est un FormData (laisse le navigateur le poser)', async () => {
    // Le browser doit ajouter lui-même le boundary multipart — on ne doit pas
    // surcharger l'en-tête sinon l'upload échoue avec un 415.
    mockFetch(jsonResponse(200, {}))
    const fd = new FormData()
    fd.append('fichier', new Blob(['x']), 'x.xlsx')

    await request('/clients/import', { method: 'POST', body: fd })

    const headers = globalThis.fetch.mock.calls[0][1].headers
    expect(headers['Content-Type']).toBeUndefined()
  })

  it('les headers du caller surchargent les défauts', async () => {
    mockFetch(jsonResponse(200, {}))
    await request('/x', { headers: { 'Content-Type': 'text/plain', 'X-Custom': 'oui' } })

    const headers = globalThis.fetch.mock.calls[0][1].headers
    expect(headers['Content-Type']).toBe('text/plain')
    expect(headers['X-Custom']).toBe('oui')
  })

  it('préfixe le chemin par /api', async () => {
    mockFetch(jsonResponse(200, {}))
    await request('/clients/42')
    expect(globalThis.fetch.mock.calls[0][0]).toBe('/api/clients/42')
  })
})
