import { describe, it, expect, mock, beforeEach, afterAll } from 'bun:test'
import { NextRequest } from 'next/server'

// --- Supabase mock -----------------------------------------------------------

const mockSingle = mock(() =>
  Promise.resolve({
    data: { id: 'broker-1', crm_webhook_url: 'https://saved.webhook/hook' },
    error: null,
  })
)
const mockEq = mock(() => ({ single: mockSingle }))
const mockSelect = mock(() => ({ eq: mockEq }))
const mockFrom = mock(() => ({ select: mockSelect }))

mock.module('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}))

// --- Import route AFTER mocking ----------------------------------------------

const { POST } = await import('./route')

// --- Helpers -----------------------------------------------------------------

function makeRequest(body?: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/brokers/broker-1/test-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : JSON.stringify({}),
  })
}

function makeParams(id = 'broker-1') {
  return { params: Promise.resolve({ id }) }
}

// --- Tests -------------------------------------------------------------------

describe('POST /api/brokers/[id]/test-webhook', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    // Reset supabase mocks to default "broker found" state
    mockSingle.mockImplementation(() =>
      Promise.resolve({
        data: { id: 'broker-1', crm_webhook_url: 'https://saved.webhook/hook' },
        error: null,
      })
    )

    // Reset global fetch to a simple 200 OK
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response('OK', { status: 200, statusText: 'OK' }))
    ) as typeof fetch
  })

  // Restore original fetch after all tests
  afterAll(() => {
    globalThis.fetch = originalFetch
  })

  // ---- 1. Uses webhook_url from request body (the bug fix) ------------------

  it('uses webhook_url from request body instead of saved url', async () => {
    const req = makeRequest({ webhook_url: 'https://override.webhook/hook' })
    const res = await POST(req, makeParams())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe(200)

    // Verify fetch was called with the override URL, not the saved one
    const fetchCalls = (globalThis.fetch as ReturnType<typeof mock>).mock.calls
    expect(fetchCalls.length).toBe(1)
    expect(fetchCalls[0][0]).toBe('https://override.webhook/hook')
  })

  // ---- 2. Falls back to broker's saved crm_webhook_url ----------------------

  it('falls back to broker crm_webhook_url when body has no webhook_url', async () => {
    const req = makeRequest({})
    const res = await POST(req, makeParams())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe(200)

    const fetchCalls = (globalThis.fetch as ReturnType<typeof mock>).mock.calls
    expect(fetchCalls[0][0]).toBe('https://saved.webhook/hook')
  })

  // ---- 3. Returns 404 when broker not found ---------------------------------

  it('returns 404 when broker not found', async () => {
    mockSingle.mockImplementation(() =>
      Promise.resolve({ data: null, error: { message: 'not found' } })
    )

    const req = makeRequest({})
    const res = await POST(req, makeParams('nonexistent'))
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toBe('Broker not found')
  })

  // ---- 4. Returns 400 when no webhook URL anywhere --------------------------

  it('returns 400 when neither body nor broker has a webhook url', async () => {
    mockSingle.mockImplementation(() =>
      Promise.resolve({
        data: { id: 'broker-1', crm_webhook_url: null },
        error: null,
      })
    )

    const req = makeRequest({})
    const res = await POST(req, makeParams())
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('No webhook URL provided')
  })

  // ---- 5. Returns 502 on network error --------------------------------------

  it('returns 502 with message on network error', async () => {
    globalThis.fetch = mock(() =>
      Promise.reject(new TypeError('fetch failed'))
    ) as typeof fetch

    const req = makeRequest({ webhook_url: 'https://bad.url/hook' })
    const res = await POST(req, makeParams())
    const json = await res.json()

    expect(res.status).toBe(502)
    expect(json.error).toBe('fetch failed')
  })

  it('returns 502 with timeout message on AbortError', async () => {
    const abortError = new DOMException('signal is aborted', 'AbortError')
    globalThis.fetch = mock(() => Promise.reject(abortError)) as typeof fetch

    const req = makeRequest({ webhook_url: 'https://slow.url/hook' })
    const res = await POST(req, makeParams())
    const json = await res.json()

    expect(res.status).toBe(502)
    expect(json.error).toBe('Request timed out after 10s')
  })

  // ---- 6. Successful response passes through status and body ----------------

  it('returns upstream status, statusText, and truncated body', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response('{"result":"created"}', {
          status: 201,
          statusText: 'Created',
        })
      )
    ) as typeof fetch

    const req = makeRequest({ webhook_url: 'https://good.webhook/hook' })
    const res = await POST(req, makeParams())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe(201)
    expect(json.statusText).toBe('Created')
    expect(json.body).toBe('{"result":"created"}')
  })
})
