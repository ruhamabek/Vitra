import { describe, it, expect } from 'vitest';
import { AnthropicAgent, parseRetryAfter, pricingCardTask, runTask } from '../src/index.js';

interface RecordedRequest {
  url: string;
  headers: Record<string, string>;
  body: {
    model: string;
    system: string;
    tools: Array<{ name: string; input_schema: Record<string, unknown> }>;
    messages: Array<{ role: string; content: unknown }>;
  };
}

function mockFetch(
  responses: Array<{ status?: number; body: unknown; headers?: Record<string, string> }>
): { fetch: typeof fetch; requests: RecordedRequest[] } {
  const requests: RecordedRequest[] = [];
  const impl = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    requests.push({
      url: String(url),
      headers: init?.headers as Record<string, string>,
      body: JSON.parse(String(init?.body)),
    });
    const next = responses.shift();
    if (!next) throw new Error('Unexpected request');
    return new Response(JSON.stringify(next.body), { status: next.status ?? 200, headers: next.headers });
  };
  return { fetch: impl as typeof fetch, requests };
}

const CARD = {
  id: 'pricing-card',
  type: 'frame',
  width: 320,
  fill: '#1E1E2E',
  layout: { direction: 'vertical', gap: 16, padding: { top: 24, right: 24, bottom: 24, left: 24 } },
  children: [{ id: 'plan', type: 'text', text: 'Pro', fill: '#FFFFFF' }],
};

describe('AnthropicAgent', () => {
  it('runs the tool-use loop through the harness and reports token usage', async () => {
    const { fetch, requests } = mockFetch([
      {
        body: {
          stop_reason: 'tool_use',
          usage: { input_tokens: 100, output_tokens: 20 },
          content: [
            { type: 'text', text: 'Building the card.' },
            { type: 'tool_use', id: 'tu_1', name: 'insert_component', input: { parentId: 'board', component: CARD } },
            { type: 'tool_use', id: 'tu_2', name: 'update_node', input: { nodeId: 'does-not-exist', patch: {} } },
          ],
        },
      },
      {
        body: {
          stop_reason: 'end_turn',
          usage: { input_tokens: 150, output_tokens: 10 },
          content: [{ type: 'text', text: 'Done.' }],
        },
      },
    ]);
    const agent = new AnthropicAgent({ apiKey: 'test-key', model: 'test-model', fetch, baseUrl: 'https://example.test/' });
    const result = await runTask(pricingCardTask, agent);

    expect(agent.name).toBe('anthropic:test-model');
    expect(result.agentError).toBeUndefined();
    expect(result.usage).toEqual({ inputTokens: 250, outputTokens: 30 });
    expect(result.calls.map((c) => c.name)).toEqual(['insert_component', 'update_node']);
    expect(result.calls[1]!.wasted).toBe('error');
    expect(result.checks.find((c) => c.id === 'card-exists')!.passed).toBe(true);

    expect(requests).toHaveLength(2);
    const first = requests[0]!;
    expect(first.url).toBe('https://example.test/v1/messages');
    expect(first.headers['x-api-key']).toBe('test-key');
    expect(first.headers['anthropic-version']).toBe('2023-06-01');
    expect(first.body.model).toBe('test-model');
    expect(first.body.tools.map((t) => t.name)).toContain('insert_component');
    expect(first.body.tools.every((t) => t.input_schema.type === 'object')).toBe(true);
    expect(String(first.body.messages[0]!.content)).toContain(pricingCardTask.prompt);
    expect(String(first.body.messages[0]!.content)).toContain('"id":"board"');

    const toolResults = requests[1]!.body.messages[2]!.content as Array<{ tool_use_id: string; is_error: boolean }>;
    expect(toolResults.map((r) => [r.tool_use_id, r.is_error])).toEqual([
      ['tu_1', false],
      ['tu_2', true],
    ]);
  });

  it('fails the run with a clear error when no API key is configured', async () => {
    const previous = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const result = await runTask(pricingCardTask, new AnthropicAgent({ model: 'm' }));
      expect(result.agentError).toMatch(/ANTHROPIC_API_KEY/);
      expect(result.score).toBe(0);
    } finally {
      if (previous !== undefined) process.env.ANTHROPIC_API_KEY = previous;
    }
  });

  it('retries rate limits and overload with backoff, honouring retry-after', async () => {
    const delays: number[] = [];
    const { fetch, requests } = mockFetch([
      { status: 429, body: { error: { type: 'rate_limit_error' } }, headers: { 'retry-after': '3' } },
      { status: 529, body: { error: { type: 'overloaded_error' } } },
      { body: { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Done.' }] } },
    ]);
    const agent = new AnthropicAgent({
      apiKey: 'k',
      model: 'm',
      fetch,
      retryBaseDelayMs: 100,
      sleep: async (ms) => {
        delays.push(ms);
      },
    });
    const result = await runTask(pricingCardTask, agent);
    expect(result.agentError).toBeUndefined();
    expect(requests).toHaveLength(3);
    expect(delays[0]).toBe(3000);
    // Second attempt: exponential backoff of 200ms with jitter in [100, 200].
    expect(delays[1]).toBeGreaterThanOrEqual(100);
    expect(delays[1]).toBeLessThanOrEqual(200);
  });

  it('gives up after the configured number of retries', async () => {
    const overloaded = { status: 529, body: { error: { type: 'overloaded_error' } } };
    const { fetch, requests } = mockFetch([overloaded, overloaded, overloaded]);
    const agent = new AnthropicAgent({ apiKey: 'k', model: 'm', fetch, maxRetries: 2, sleep: async () => undefined });
    const result = await runTask(pricingCardTask, agent);
    expect(requests).toHaveLength(3);
    expect(result.agentError).toMatch(/HTTP 529.*gave up after 3 attempt/s);
  });

  it('does not retry non-retryable errors', async () => {
    const { fetch, requests } = mockFetch([{ status: 400, body: { error: { type: 'invalid_request_error' } } }]);
    const agent = new AnthropicAgent({ apiKey: 'k', model: 'm', fetch, sleep: async () => undefined });
    const result = await runTask(pricingCardTask, agent);
    expect(requests).toHaveLength(1);
    expect(result.agentError).toMatch(/HTTP 400/);
  });

  it('reports a max_tokens truncation as an agent error instead of finishing', async () => {
    const { fetch } = mockFetch([
      {
        body: {
          stop_reason: 'max_tokens',
          content: [{ type: 'tool_use', id: 'tu', name: 'insert_component', input: { parentId: 'board' } }],
        },
      },
    ]);
    const result = await runTask(pricingCardTask, new AnthropicAgent({ apiKey: 'k', model: 'm', fetch, maxTokens: 64 }));
    expect(result.agentError).toMatch(/truncated at max_tokens \(64\)/);
    expect(result.calls).toHaveLength(0);
  });

  it('reports unexpected stop reasons as agent errors', async () => {
    const { fetch } = mockFetch([{ body: { stop_reason: 'refusal', content: [] } }]);
    const result = await runTask(pricingCardTask, new AnthropicAgent({ apiKey: 'k', model: 'm', fetch }));
    expect(result.agentError).toMatch(/unexpected stop_reason "refusal"/);
  });

  it('cancels the in-flight request when the run times out', async () => {
    let requestSignal: AbortSignal | undefined;
    const hanging = ((_url: string, init?: RequestInit) => {
      requestSignal = init?.signal ?? undefined;
      return new Promise<Response>((_, reject) => {
        requestSignal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    }) as typeof fetch;
    const result = await runTask(pricingCardTask, new AnthropicAgent({ apiKey: 'k', model: 'm', fetch: hanging }), {
      timeoutMs: 20,
    });
    expect(result.agentError).toMatch(/time limit/);
    expect(requestSignal?.aborted).toBe(true);
  });

  it('parses retry-after in seconds and as an HTTP date', () => {
    expect(parseRetryAfter('2')).toBe(2000);
    expect(parseRetryAfter(null)).toBeUndefined();
    expect(parseRetryAfter('soon')).toBeUndefined();
    const inFuture = new Date(Date.now() + 5000).toUTCString();
    expect(parseRetryAfter(inFuture)).toBeGreaterThan(3000);
  });

  it('stops after the configured number of turns', async () => {
    const loop = {
      stop_reason: 'tool_use',
      content: [{ type: 'tool_use', id: 'tu', name: 'audit_design', input: { nodeId: 'board' } }],
    };
    const { fetch } = mockFetch([{ body: loop }, { body: loop }]);
    const result = await runTask(pricingCardTask, new AnthropicAgent({ apiKey: 'k', model: 'm', fetch, maxTurns: 2 }));
    expect(result.agentError).toMatch(/within 2 turns/);
    expect(result.efficiency.totalCalls).toBe(2);
  });
});
