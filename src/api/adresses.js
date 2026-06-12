import { request } from './config.js'

export function searchAdresses(q, limit = 6) {
  const params = new URLSearchParams({ q, limit: String(limit) })
  return request(`/adresses/search?${params}`)
}
