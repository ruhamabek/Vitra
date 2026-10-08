# Vitra CLI (`vitra-cli`)

> **The Universal Visual Runtime & Design Version Control Protocol**  
> AI-native visual AST, bidirectional design sync (Penpot & Figma), WCAG automated audits, and Git-for-design.

[![npm version](https://img.shields.io/npm/v/vitra-cli.svg)](https://www.npmjs.com/package/vitra-cli)
[![license](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](https://github.com/ruhamabek/Vitra)

---

## Quick Start

You can run `vitra` immediately without installing using `npx`:

```bash
# Initialize a new design repository
npx vitra-cli init my-app.vitra

# Launch the local visual sync server & WebSocket engine
npx vitra-cli serve my-app.vitra
```

Or install it globally to get the `vitra` command:

```bash
npm install -g vitra-cli

# Now run 'vitra' anywhere
vitra init my-app.vitra
vitra serve my-app.vitra
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
