import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from './api'

afterEach(() => vi.unstubAllGlobals())

describe('typed API client', () => {
  it('uses only relative unified API routes and preserves decimal strings', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: '19.75' }), { status: 201 }))
    vi.stubGlobal('fetch', fetch)
    await expect(api.calculate('thread-id', { operation: 'add', operands: ['12.50', '7.25'] })).resolves.toMatchObject({ result: '19.75' })
    expect(fetch).toHaveBeenCalledWith('/api/v1/calculations', expect.objectContaining({ method: 'POST', body: '{"threadId":"thread-id","operation":"add","operands":["12.50","7.25"]}' }))
  })
  it('handles a bodyless delete and propagates the requested query abort signal', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })).mockResolvedValueOnce(new Response('[]'))
    vi.stubGlobal('fetch', fetch)
    await expect(api.deleteThread('id')).resolves.toBeUndefined()
    const signal = new AbortController().signal
    await api.threads(signal)
    expect(fetch).toHaveBeenLastCalledWith('/api/v1/threads', expect.objectContaining({ signal }))
  })
  it('provides safe server and network errors to the interface', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('{"error":{"code":"DIVISION_BY_ZERO","message":"Cannot divide by zero."}}', { status: 422 })).mockRejectedValueOnce(new TypeError('secret connection detail'))
    vi.stubGlobal('fetch', fetch)
    await expect(api.calculate('id', { operation: 'divide', operands: ['1', '0'] })).rejects.toMatchObject({ code: 'DIVISION_BY_ZERO', message: 'Cannot divide by zero.' })
    await expect(api.threads()).rejects.toBeInstanceOf(ApiError)
  })
})
