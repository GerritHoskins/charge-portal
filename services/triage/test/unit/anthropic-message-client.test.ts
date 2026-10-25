import { describe, expect, it, vi } from 'vitest'
import { createAnthropicMessageClient } from '../../src/drafting/claude-client'
import { ClaudeDraftProvider } from '../../src/drafting/claude-draft-provider'
import { makeFault } from '../helpers/fault-factory'
import { modelDraft, TOOL_NAME } from '../helpers/fake-claude-client'

// The adapter around @anthropic-ai/sdk is exercised with an injected fetch, so no request leaves the process.
const messageBody = {
  id: 'msg_synthetic',
  type: 'message',
  role: 'assistant',
  model: 'claude-sonnet-5-5',
  stop_reason: 'tool_use',
  stop_sequence: null,
  content: [{ type: 'tool_use', id: 'toolu_synthetic', name: TOOL_NAME, input: modelDraft }],
  usage: { input_tokens: 10, output_tokens: 10 },
}

function fakeFetch(status = 200, body: unknown = messageBody) {
  return vi.fn((_input: unknown, _init?: unknown) =>
    Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })),
  )
}

describe('createAnthropicMessageClient', () => {
  it('sends the Messages API request the provider builds and returns the parsed message', async () => {
    const fetchMock = fakeFetch()
    const client = createAnthropicMessageClient('synthetic-key', { fetch: fetchMock as unknown as typeof fetch })
    const draft = await new ClaudeDraftProvider(client, { model: 'claude-sonnet-5-5', timeoutMs: 2000 }).draft(makeFault(), { recentFaults: [] })

    expect(draft).toEqual({ ...modelDraft, provider: 'claude:claude-sonnet-5-5' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(String(url)).toContain('/v1/messages')
    const body = JSON.parse(String(init.body))
    expect(body.model).toBe('claude-sonnet-5-5')
    expect(body.tools[0].name).toBe(TOOL_NAME)
    expect(body.tool_choice).toEqual({ type: 'auto' })
    expect(body.stream).toBeUndefined()
  })

  it('surfaces an HTTP error with its status and does not retry endlessly', async () => {
    const fetchMock = fakeFetch(400, { type: 'error', error: { type: 'invalid_request_error', message: 'nope' } })
    const client = createAnthropicMessageClient('synthetic-key', { fetch: fetchMock as unknown as typeof fetch })
    const provider = new ClaudeDraftProvider(client, { model: 'claude-sonnet-5-5', timeoutMs: 2000 })
    await expect(provider.draft(makeFault(), { recentFaults: [] })).rejects.toMatchObject({ reason: 'api-error-400' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
