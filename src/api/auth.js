import { request } from './config.js'

export function login(identifiant, motDePasse) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifiant, motDePasse }),
  })
}

export function logout() {
  return request('/auth/logout', { method: 'POST' })
}
