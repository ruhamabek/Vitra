import type { BenchAgent, BenchSession, BenchToolContent, TokenUsage } from '../types.js';

/**
 * Configuration for the Anthropic Messages API agent.
 */
export interface AnthropicAgentOptions {
  /** API key (default: `ANTHROPIC_API_KEY`). */
  apiKey?: string;
  /** Model identifier (default: `VITRA_BENCH_MODEL` or `claude-sonnet-5-5`). */
  model?: string;
  /** Maximum model turns per task before the run is abandoned (default 25). */
  maxTurns?: number;
  /** `max_tokens` per model response (default 4096). */
  maxTokens?: number;
  /** API base URL (default: `https://api.anthropic.com`). */
  baseUrl?: string;
  /** Forward rendered PNGs from `render_viewport` to the model (default true). */
  includeImages?: boolean;
  /** Fetch implementation, injectable for tests (default: global fetch). */
  fetch?: typeof fetch;
  /**
   * Retries per request on rate limits (429), overload (529), transient
   * server errors (408, 500, 502, 503, 504), and network failures (default 4).
   */
  maxRetries?: number;
  /** Base delay for exponential backoff in milliseconds (default 1000). */
  retryBaseDelayMs?: number;
  /** Upper bound on any single backoff delay in milliseconds (default 60000). */
  retryMaxDelayMs?: number;
  /** Sleep implementation, injectable for tests (default: abortable setTimeout). */
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
}

/** HTTP statuses that are worth retrying with backoff. */
const RETRYABLE_STATUSES: ReadonlySet<number> = new Set([408, 429, 500, 502, 503, 504, 529]);

/** Default model when neither an option nor `VITRA_BENCH_MODEL` is set. */
export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-5-5';

const SYSTEM_PROMPT = [
  'You are a design engineer operating the Vitra visual runtime through its MCP tools.',
  'Complete the task using tool calls only. The user message includes a JSON description of the starting scene, including node ids and registered tokens; there is no tool to read the scene, so rely on it.',
  'Prefer insert_component for building multi-node structures in a single call, verify your result once with audit_design or render_viewport, and fix any reported issues.',
  'You are scored on correctness, accessibility audit results, visual fidelity, and tool-call efficiency: avoid redundant, failing, or later-overwritten calls.',
  'When the task is complete, reply with a short summary and no further tool calls.',
].join('\n');

/** A content block in a Messages API response. */
interface AnthropicContentBlock {
  type: string;
  id?: string;
  name?: string;
  input?: unknown;
  text?: string;
}

/** Shape of the Messages API response fields this agent reads. */
interface AnthropicResponse {
  content?: AnthropicContentBlock[];
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

/**
 * Reference agent that drives the benchmark through the Anthropic Messages
 * API tool-use loop. It uses `fetch` directly so the benchmark does
 * not take an SDK dependency.
 */
export class AnthropicAgent implements BenchAgent {
  readonly name: string;
  private readonly model: string;
  private readonly options: AnthropicAgentOptions;
  private usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

  /**
   * @param options Agent configuration; every field has a default.
   */
  constructor(options: AnthropicAgentOptions = {}) {
    this.options = options;
    this.model = options.model ?? process.env.VITRA_BENCH_MODEL ?? DEFAULT_ANTHROPIC_MODEL;
    this.name = `anthropic:${this.model}`;
  }

  /**
   * Returns token usage accumulated since the last call and resets it.
   */
  consumeUsage(): TokenUsage {
    const usage = this.usage;
    this.usage = { inputTokens: 0, outputTokens: 0 };
    return usage;
  }

  /**
   * Runs the tool-use loop until the model ends its turn.
   *
   * @throws Error when no API key is configured, a request fails after all
   *   retries, the response is truncated at `max_tokens`, the model stops for
   *   any other unexpected reason, the turn limit is reached, or the session
   *   is aborted.
   */
  async run(session: BenchSession): Promise<void> {
    const apiKey = this.options.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('AnthropicAgent requires an API key. Set ANTHROPIC_API_KEY or pass { apiKey }.');
    }
    const maxTurns = this.options.maxTurns ?? 25;
    const maxTokens = this.options.maxTokens ?? 4096;
    const includeImages = this.options.includeImages ?? true;
    const { signal } = session;

    const tools = session.tools.map((t) => ({
      name: t.name,
      description: t.description ?? '',
      input_schema: t.inputSchema,
    }));
    const messages: Array<{ role: 'user' | 'assistant'; content: unknown }> = [
      {
        role: 'user',
        content: `${session.task.prompt}\n\nScene context (JSON):\n${session.sceneContext}`,
      },
    ];

    for (let turn = 0; turn < maxTurns; turn++) {
      throwIfAborted(signal);
      const data = await this.request(
        apiKey,
        { model: this.model, max_tokens: maxTokens, system: SYSTEM_PROMPT, tools, messages },
        signal
      );
      this.usage.inputTokens += data.usage?.input_tokens ?? 0;
      this.usage.outputTokens += data.usage?.output_tokens ?? 0;

      const content = data.content ?? [];
      messages.push({ role: 'assistant', content });

      if (data.stop_reason === 'end_turn' || data.stop_reason === 'stop_sequence') {
        return;
      }
      if (data.stop_reason === 'max_tokens') {
        throw new Error(
          `Model response was truncated at max_tokens (${maxTokens}); any pending tool call is incomplete. ` +
            'Increase maxTokens or simplify the task.'
        );
      }
      const toolUses = content.filter((block) => block.type === 'tool_use');
      if (data.stop_reason !== 'tool_use' || toolUses.length === 0) {
        throw new Error(
          `Model stopped with unexpected stop_reason "${data.stop_reason ?? 'none'}" ` +
            `and ${toolUses.length} tool call(s).`
        );
      }

      const results = [];
      for (const use of toolUses) {
        throwIfAborted(signal);
        const args = use.input && typeof use.input === 'object' ? (use.input as Record<string, unknown>) : {};
        const result = await session.callTool(use.name ?? '', args);
        results.push({
          type: 'tool_result',
          tool_use_id: use.id,
          is_error: result.isError,
          content: toAnthropicContent(result.content, includeImages),
        });
      }
      messages.push({ role: 'user', content: results });
    }

    throw new Error(`Agent did not finish within ${maxTurns} turns.`);
  }

  /**
   * Sends one Messages API request, retrying retryable failures with
   * exponential backoff and jitter. A `retry-after` header, when present,
   * takes precedence over the computed delay.
   *
   * @throws Error on a non-retryable status, after the final retry, or on abort.
   */
  private async request(apiKey: string, body: Record<string, unknown>, signal: AbortSignal): Promise<AnthropicResponse> {
    const doFetch = this.options.fetch ?? globalThis.fetch;
    const sleep = this.options.sleep ?? abortableSleep;
    const baseUrl = (this.options.baseUrl ?? 'https://api.anthropic.com').replace(/\/$/, '');
    const maxRetries = this.options.maxRetries ?? 4;
    const baseDelay = this.options.retryBaseDelayMs ?? 1000;
    const maxDelay = this.options.retryMaxDelayMs ?? 60_000;

    for (let attempt = 0; ; attempt++) {
      throwIfAborted(signal);
      let failure: string;
      let retryAfterMs: number | undefined;
      try {
        const response = await doFetch(`${baseUrl}/v1/messages`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(body),
          signal,
        });
        if (response.ok) {
          return (await response.json()) as AnthropicResponse;
        }
        const text = await response.text().catch(() => '');
        failure = `Anthropic API request failed with HTTP ${response.status}: ${text.slice(0, 500)}`;
        if (!RETRYABLE_STATUSES.has(response.status)) {
          throw new Error(failure);
        }
        retryAfterMs = parseRetryAfter(response.headers.get('retry-after'));
      } catch (err: unknown) {
        if (signal.aborted) throw abortError(signal);
        if (err instanceof Error && err.message.startsWith('Anthropic API request failed')) throw err;
        failure = `Anthropic API request failed: ${err instanceof Error ? err.message : String(err)}`;
      }

      if (attempt >= maxRetries) {
        throw new Error(`${failure} (gave up after ${attempt + 1} attempt(s))`);
      }
      const backoff = Math.min(maxDelay, baseDelay * 2 ** attempt);
      const delay = retryAfterMs !== undefined ? Math.min(maxDelay, retryAfterMs) : backoff / 2 + Math.random() * (backoff / 2);
      await sleep(delay, signal);
    }
  }
}

/**
 * Parses a `retry-after` header given in seconds or as an HTTP date.
 *
 * @returns delay in milliseconds, or undefined when absent or unparseable.
 */
export function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(header);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

/**
 * Resolves after `ms` milliseconds, or rejects as soon as `signal` aborts.
 */
function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError(signal));
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(abortError(signal));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/** Throws the abort error when the session has ended. */
function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw abortError(signal);
}

/** Builds a descriptive error for an aborted session. */
function abortError(signal: AbortSignal): Error {
  const reason: unknown = signal.reason;
  return reason instanceof Error ? reason : new Error('The benchmark session was aborted.');
}

/**
 * Converts recorded tool output into Messages API `tool_result` content,
 * substituting a placeholder when the tool returned nothing.
 */
function toAnthropicContent(content: BenchToolContent[], includeImages: boolean): unknown[] {
  const blocks: unknown[] = [];
  for (const block of content) {
    if (block.type === 'text') {
      blocks.push({ type: 'text', text: block.text });
    } else if (includeImages) {
      blocks.push({ type: 'image', source: { type: 'base64', media_type: block.mimeType, data: block.data } });
    }
  }
  if (blocks.length === 0) {
    blocks.push({ type: 'text', text: '(no output)' });
  }
  return blocks;
}
