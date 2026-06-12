import { request } from './config.js'

/** Liste les utilisateurs applicatifs. Accessible RESPONSABLE_CAISSE et MCD. */
export function listUtilisateurs({ includeArchives = false } = {}) {
  const qs = includeArchives ? '?includeArchives=true' : ''
  return request(`/utilisateurs${qs}`)
}

export function createUtilisateur(data) {
  return request('/utilisateurs', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateUtilisateur(id, data) {
  return request(`/utilisateurs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function archiverUtilisateur(id) {
  return request(`/utilisateurs/${id}/archiver`, {
    method: 'POST',
  })
}

export function desarchiverUtilisateur(id) {
  return request(`/utilisateurs/${id}/desarchiver`, {
    method: 'POST',
  })
}
