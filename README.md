# Vitra CLI

> **The Universal Visual Runtime & Design Version Control Protocol**  
> AI-native visual AST, bidirectional design sync (Penpot & Figma), WCAG automated audits, and Git-for-design.

[![release](https://img.shields.io/github/v/release/ruhamabek/Vitra.svg)](https://github.com/ruhamabek/Vitra/releases)
[![license](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](https://github.com/ruhamabek/Vitra)

---

## Installation & Quick Start

### One-Line Install (macOS & Linux)
Install the standalone binary with a single command — no npm or Node required:

```bash
curl -fsSL https://ruhamabek.github.io/Vitra/install.sh | bash
```

Once installed, the `vitra` command is immediately available:

```bash
# Initialize a new design project
vitra init my-app.vitra

# Launch local visual sync server & WebSocket engine
vitra serve my-app.vitra
```

### Alternative: Build from Source
```bash
git clone https://github.com/ruhamabek/Vitra.git
cd Vitra
pnpm install
pnpm --filter @vitra/core build
```

---

## 🛠 Commands Reference

### Visual Version Control (Git for Design)
```bash
vitra status                  # Inspect working canvas modifications (staged, unstaged)
vitra add .                   # Stage all modified visual nodes
vitra commit -m "feat: hero"  # Record human or AI agent commit with intent
vitra log                     # View visual commit timeline & DAG history
vitra diff <commitA> <commitB># Visual AST tree diff
vitra branch <feature>        # Create or list branches
vitra checkout <branch>       # Switch branches or time-travel to commit
vitra merge <feature>         # 3-way visual AST merge with conflict detection
```

### Live Canvas & Platform Sync
```bash
vitra serve <dir>             # Start WebSocket live sync server (ws://localhost:9876)
vitra audit <dir> --strict    # Run automated WCAG AA contrast & layout overflow audits
vitra export <dir> -t react   # Compile visual design to clean React + Tailwind components
vitra export-penpot <dir>     # Export .vitra project → Penpot JSON format
vitra export-figma <dir>      # Export .vitra project → Figma REST API JSON format
```

---

## Ecosystem Integrations

- **Penpot Plugin**: Connect Penpot to Vitra via [`https://ruhamabek.github.io/Vitra/manifest.json`](https://ruhamabek.github.io/Vitra/manifest.json)
- **Figma Plugin**: Live bidirectional bridge in `apps/figma-plugin`
- **Canvas Web**: Browser-based interactive canvas editor in `apps/canvas-web`

---

## License

GNU Affero General Public License v3.0 (`AGPL-3.0`) © [ruhamabek](https://github.com/ruhamabek)
