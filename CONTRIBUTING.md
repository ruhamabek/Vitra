# Contributing to Vitra

Thank you for your interest in contributing to Vitra. This document outlines the technical standards, development workflow, and architectural guidelines required for all contributions.

Vitra is an open-source visual runtime and version control protocol engineered with strict requirements around determinism, memory efficiency, and mathematical precision. We hold pull requests to high technical standards.

---

## Table of Contents

- [Guiding Principles](#guiding-principles)
- [Monorepo Architecture](#monorepo-architecture)
- [Prerequisites & Environment Setup](#prerequisites--environment-setup)
- [Development Workflow](#development-workflow)
- [Code Quality & Technical Standards](#code-quality--technical-standards)
- [Testing Obligations](#testing-obligations)
- [Commit Message Format](#commit-message-format)
- [Pull Request Process](#pull-request-process)
- [Licensing](#licensing)

---

## Guiding Principles

1. **Determinism Above All**: Visual AST parsing, layout calculation, and Git object hashing must yield byte-for-byte identical results regardless of operating system, architecture, or environment.
2. **Headless First**: All core functionality (AST manipulation, layout calculations, Git versioning, contrast auditing, and code compilation) must execute headlessly in CLI and CI pipelines without requiring a DOM or browser window.
3. **Zero Native Runtime Bloat**: The public distribution binaries and packages must remain self-contained. Do not introduce unbundled heavy native dependencies into core packages unless they are lazily resolved.
4. **Professional Communication**: All documentation, terminal output, comments, and commit messages must maintain a serious, technical tone without decorative emojis or colloquialisms.

---

## Monorepo Architecture

Vitra is organized as a pnpm workspace with strict dependency layers:

```text
Packages Layer
  @vitra/core        Foundation: AST schema, SceneStore, Git DAG, 3-way visual merge
  @vitra/tokens      W3C Design Token parser, variable cascades, CSS extractor
  @vitra/layout      Yoga Layout flexbox computation, spatial bounding box R-Tree
  @vitra/eval        WCAG 2.1 AA/AAA contrast checks, layout overflow calculation
  @vitra/renderer    Headless SVG generation, Lucide icons, PNG rasterization
  @vitra/codegen     Transpilation engines: React + Tailwind, SwiftUI, HTML, SVG
  @vitra/sync        WebSocket binary/JSON-RPC sync server and OT protocol
  @vitra/mcp-server  Model Context Protocol server for AI agent integration
  @vitra/cli         Unified standalone binary and command-line runner

Applications Layer
  apps/canvas-web    Browser-based live design canvas
  apps/figma-plugin  Bidirectional synchronization plugin for Figma
  apps/penpot-plugin Bidirectional synchronization plugin for Penpot
```

### Dependency Rules

- `@vitra/core` must **never** depend on `@vitra/layout`, `@vitra/renderer`, or `@vitra/cli`.
- `@vitra/tokens` must depend only on `@vitra/core`.
- High-level packages (`@vitra/cli`, `@vitra/mcp-server`) orchestrate lower-level packages and must not contain raw visual math logic that belongs in `@vitra/core` or `@vitra/layout`.

---

## Prerequisites & Environment Setup

Contributions require:
- **Node.js**: `v22.0.0` or later
- **pnpm**: `v10.0.0` or later
- **Git**: `2.30.0` or later
- **Bun** (optional): `v1.1.0` or later (only required if cross-compiling native standalone binaries)

### Initial Setup

```bash
# 1. Clone the repository
git clone https://github.com/ruhamabek/Vitra.git
cd Vitra

# 2. Install workspace dependencies
pnpm install

# 3. Build all workspace packages
pnpm --filter ...@vitra/cli build

# 4. Verify the test suite
pnpm test
```

---

## Development Workflow

### Building Packages

To build all packages across the monorepo in topological order:

```bash
pnpm -r run build
```

To build a specific package and its upstream dependencies:

```bash
pnpm --filter ...@vitra/core build
pnpm --filter ...@vitra/cli build
```

### Running Tests

We use Vitest across all workspace packages. Every package contains a `tests/` directory:

```bash
# Run the entire test suite
pnpm test

# Run tests in a specific package
pnpm --filter @vitra/core test
pnpm --filter @vitra/cli test

# Run tests in watch mode during development
pnpm --filter @vitra/core vitest
```

### Running the CLI Locally

During development, you can invoke the CLI directly using Node.js:

```bash
node packages/cli/dist/bin.js --help
node packages/cli/dist/bin.js init ./test-project.vitra
node packages/cli/dist/bin.js status ./test-project.vitra
```

---

## Code Quality & Technical Standards

### TypeScript Standards

- TypeScript is configured with `strict: true`, `noImplicitAny: true`, and `noUncheckedIndexedAccess: true`.
- Avoid using `any`. If a value cannot be statically typed at compile time, use `unknown` accompanied by a type guard or Zod schema validation.
- All exported functions, interfaces, and classes must include clear JSDoc descriptions documenting invariants, arguments, and return types.
- Avoid side effects at module evaluation time. Lazy-load heavy dependencies where appropriate.

### Error Handling

- Avoid throwing raw strings or plain `Error` instances without context.
- Use explicit error messages specifying what failed, what was expected, and potential remediation steps.
- Avoid terminating the runtime with unhandled exceptions in library code; bubble errors up to the caller or CLI presentation boundary.

### Terminal Output & Styling

- Terminal output must remain clean, legible, and deterministic.
- Follow the project design system for CLI output: use subtle ANSI coloring (`cyan` for commands/paths, `green` for success, `yellow` for warnings, `red` for errors, `dim` for structure).
- Do not use emojis in terminal output or log messages. Use standard Unicode symbols (`✔`, `✕`, `!`, `•`, `┌`, `│`, `└`) with appropriate ASCII degradation.
- Respect the `NO_COLOR` environment variable across all terminal formatters.

---

## Testing Obligations

A contribution will not be merged without complete test coverage demonstrating correctness and preventing regressions.

1. **Unit Testing**: Every new function, AST node transformation, or layout calculation must include unit tests covering both nominal cases and edge cases (e.g. empty inputs, zero dimensions, extreme hierarchies).
2. **Deterministic Versioning Tests**: Modifications to `@vitra/core` storage or Git plumbing must verify SHA-1 hash stability, tree serialisation, and 3-way merge conflict handling.
3. **Zero Regression Policy**: The entire suite (`pnpm test`) must pass with zero warnings or failures before submitting a pull request.

---

## Commit Message Format

Commit messages must adhere to the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Allowed Types

- `feat`: A new user-facing feature or CLI command.
- `fix`: A bug fix.
- `refactor`: Code changes that neither fix a bug nor add a feature.
- `perf`: Performance improvements.
- `test`: Adding missing tests or correcting existing tests.
- `docs`: Documentation updates.
- `chore`: Changes to build processes, tooling, or dependencies.

### Examples

- `feat(layout): add spatial bounding box calculation to R-Tree index`
- `fix(cli): resolve process argv argument indexing across compiled binaries`
- `refactor(core): replace mutable scene store array with indexed node map`
- `test(eval): add test cases for WCAG AAA contrast ratio calculation`

Do not include emojis in commit subjects or bodies.

---

## Pull Request Process

1. **Create a Topic Branch**:
   ```bash
   git checkout -b feat/spatial-collision-detection
   ```
2. **Implement Changes and Verify**:
   Ensure all tests pass and TypeScript compiles cleanly:
   ```bash
   pnpm -r run build
   pnpm test
   ```
3. **Rebase on `main`**:
   Keep commit histories clean and linear:
   ```bash
   git fetch origin
   git rebase origin/main
   ```
4. **Open a Pull Request**:
   - Provide a clear summary of the problem being solved and the rationale for the implementation.
   - Reference any relevant GitHub issues.
   - Include test output or verification steps.

---

## Licensing

Vitra is distributed under the **GNU Affero General Public License v3.0** (`AGPL-3.0`).

By submitting a pull request, you confirm that your contribution is your original work and agree that it will be licensed under the terms of the GNU AGPLv3. Contributions incorporating third-party code must explicitly state the source and adhere to compatible open-source licenses.
