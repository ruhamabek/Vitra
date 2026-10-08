# Vitra

**The Universal Visual Runtime and Design Version Control Protocol**

Vitra is an open-source, AI-native visual runtime, layout engine, and spatial version control system. It introduces a formal Visual Abstract Syntax Tree (AST), a Git-compatible content-addressable object store for user interfaces, bidirectional synchronisation adapters for Figma and Penpot, and a Model Context Protocol (MCP) server enabling autonomous agents to inspect, audit, mutate, and version software interfaces with mathematical precision.

---

## Table of Contents

- [Architectural Overview](#architectural-overview)
- [Installation](#installation)
  - [Unix (macOS, Linux)](#unix-macos-linux)
  - [Windows (PowerShell)](#windows-powershell)
  - [Building from Source](#building-from-source)
- [Project Anatomy](#project-anatomy)
- [CLI Reference](#cli-reference)
  - [Project Management](#project-management)
  - [Visual Version Control](#visual-version-control)
  - [Git Plumbing](#git-plumbing)
  - [Quality & Accessibility Audits](#quality--accessibility-audits)
  - [Real-Time Sync Server & Live Canvas](#real-time-sync-server--live-canvas)
  - [Compilation & Code Generation](#compilation--code-generation)
  - [Platform Interoperability & Design Tokens](#platform-interoperability--design-tokens)
- [Model Context Protocol (MCP) Integration](#model-context-protocol-mcp-integration)
- [Monorepo Structure](#monorepo-structure)
- [Security & Licensing](#security--licensing)

---

## Architectural Overview

Traditional design tooling relies on opaque, monolithic binary files or non-deterministic proprietary document models. Vitra formalises UI layout and state into an open, deterministic runtime:

1. **Deterministic Visual AST (`@vitra/core`)**: Every element is an immutable, typed scene node with spatial layout properties, fills, strokes, typography, and constraints.
2. **Git-Compatible Visual DAG (`@vitra/core`)**: Changes are recorded in a content-addressable object database using SHA-1 hashing, zlib-compressed trees, and commit graphs. Vitra enables 3-way visual AST merges, conflict detection, branch management, and time-travel rollbacks.
3. **Cross-Platform Layout Engine (`@vitra/layout`)**: Flexbox calculation powered by Yoga Layout, supplemented by spatial bounding-box indexing for hit-testing and collision detection.
4. **Token Resolution (`@vitra/tokens`)**: Fully compliant with the W3C Design Tokens Community Group specification, allowing semantic variable cascades and instant CSS variable ingestion.
5. **Headless Visual Auditing (`@vitra/eval`)**: Automated WCAG 2.1 contrast calculations (AA/AAA threshold validation) and spatial overflow checks running entirely headless in continuous integration.
6. **Agent Protocol (`@vitra/mcp-server`)**: Native JSON-RPC interface implementing the Model Context Protocol, exposing fine-grained visual manipulation tools to LLMs without prompt overhead.

```text
+-----------------------------------------------------------------+
|                       Vitra Ecosystem                           |
+-----------------------------------------------------------------+
|  Applications & Integrations                                    |
|    apps/canvas-web       Interactive Browser Canvas             |
|    apps/penpot-plugin    Bidirectional Penpot Bridge            |
|    apps/figma-plugin     Bidirectional Figma Bridge             |
+-----------------------------------------------------------------+
|  Protocol & Interface Layer                                     |
|    packages/cli          Unified Terminal Binary (vitra)        |
|    packages/mcp-server   Model Context Protocol (MCP) Server    |
|    packages/sync         WebSocket Sync & Embedded Web Server   |
+-----------------------------------------------------------------+
|  Computation & Transformation Engines                           |
|    packages/codegen      React, Tailwind, SwiftUI, HTML, SVG    |
|    packages/eval         WCAG Contrast & Layout Overflow Audit  |
|    packages/renderer     SVG, Lucide Icons, Headless PNG Engine |
|    packages/layout       Yoga Layout & Spatial Index            |
|    packages/tokens       W3C Design Token Ingestion & Resolver  |
+-----------------------------------------------------------------+
|  Foundation Layer                                               |
|    packages/core         Visual AST, DAG, 3-Way Merge, Git Store|
+-----------------------------------------------------------------+
```

---

## Installation

### Unix (macOS, Linux)

Install the standalone binary via the automated installer:

```bash
curl -fsSL https://ruhamabek.github.io/Vitra/install.sh | bash
```

The script automatically detects your system architecture (`linux-x64`, `linux-arm64`, `darwin-x64`, `darwin-arm64`), downloads the latest release, places the executable into `~/.local/bin/vitra`, and validates execution integrity.

### Windows (PowerShell)

Install via the official PowerShell script:

```powershell
irm https://ruhamabek.github.io/Vitra/install.ps1 | iex
```

The installer configures `%LOCALAPPDATA%\Vitra\bin\vitra.exe` and registers the directory in your user `PATH`.

### Building from Source

Prerequisites:
- Node.js (version 22.0.0 or higher)
- pnpm (version 10.0.0 or higher)

```bash
git clone https://github.com/ruhamabek/Vitra.git
cd Vitra
pnpm install
pnpm --filter ...@vitra/cli build
pnpm test
```

To run the built CLI directly:

```bash
node packages/cli/dist/bin.js --help
```

---

## Project Anatomy

A Vitra design repository is encapsulated within a `.vitra` directory:

```text
my-project.vitra/
├── vitra.json         # Project manifest, schema version, and metadata
├── scene.json         # Complete Visual AST tree containing artboards and nodes
├── tokens.json        # W3C design tokens (colors, typography, spacing, elevations)
└── .history/          # Git-compatible version control directory
    ├── HEAD           # Reference pointer to current branch (e.g. ref: refs/heads/main)
    ├── index          # Staging area tracking modified node IDs and object hashes
    ├── objects/       # Content-addressable SHA-1 store (blobs, trees, commits)
    └── refs/
        ├── heads/     # Local branch pointers
        └── tags/      # Release/version tags
```

---

## CLI Reference

All interactions are driven through the `vitra` binary.

### Project Management

#### `vitra init <directory>`
Initialise a new `.vitra` project directory with standard schema files, an empty artboard, and an initial Git commit.

```bash
vitra init my-app.vitra --name "Design System" --description "Core enterprise kit"
```

#### `vitra spec [<directory>]`
Export the visual node hierarchy into a compact, human-readable declarative Markdown format (`design.md`) optimized for LLM context windows.

```bash
vitra spec my-app.vitra --out design-spec.md --node root-artboard
```

#### `vitra apply <directory> <file>`
Atomically parse and merge a declarative component specification (`.json` or `.md`) into the target artboard without replacing existing unrelated nodes.

```bash
vitra apply my-app.vitra hero-section.json --parent artboard-1
```

---

### Visual Version Control

Vitra provides Git-native version control designed specifically for visual node trees, bypassing raw line-based text diff conflicts.

#### `vitra status [<directory>]`
Display the current state of the working canvas: staged node changes, unstaged AST modifications, and untracked elements.

```bash
vitra status my-app.vitra
```

#### `vitra add [<directory>] <nodeId...>`
Stage visual nodes for commit. Use `.` to stage all modified nodes in the working canvas.

```bash
vitra add my-app.vitra button-primary nav-container
vitra add my-app.vitra .
```

#### `vitra commit <directory> -m <message>`
Record staged modifications into the visual DAG history, generating a tree object and an immutable commit object.

```bash
vitra commit my-app.vitra -m "refactor: migrate button radius to token variables"
```

#### `vitra log [<directory>]`
Traverse and print the commit DAG history starting from `HEAD`, including commit author, timestamp, hash, and parent linkages.

```bash
vitra log my-app.vitra
```

#### `vitra diff <dirA> [<dirB>]`
Compute a visual AST structural difference. When given a single directory, diffs the current working tree against `HEAD`. When given two paths or commit SHAs, diffs across historical versions.

```bash
vitra diff my-app.vitra
vitra diff my-app.vitra 4a8b1c 9f2e3d
```

#### `vitra branch [<directory>] [-d <branch>]`
List branches, create a new branch pointer at `HEAD`, or delete an existing branch.

```bash
vitra branch my-app.vitra              # List branches
vitra branch my-app.vitra feature-dark  # Create new branch
vitra branch my-app.vitra -d old-exp   # Delete branch
```

#### `vitra checkout <directory> [-b] <ref>`
Switch between visual branches or roll back the working canvas to an earlier commit state.

```bash
vitra checkout my-app.vitra -b experiment-hero
vitra checkout my-app.vitra main
```

#### `vitra merge <directory> <branch>`
Execute a 3-way visual AST merge of the target branch into the current branch using their common ancestor commit. Resolves non-overlapping structural and property changes automatically while reporting spatial conflicts.

```bash
vitra merge my-app.vitra feature-dark
```

#### `vitra restore [<directory>] <nodeId...>`
Discard unstaged edits in the working canvas, resetting nodes back to the state in `HEAD` or index.

```bash
vitra restore my-app.vitra hero-banner
```

#### `vitra reset [<directory>] <nodeId...>`
Unstage nodes from the visual staging index without modifying their values on the active canvas.

```bash
vitra reset my-app.vitra hero-banner
```

---

### Git Plumbing

For direct integration with build scripts and low-level version inspection:

#### `vitra hash-object [-w] <file>`
Compute the standard SHA-1 hash for an arbitrary file or AST segment. If `-w` is passed, writes the zlib-compressed object into `.history/objects`.

```bash
vitra hash-object -w scene.json
```

#### `vitra cat-file [<directory>] -p <sha>`
Inspect the decompressed contents of a raw object (blob, tree, or commit) directly from the storage DAG.

```bash
vitra cat-file my-app.vitra -p 7e5f9a2b
```

---

### Quality & Accessibility Audits

#### `vitra audit [<directory>]`
Run automated headless compliance audits against the visual scene. Validates:
- **WCAG 2.1 AA/AAA Contrast**: Computes relative luminance between text layers and underlying fills.
- **Layout Overflows**: Calculates geometry bounds and flags child elements extending beyond parent containers.
- **Touch Target Sizing**: Identifies interactive surfaces falling below minimum accessibility dimensions (e.g. 44x44px).

```bash
vitra audit my-app.vitra --strict
vitra audit my-app.vitra --json --node artboard-mobile
```

---

### Real-Time Sync Server & Live Canvas

#### `vitra serve <directory> [--port <port>]`
Start a local WebSocket synchronisation server and lightweight embedded web canvas. Allows simultaneous connections from AI agents, IDE extensions, Penpot plugins, and local browsers.

```bash
vitra serve my-app.vitra --port 9878 --no-open
```

#### `vitra canvas <directory> [--port <port>]`
Launch the standalone browser-based visual canvas interface connected to the active project.

```bash
vitra canvas my-app.vitra --port 9878
```

---

### Compilation & Code Generation

#### `vitra export <directory> --target <target>`
Transpile the visual AST tree into clean, production-ready code or standalone vector graphic assets.

Supported targets:
- `react`: React components utilizing Tailwind CSS utility classes.
- `swiftui`: Native Apple SwiftUI views with layout stacks and shape modifiers.
- `html`: Semantic HTML5 markup paired with scoped CSS stylesheets.
- `svg`: Vector graphic representation preserving layer grouping and styles.
- `png`: High-resolution pixel raster output rendered via headless font metrics.

```bash
vitra export my-app.vitra --target react --out ./src/components/Hero.tsx
vitra export my-app.vitra --target swiftui --out ./Views/HeroView.swift
vitra export my-app.vitra --target svg --out ./assets/hero.svg
```

---

### Platform Interoperability & Design Tokens

#### `vitra import <file|url>`
Ingest external design documents into a native `.vitra` project directory. Supports local Figma JSON exports, Penpot file exports, and live Figma URLs with personal access tokens.

```bash
vitra import ./figma-export.json --out ./imported-figma.vitra
vitra import "https://www.figma.com/design/KEY/Title" --token "$FIGMA_TOKEN" --out ./figma-live.vitra
```

#### `vitra export-figma <directory>`
Translate a Vitra project into a valid Figma REST document structure.

```bash
vitra export-figma my-app.vitra --out ./figma-payload.json
```

#### `vitra export-penpot <directory>`
Translate a Vitra project into native Penpot shape hierarchies.

```bash
vitra export-penpot my-app.vitra --out ./penpot-payload.json
```

#### `vitra tokens import <cssFile>`
Parse and extract CSS Custom Properties (`:root` variables) from a CSS stylesheet into a standard `tokens.json` schema.

```bash
vitra tokens import ./src/styles/globals.css --out my-app.vitra/tokens.json
```

#### `vitra render <directory>`
Headless command-line rendering of an artboard or specific sub-tree to an image file.

```bash
vitra render my-app.vitra --out preview.png --scale 2 --node artboard-desktop
```

---

## Model Context Protocol (MCP) Integration

Vitra includes an official MCP server package (`@vitra/mcp-server`), enabling AI coding agents (such as Claude Desktop, Cursor, and custom agent runtimes) to inspect and edit design projects using structured tool invocations.

### Registering with Claude Desktop / Cursor

Add the following definition to your agent's MCP configuration file (e.g. `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "vitra": {
      "command": "vitra",
      "args": ["serve", "./my-app.vitra", "--port", "9878", "--no-open"]
    }
  }
}
```

Or run directly via Node.js from source:

```json
{
  "mcpServers": {
    "vitra": {
      "command": "node",
      "args": ["/absolute/path/to/Vitra/packages/mcp-server/dist/index.js"]
    }
  }
}
```

### Provided MCP Tools

| Tool Name | Parameters | Description |
|:---|:---|:---|
| `spawn_artboard` | `name`, `width`, `height`, `backgroundColor` | Creates a top-level canvas artboard. |
| `create_frame` | `parentId`, `name`, `x`, `y`, `width`, `height`, `style` | Inserts a container frame with flex/layout properties. |
| `create_text` | `parentId`, `content`, `fontSize`, `fontWeight`, `color` | Creates a typographic element with font metrics. |
| `create_icon` | `parentId`, `iconName`, `size`, `color` | Inserts vector geometry from the Lucide icon library. |
| `create_shape` | `parentId`, `type` (`rectangle`, `ellipse`), `style` | Inserts geometric shapes. |
| `update_node` | `nodeId`, `properties` | Mutates existing visual or layout properties. |
| `delete_node` | `nodeId` | Removes an element and its subtree. |
| `move_node` | `nodeId`, `newParentId`, `index` | Re-parents or re-orders elements within the hierarchy. |
| `register_tokens`| `tokens` | Registers or updates W3C design tokens. |
| `audit_design` | `nodeId`, `strict` | Runs accessibility and spatial checks, returning scores. |
| `export_code` | `target` (`react`, `swiftui`, `html`, `svg`), `nodeId` | Compiles node into production code. |
| `commit_version` | `message` | Stages current AST modifications and creates a commit. |
| `get_history` | `limit` | Reads the commit history log. |
| `diff_projects` | `commitA`, `commitB` | Computes visual AST diff between commits. |

---

## Monorepo Structure

```text
Vitra/
├── apps/
│   ├── canvas-web/        Browser canvas web application
│   ├── figma-plugin/      Bidirectional Figma plugin client
│   ├── launch-video/      Programmatic video generation engine
│   └── penpot-plugin/     Bidirectional Penpot plugin client
├── packages/
│   ├── cli/               Unified command-line interface binary
│   ├── codegen/           React, SwiftUI, HTML, and SVG compilers
│   ├── core/              Visual AST specification, DAG versioning, Git storage
│   ├── eval/              WCAG contrast algorithms and layout overflow detection
│   ├── layout/            Yoga Layout flexbox implementation and spatial R-Tree
│   ├── mcp-server/        Model Context Protocol (MCP) server implementation
│   ├── renderer/          Headless SVG and PNG visual rasterizer
│   ├── sync/              Real-time WebSocket server and binary protocol
│   └── tokens/            W3C Design Token parser and resolver
├── scripts/
│   ├── install.sh         Unix installation shell script
│   └── install.ps1        Windows installation PowerShell script
└── .github/
    └── workflows/         CI test suites, release builds, and Pages deployment
```

---

## Security & Licensing

Vitra is free, open-source software licensed under the **GNU Affero General Public License v3.0** (`AGPL-3.0`).

Contributions are subject to the project's code quality standards and testing obligations. For contribution instructions, please refer to [CONTRIBUTING.md](CONTRIBUTING.md).
