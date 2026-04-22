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
