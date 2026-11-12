import type { CalculationInput } from './calculator-state'

export type Thread = { id: string; name: string; createdAt: string; updatedAt: string }
export type Calculation = CalculationInput & { id: string; threadId: string; expression: string; result: string; createdAt: string }

export class ApiError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = 'ApiError' }
}

function errorMessage(value: unknown): { code: string; message: string } | null {
  if (typeof value !== 'object' || value === null || !('error' in value)) return null
  const error = value.error
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error && typeof error.code === 'string' && typeof error.message === 'string' ? { code: error.code, message: error.message } : null
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api/v1${path}`, { ...options, headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError('NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.')
  }
  if (!response.ok) {
    const problem = errorMessage(await response.json().catch(() => null))
    throw new ApiError(problem?.code ?? 'REQUEST_FAILED', problem?.message ?? 'The request failed. Please try again.')
  }
  if (response.status === 204) return undefined as T
  try { return await response.json() as T } catch { throw new ApiError('INVALID_RESPONSE', 'The server returned an unexpected response. Please try again.') }
}

export const api = {
  threads: (signal?: AbortSignal) => request<Thread[]>('/threads', { signal }),
  createThread: () => request<Thread>('/threads', { method: 'POST', body: '{}' }),
  renameThread: (id: string, name: string) => request<Thread>(`/threads/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  deleteThread: (id: string) => request<void>(`/threads/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  history: (id: string, signal?: AbortSignal) => request<Calculation[]>(`/threads/${encodeURIComponent(id)}/calculations`, { signal }),
  calculate: (threadId: string, input: CalculationInput) => request<Calculation>('/calculations', { method: 'POST', body: JSON.stringify({ threadId, ...input }) }),
}
