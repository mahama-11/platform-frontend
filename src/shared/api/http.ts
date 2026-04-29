import { env } from '@/shared/config/env'
import { STORAGE_KEYS } from '@/shared/config/storage'
import type { ApiErrorResponse, ApiSuccessResponse } from '@/shared/types/api'

export class ApiError extends Error {
  code: number
  errorCode?: string
  errorHint?: string
  requestId?: string

  constructor(payload: ApiErrorResponse) {
    super(payload.error || payload.message || 'API request failed')
    this.name = 'ApiError'
    this.code = payload.code
    this.errorCode = payload.error_code
    this.errorHint = payload.error_hint
    this.requestId = payload.request_id
  }
}

function getToken() {
  return localStorage.getItem(STORAGE_KEYS.token)
}

function getOrgId() {
  return localStorage.getItem(STORAGE_KEYS.orgId)
}

function buildHeaders(init?: HeadersInit) {
  const headers = new Headers(init)
  const token = getToken()
  const orgId = getOrgId()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (orgId) {
    headers.set('X-Organization-ID', orgId)
  }
  return headers
}

async function requestWithBase<T>(baseUrl: string, path: string, init: RequestInit = {}): Promise<T> {
  const headers = buildHeaders(init.headers)
  headers.set('Content-Type', 'application/json')

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  })

  const payload = (await response.json()) as ApiSuccessResponse<T> | ApiErrorResponse

  if (!response.ok || payload.code !== 0) {
    const errorPayload = payload as ApiErrorResponse
    if (response.status === 401) {
      localStorage.removeItem(STORAGE_KEYS.token)
      localStorage.removeItem(STORAGE_KEYS.orgId)
      window.location.href = '/login'
    }
    throw new ApiError(errorPayload)
  }

  return (payload as ApiSuccessResponse<T>).data
}

async function requestTextWithBase(baseUrl: string, path: string, init: RequestInit = {}) {
  const headers = buildHeaders(init.headers)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  })

  const payload = await response.text()
  if (!response.ok) {
    throw new Error(payload || `Request failed with status ${response.status}`)
  }
  return payload
}

export async function request<T>(path: string, init: RequestInit = {}) {
  return requestWithBase<T>(env.apiBaseUrl, path, init)
}

export async function requestMenu<T>(path: string, init: RequestInit = {}) {
  return requestWithBase<T>(env.menuApiBaseUrl, path, init)
}

export async function requestText(path: string, init: RequestInit = {}) {
  return requestTextWithBase(env.apiBaseUrl, path, init)
}

export async function openProtectedResource(baseUrl: string, path: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers: buildHeaders(),
  })

  if (!response.ok) {
    let payload: ApiErrorResponse
    try {
      payload = (await response.json()) as ApiErrorResponse
    } catch {
      payload = {
        code: response.status,
        message: 'Failed to open protected resource',
        timestamp: Date.now(),
      }
    }
    throw new ApiError(payload)
  }

  const blob = await response.blob()
  const blobUrl = URL.createObjectURL(blob)
  window.open(blobUrl, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
}
