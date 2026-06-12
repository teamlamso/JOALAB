import { request } from './config.js'

export function listClients(search = '') {
  const params = search ? `?search=${encodeURIComponent(search)}` : ''
  return request(`/clients${params}`)
}

export function getClient(id) {
  return request(`/clients/${id}`)
}

export function createClient(data) {
  return request('/clients', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateClient(id, data) {
  return request(`/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function updateClientIdentification(id, data) {
  return request(`/clients/${id}/identification`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/** Supprime un client. Réservé aux MCD ; le backend refuse si fiches associées. */
export function deleteClient(id) {
  return request(`/clients/${id}`, { method: 'DELETE' })
}

/**
 * Importe en masse des clients depuis un fichier Excel (.xlsx ou .xls).
 * Réservé aux RESPONSABLE_CAISSE et MCD. Retourne un résumé avec le nombre
 * d'imports, doublons ignorés, clients incomplets et erreurs détaillées.
 */
export function importClients(file) {
  const data = new FormData()
  data.append('file', file)
  return request('/clients/import', { method: 'POST', body: data })
}

/**
 * Recherche les clients existants potentiellement similaires (mêmes nom+prénom
 * +date de naissance, ou même numéro de pièce). Retourne la liste des
 * candidats détectés (peut être vide).
 */
export function matchClient(data) {
  return request('/clients/match', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
