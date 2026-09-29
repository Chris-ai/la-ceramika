const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

export const apiUrl = (path: string) => `${API_URL}${path}`

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init)
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail?.[0]?.msg ?? body?.detail ?? 'Nie udało się połączyć z backendem.')
  }
  return response.json()
}

export function jsonRequest(method: 'POST' | 'PUT' | 'PATCH', body?: unknown): RequestInit {
  return {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }
}
