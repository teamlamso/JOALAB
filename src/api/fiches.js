import { request } from './config.js'

export function listFiches({ dateDebut, dateFin, search } = {}) {
  const params = new URLSearchParams()
  if (dateDebut) params.set('dateDebut', dateDebut)
  if (dateFin) params.set('dateFin', dateFin)
  if (search) params.set('search', search)
  const qs = params.toString()
  return request(`/fiches${qs ? `?${qs}` : ''}`)
}

export function getFiche(id) {
  return request(`/fiches/${id}`)
}

export function createFiche(data) {
  return request('/fiches', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateFiche(id, data) {
  return request(`/fiches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/** Supprime une fiche. Réservé aux MCD côté backend. */
export function deleteFiche(id) {
  return request(`/fiches/${id}`, { method: 'DELETE' })
}
