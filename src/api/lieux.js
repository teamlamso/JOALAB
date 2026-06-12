import { request } from './config.js'

export function searchLieux(q, limit = 6) {
  const params = new URLSearchParams({ q, limit: String(limit) })
  return request(`/lieux/search?${params}`)
}
