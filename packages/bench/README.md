# @vitra/bench

VitraBench is an evaluation harness for agents that operate Vitra through its Model Context Protocol tools. It answers a question the rest of the toolchain cannot: given the same brief and the same starting scene, how well and how economically does an agent produce the requested interface?

## How a run works

For every task the harness:

1. Builds an isolated in-memory scene from the task fixture and registers its design tokens.
2. Starts an in-process Vitra MCP server (`createVitraServer`) over a linked in-memory transport.
3. Hands the agent a `BenchSession`: the task prompt, the advertised tool list, a compact JSON description of the starting scene, and a `callTool` function.
4. Records every tool call with a scene snapshot before and after it.
5. Scores the final scene once the agent returns, throws, or exceeds its time limit.

Partial progress is always scored, so an agent that crashes halfway is still measured on what it built. When a run ends, for any reason including a timeout, `session.signal` is aborted and further tool calls are refused. A lingering agent therefore cannot change the scene being scored or keep spending model tokens.

## Scoring

Each task produces four sub-scores in the range 0-100.

| Sub-score | Weight | Definition |
|:---|:---:|:---|
| Functional | 0.40 | Weighted goal-check credit multiplied by weighted guard-check credit |
| Audit | 0.20 | `auditDesign` score of the task's target node (0 if the node is missing) |
| Visual | 0.25 | `100 * SSIM * sqrt(sizeRatio)` between the agent's render and the reference render |
| Efficiency | 0.15 | `50 * min(1, budget / calls) + 50 * (1 - wasted / calls)` |

The composite is:

```text
qualityGate = goalCompletion * guardCredit
score = 0.40 * functional + qualityGate * (0.20 * audit + 0.25 * visual + 0.15 * efficiency)
```

`goalCompletion` and `guardCredit` are the weighted goal- and guard-check credit in [0, 1]. Gating the quality sub-scores on both means an agent cannot collect audit, visual, or efficiency credit for a scene it never changed (an idle agent scores 0 on every task), or for one where it met the goals by breaking something it was told to leave alone.

Weights are resolved in three layers, each overriding the previous one and re-normalised to sum to 1: the defaults above, then `BenchTask.weights`, then `RunOptions.weights`. Tasks use their own weights when a sub-score carries no signal. For example, the `tokenize-colors` reference renders identically to its fixture, so that task uses `functional 0.65, audit 0.05, visual 0.1, efficiency 0.2`.

### Checks

Each task defines deterministic checks over the final scene:

- **Goal checks** measure whether the requested change was made. They may award partial `credit`; for example `tokenize-colors` credits the fraction of colors migrated.
- **Guard checks** measure that nothing else was broken, such as an untouched source artboard or an unchanged node hierarchy. They multiply the functional score but cannot earn credit on their own.

### Visual similarity

The target node is rendered through the production pipeline (`computeLayout` and `renderToPng`), decoded with a dependency-free PNG decoder, and resampled to the reference size. It is then compared using mean SSIM over 8x8 windows (Wang et al., 2004), computed separately on the R, G and B planes and averaged. Working per channel keeps the metric colour-sensitive: pure red against a gray of equal luma scores about 0.18, not 1.0, so a wrong brand colour is not a perfect match. Transparent pixels are composited over white, and zero-area renders score 0.

Resampling hides size differences, so the score is multiplied by the square root of a per-dimension size ratio, `min(w)/max(w) * min(h)/max(h)`. Unlike an area ratio, this penalises transposed or stretched renders: 400x200 against 200x400 gives 0.25, not 1.

Each task's reference is rendered once per process and cached.

SSIM is the default `ImageSimilarityMetric`. A perceptual metric such as CLIP embedding cosine similarity can be supplied through `RunOptions.visualMetric` without adding a model dependency to this package.

### Tool-call efficiency

Every call is classified after the run:

| Classification | Meaning |
|:---|:---|
| `error` | The tool returned an error result |
| `no-op` | A mutating tool succeeded but changed nothing |
| `superseded` | Every property the call edited was edited again later (overwritten, reverted, or the node was deleted) |

Edits are tracked at property granularity (`<nodeId>.<prop>`, `<nodeId>#exists`, `<nodeId>#parent`), so creating a node and then styling it is not waste, but setting the same fill twice is. Token edits come from diffing `TokenRegistry.snapshot()` before and after each call (`tokens:<scope>.<path>`, `tokens#theme`), so re-registering identical values is reported as a no-op. Read-only calls such as `audit_design` and `render_viewport` are never waste, but they do count against the call budget, which includes one verification call.

Calls are executed one at a time in arrival order, so edits are attributed correctly even when an agent issues tool calls concurrently.

## Built-in tasks

| Id | Category | Brief |
|:---|:---|:---|
| `pricing-card` | compose | Build a pricing card with plan, price, three features, and a CTA button |
| `responsive-mobile` | responsive | Adapt a three-column desktop section to a single-column 375px artboard |
| `tokenize-colors` | tokens | Replace hardcoded hex colors with matching token references, leaving untokenized colors literal |

Each task ships a reference tool-call script. The `oracle` agent replays these scripts and must score 100 on every task; the test suite enforces this as a self-check on the harness.

## Usage

### CLI

```bash
vitra bench --list
vitra bench --verbose
ANTHROPIC_API_KEY=... vitra bench --agent anthropic --model <model-id> --out bench.json
vitra bench --agent anthropic --task pricing-card --task tokenize-colors --min-score 80
vitra bench --agent anthropic --runs 5          # mean and standard deviation per task
```

| Option | Description |
|:---|:---|
| `--agent <oracle\|anthropic>` | Agent to evaluate (default `oracle`) |
| `--task <id>` | Run only this task; repeatable |
| `--model <id>` | Model for the `anthropic` agent (default `VITRA_BENCH_MODEL`, then the package default) |
| `--max-turns <n>` | Model turns per task before the run is abandoned (default 25, minimum 1) |
| `--timeout <ms>` | Per-task time limit |
| `--runs <n>` | Repetitions per task; the report shows per-task mean and sample standard deviation (default 1) |
| `--out <file>` | Write the full JSON result, including the call log |
| `--json` | Print the JSON result instead of the report |
| `--verbose` | Include the per-call log in the report |
| `--min-score <n>` | Exit with code 1 when the suite score is below `n` |

### Programmatic

```ts
import { BUILTIN_TASKS, runSuite, type BenchAgent } from '@vitra/bench';

const agent: BenchAgent = {
  name: 'my-agent',
  async run(session) {
    // session.task.prompt, session.sceneContext, session.tools, session.signal
    await session.callTool('insert_component', { parentId: 'board', component: { /* ... */ } });
  },
};

const result = await runSuite([...BUILTIN_TASKS], agent, { timeoutMs: 120_000, runs: 3 });
console.log(result.score, result.scoreStd, result.summaries);
```

Agents that report model usage can implement `consumeUsage()` to have input and output token counts recorded per task. `ScriptedAgent` replays fixed tool-call scripts and is useful for regression baselines or for replaying transcripts captured from other agent runtimes.

### Anthropic agent

`AnthropicAgent` runs a Messages API tool-use loop using `fetch` directly, so the package takes no SDK dependency. It forwards `render_viewport` images to the model by default (`includeImages: false` disables this).

- **Retries:** requests are retried on 408, 429, 500, 502, 503, 504 and 529, and on network failures, with exponential backoff and jitter. A `retry-after` header is honoured. Configure with `maxRetries` (default 4), `retryBaseDelayMs` and `retryMaxDelayMs`.
- **Unexpected stops:** a response that stops at `max_tokens`, or with any stop reason other than `end_turn`, `stop_sequence` or `tool_use`, fails the run with a descriptive `agentError` rather than being treated as finished.
- **Abort:** the session's abort signal is passed to `fetch` and checked before every turn and tool call, so a timeout cancels in-flight requests.

## Adding a task

A task is a `BenchTask` object:

- `fixture`: declarative node trees (and optional tokens) for the starting scene.
- `reference`: the full expected scene, rendered at `targetNodeId` as visual ground truth.
- `checks`: goal and guard checks over the final scene.
- `callBudget`: tool calls a competent agent needs, including one verification call.
- `weights` (optional): task-specific composite weights for sub-scores that carry no signal on this task.

Add a reference solution to `REFERENCE_SOLUTIONS` and register the task in `BUILTIN_TASKS`; the oracle test will then verify the task is solvable at 100.
