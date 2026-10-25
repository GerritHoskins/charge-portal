import { TAXONOMY } from '@charge-portal/fault-taxonomy'
import { describe, expect, it } from 'vitest'
import type { ClaudeMessageParams } from '../../src/drafting/claude-client'
import { ClaudeDraftProvider, DEFAULT_DRAFT_MODEL, DRAFT_TOOL_NAME } from '../../src/drafting/claude-draft-provider'
import { DraftProviderError } from '../../src/drafting/draft-provider'
import { makeFault } from '../helpers/fault-factory'
import { answering, fakeClient, modelDraft, TOOL_NAME, toolUseResponse } from '../helpers/fake-claude-client'

const context = { recentFaults: [] }

function providerFor(client: ReturnType<typeof answering>['client'], options: { model?: string; timeoutMs?: number } = {}) {
  return new ClaudeDraftProvider(client, { model: options.model ?? DEFAULT_DRAFT_MODEL, timeoutMs: options.timeoutMs ?? 1000 })
}

async function failureOf(promise: Promise<unknown>): Promise<DraftProviderError> {
  const error = await promise.then(
    () => {
      throw new Error('expected the draft to fail')
    },
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(DraftProviderError)
  return error as DraftProviderError
}

function lastRequest(createMessage: { mock: { calls: unknown[][] } }): ClaudeMessageParams {
  return createMessage.mock.calls.at(-1)![0] as ClaudeMessageParams
}

const requestText = (params: ClaudeMessageParams) =>
  JSON.stringify(params.messages) + (typeof params.system === 'string' ? params.system : JSON.stringify(params.system))

describe('ClaudeDraftProvider: successful draft', () => {
  it('uses the default model id claude-sonnet-5-5', () => {
    expect(DEFAULT_DRAFT_MODEL).toBe('claude-sonnet-5-5')
    expect(DRAFT_TOOL_NAME).toBe(TOOL_NAME)
  })

  it('turns valid tool input into a draft attributed to claude:<model>', async () => {
    const { client } = answering(toolUseResponse(modelDraft))
    const draft = await providerFor(client).draft(makeFault(), context)
    expect(draft).toEqual({ ...modelDraft, provider: 'claude:claude-sonnet-5-5' })
  })

  it('records the configured model in provider', async () => {
    const { client } = answering(toolUseResponse(modelDraft))
    const draft = await providerFor(client, { model: 'claude-opus-4-8' }).draft(makeFault(), context)
    expect(draft.provider).toBe('claude:claude-opus-4-8')
  })

  it('does not let the model choose the provider field', async () => {
    const { client } = answering(toolUseResponse({ ...modelDraft, provider: 'rules' }))
    const draft = await providerFor(client).draft(makeFault(), context)
    expect(draft.provider).toBe('claude:claude-sonnet-5-5')
  })

  it('skips thinking and text blocks before the tool call', async () => {
    const { client } = answering({
      stop_reason: 'tool_use',
      content: [
        { type: 'thinking', thinking: '' },
        { type: 'text', text: 'Drafting now.' },
        { type: 'tool_use', id: 'toolu_1', name: TOOL_NAME, input: modelDraft },
      ],
    })
    await expect(providerFor(client).draft(makeFault(), context)).resolves.toMatchObject({ taxonomyCode: 'PWR.OVERCURRENT' })
  })
})

describe('ClaudeDraftProvider: the request', () => {
  it('offers one tool whose input_schema is generated from the draft schema, without provider', async () => {
    const { client, createMessage } = answering(toolUseResponse(modelDraft))
    await providerFor(client).draft(makeFault(), context)
    const params = lastRequest(createMessage)
    expect(params.tools).toHaveLength(1)
    const tool = params.tools![0] as { name: string; description: string; input_schema: Record<string, any> } // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(tool.name).toBe(TOOL_NAME)
    expect(tool.description.length).toBeGreaterThan(10)
    expect(tool.input_schema.type).toBe('object')
    expect(tool.input_schema.$schema).toBeUndefined()
    expect(Object.keys(tool.input_schema.properties).sort()).toEqual([
      'confidence',
      'probableCause',
      'requiresSiteVisit',
      'suggestedAction',
      'taxonomyCode',
    ])
    expect([...tool.input_schema.required].sort()).toEqual(Object.keys(tool.input_schema.properties).sort())
    expect(tool.input_schema.properties.taxonomyCode.enum).toEqual(Object.keys(TAXONOMY))
    expect(tool.input_schema.properties.confidence).toMatchObject({ type: 'number', minimum: 0, maximum: 1 })
    expect(tool.input_schema.additionalProperties).toBe(false)
  })

  it('forces the tool on models that accept a forced tool_choice', async () => {
    const { client, createMessage } = answering(toolUseResponse(modelDraft))
    await providerFor(client, { model: 'claude-opus-4-8' }).draft(makeFault(), context)
    const params = lastRequest(createMessage)
    expect(params.tool_choice).toEqual({ type: 'tool', name: TOOL_NAME })
    expect(params.output_config).toBeUndefined()
  })

  it.each(['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-fable-5-1'])(
    'uses tool_choice auto plus an explicit instruction on %s, which rejects a forced tool_choice',
    async (model) => {
      const { client, createMessage } = answering(toolUseResponse(modelDraft))
      await providerFor(client, { model }).draft(makeFault(), context)
      const params = lastRequest(createMessage)
      expect(params.tool_choice).toEqual({ type: 'auto' })
      expect(requestText(params)).toContain(TOOL_NAME)
      expect(params.output_config).toEqual({ effort: 'medium' })
    },
  )

  it('sends no thinking override, sampling parameters or prefill', async () => {
    const { client, createMessage } = answering(toolUseResponse(modelDraft))
    await providerFor(client).draft(makeFault(), context)
    const params = lastRequest(createMessage) as unknown as Record<string, unknown>
    for (const key of ['thinking', 'temperature', 'top_p', 'top_k']) expect(params[key]).toBeUndefined()
    expect(params.messages).toHaveLength(1)
    expect((params.messages as { role: string }[])[0].role).toBe('user')
  })

  it('asks for a draft for a human operator and states the catalogue rule in the system prompt', async () => {
    const { client, createMessage } = answering(toolUseResponse(modelDraft))
    await providerFor(client).draft(makeFault(), context)
    const system = lastRequest(createMessage).system as string
    expect(system).toMatch(/human operator/i)
    expect(system).toContain('taxonomyCode')
    expect(system).toMatch(/catalogue/i)
    expect(system).toMatch(/untrusted/i)
  })

  it('puts every taxonomy code and its component in the prompt', async () => {
    const { client, createMessage } = answering(toolUseResponse(modelDraft))
    await providerFor(client).draft(makeFault(), context)
    const text = requestText(lastRequest(createMessage))
    for (const [code, taxonomyClass] of Object.entries(TAXONOMY)) {
      expect(text).toContain(code)
      expect(text).toContain(taxonomyClass.component)
    }
  })

  it('puts the normalised fault, the raw vendor codes and the recent faults on the station in the prompt', async () => {
    const fault = makeFault({
      stationId: 'st-777',
      connectorId: 2,
      ocppErrorCode: 'OtherError',
      vendorId: 'voltreon',
      vendorErrorCode: 'VX-4711',
      taxonomyCode: 'PWR.MODULE_FAILURE',
      component: 'power-electronics',
      severity: 'critical',
      raw: { info: 'psu 3 dead' },
    })
    const recent = [
      fault,
      makeFault({ stationId: 'st-777', ocppErrorCode: 'ReaderFailure', vendorErrorCode: 'RD-0815', taxonomyCode: 'RFD.READER_FAILURE' }),
    ]
    const { client, createMessage } = answering(toolUseResponse(modelDraft))
    await providerFor(client).draft(fault, { recentFaults: recent })
    const text = requestText(lastRequest(createMessage))
    for (const expected of ['st-777', 'OtherError', 'voltreon', 'VX-4711', 'PWR.MODULE_FAILURE', 'psu 3 dead', 'RD-0815', 'ReaderFailure']) {
      expect(text).toContain(expected)
    }
    // The fault itself is not listed again among the recent faults.
    expect(text.split('VX-4711').length - 1).toBe(1)
  })

  it('limits the recent faults it sends', async () => {
    const many = Array.from({ length: 40 }, (_, i) => makeFault({ vendorErrorCode: `V-${String(i).padStart(3, '0')}` }))
    const { client, createMessage } = answering(toolUseResponse(modelDraft))
    await providerFor(client).draft(makeFault(), { recentFaults: many })
    const text = requestText(lastRequest(createMessage))
    expect(text).toContain('V-000')
    expect(text).not.toContain('V-039')
  })

  it('passes an abort signal and a bounded output size', async () => {
    const { client, createMessage } = answering(toolUseResponse(modelDraft))
    await providerFor(client).draft(makeFault(), context)
    const [params, options] = createMessage.mock.calls[0]
    expect((params as ClaudeMessageParams).max_tokens).toBeGreaterThanOrEqual(1024)
    expect((params as ClaudeMessageParams).max_tokens).toBeLessThanOrEqual(16000)
    expect((options as { signal: AbortSignal }).signal).toBeInstanceOf(AbortSignal)
  })
})

describe('ClaudeDraftProvider: failures carry a reason', () => {
  it('prose only: no tool call', async () => {
    const { client } = answering({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'The charger is broken, send someone.' }] })
    expect((await failureOf(providerFor(client).draft(makeFault(), context))).reason).toBe('no-tool-call')
  })

  it('a call of some other tool counts as no tool call', async () => {
    const { client } = answering({ stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'x', name: 'other_tool', input: modelDraft }] })
    expect((await failureOf(providerFor(client).draft(makeFault(), context))).reason).toBe('no-tool-call')
  })

  it('schema-invalid input, naming the fields but not the values', async () => {
    const { client } = answering(toolUseResponse({ ...modelDraft, confidence: 7, probableCause: 'LEAKY-VALUE'.repeat(400) }))
    const error = await failureOf(providerFor(client).draft(makeFault(), context))
    expect(error.reason).toBe('invalid-output')
    expect(error.detail).toContain('confidence')
    expect(error.detail).toContain('probableCause')
    expect(`${error.message} ${error.detail}`).not.toContain('LEAKY-VALUE')
  })

  it('input that is not an object', async () => {
    const { client } = answering(toolUseResponse('not an object'))
    expect((await failureOf(providerFor(client).draft(makeFault(), context))).reason).toBe('invalid-output')
  })

  it('a taxonomyCode outside TAXONOMY, without echoing it', async () => {
    const { client } = answering(toolUseResponse({ ...modelDraft, taxonomyCode: 'ZZZ.MADE_UP' }))
    const error = await failureOf(providerFor(client).draft(makeFault(), context))
    expect(error.reason).toBe('unknown-taxonomy-code')
    expect(`${error.message} ${error.detail ?? ''}`).not.toContain('ZZZ.MADE_UP')
  })

  it('a thrown error, without its message', async () => {
    const { client } = fakeClient(() => Promise.reject(new Error('connect ECONNRESET with header x-api-key: sk-ant-secret')))
    const error = await failureOf(providerFor(client).draft(makeFault(), context))
    expect(error.reason).toBe('api-error')
    expect(`${error.message} ${error.detail ?? ''}`).not.toContain('sk-ant-secret')
  })

  it('an HTTP error status is part of the reason', async () => {
    const { client } = fakeClient(() => Promise.reject(Object.assign(new Error('rate limited'), { status: 429 })))
    expect((await failureOf(providerFor(client).draft(makeFault(), context))).reason).toBe('api-error-429')
  })

  it('a timeout: aborts the request and fails after timeoutMs', async () => {
    let signal: AbortSignal | undefined
    const { client } = fakeClient((_params, s) => {
      signal = s
      return new Promise(() => {})
    })
    const started = Date.now()
    const error = await failureOf(providerFor(client, { timeoutMs: 30 }).draft(makeFault(), context))
    expect(error.reason).toBe('timeout')
    expect(Date.now() - started).toBeLessThan(1000)
    expect(signal?.aborted).toBe(true)
  })

  it('a request that fails because it was aborted is reported as a timeout', async () => {
    const { client } = fakeClient(
      (_params, signal) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Request was aborted.')))),
    )
    expect((await failureOf(providerFor(client, { timeoutMs: 20 }).draft(makeFault(), context))).reason).toBe('timeout')
  })

  it('a refusal', async () => {
    const { client } = answering({ stop_reason: 'refusal', content: [] })
    expect((await failureOf(providerFor(client).draft(makeFault(), context))).reason).toBe('refusal')
  })

  it('output cut off by max_tokens, even when a tool call is present', async () => {
    const { client } = answering(toolUseResponse(modelDraft, { stop_reason: 'max_tokens' }))
    expect((await failureOf(providerFor(client).draft(makeFault(), context))).reason).toBe('truncated')
  })
})
