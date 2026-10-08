---
name: vitra
description: >-
  AI-native design runtime and visual version control system. Use this skill to inspect,
  build, audit, render, and version UI components using the Vitra CLI, design tokens,
  and declarative design.md structural specifications.
---

# Vitra: AI-Native Visual Design Platform

Vitra is an AI-native design runtime and visual version control engine. It enables software engineering agents and designers to create, inspect, mutate, verify, and version visual design systems through a deterministic scene graph, human-readable structural specifications (`design.md`), and a comprehensive command-line interface.

---

## 1. Platform Overview & Architecture

Vitra bridges visual design and software engineering through six core capabilities:

- **Headless Design Engine**: A deterministic scene graph featuring Artboards, Frames, Text, Shapes, and Vector Icons with flexbox-based Auto Layout semantics.
- **Declarative Structural Specification (`design.md`)**: An indentation-based, human-readable markdown format that expresses complete layout hierarchies, visual styles, and responsive sizing.
- **Visual Version Control (VCS)**: An immutable, content-addressed version control system (blobs, trees, commits, branches, refs, and 3-way AST merge) purpose-built for visual scenes.
- **Sensory Rendering Engine**: Server-side rasterization to high-resolution PNG and SVG snapshots for visual inspection and verification.
- **Automated Design Auditing**: Built-in accessibility auditing for WCAG 2.1 AA/AAA contrast ratios and container boundary overflow detection.
- **Design Tokens & Code Generation**: Native support for the W3C Design Tokens Community Group specification, CSS variable extraction, multi-theme swapping, and direct compilation to production-ready React + Tailwind CSS code.

---

## 2. Agent Design & Editing Workflow

When creating, inspecting, or updating UI components in a Vitra project, follow this standard cycle:

```
1. Inspect Scene Graph    ➔  vitra inspect <dir> (or vitra spec <dir>)
2. Compose Specification  ➔  Write or edit component.md using design.md syntax
3. Atomic Ingestion       ➔  vitra apply <dir> component.md [--parent <id>]
4. Visual Verification    ➔  vitra render <dir> --node <id> --out preview.png
5. Accessibility Audit    ➔  vitra audit <dir> --strict
6. Version Control        ➔  vitra add <dir> . && vitra commit <dir> -m "..."
```

---

## 3. Structural Specification Syntax (`design.md`)

The `design.md` format represents layout hierarchies using indentation (2 spaces per level) and bracketed attribute lists `[...]`.

### Node Types & Properties

#### Frame / Artboard
```markdown
- Frame: <id> [w: <num|fill|hug>, h: <num|fill|hug>, dir: <vertical|horizontal>, gap: <num>, pad: <num>, fill: <hex>, r: <num>, stroke: <hex>, strokeWidth: <num>, align: <start|center|end|stretch>, justify: <start|center|end|space-between>]
```
- `dir`: Layout direction (`vertical` or `horizontal`). Defaults to `horizontal`.
- `w`, `h`: Width and height in pixels, or sizing keywords (`fill` to expand into parent, `hug` to shrink-wrap children).
- `gap`: Spacing between child elements in pixels.
- `pad`: Internal padding in pixels (or granular `padT`, `padR`, `padB`, `padL`).
- `fill`: Background color (hex code or token reference).
- `r`: Corner radius in pixels.
- `stroke`, `strokeWidth`: Border color and stroke weight in pixels.
- `align`: Cross-axis alignment (`start`, `center`, `end`, `stretch`).
- `justify`: Primary-axis distribution (`start`, `center`, `end`, `space-between`).

#### Text
```markdown
- Text: <id> [text: "<content>", size: <num>, weight: <400|500|600|700>, fill: <hex>, wrap: <true|false>, maxW: <num>, lineHeight: <num>]
```
- `text`: String content.
- `size`: Font size in pixels.
- `weight`: Font weight numeric value (e.g., 400 for Regular, 600 for SemiBold, 700 for Bold).
- `fill`: Font color (hex code).
- `wrap`: Boolean indicating whether text wraps to multiple lines.
- `maxW`: Maximum bounding width for wrapping text.

#### Icon
```markdown
- Icon: <id> [icon: "<name>", size: <num>, color: <hex>]
```
- `icon`: Icon name from the Lucide icon library (e.g., `heart`, `shopping-cart`, `arrow-up-right`, `bell`, `settings`, `user`).
- `size`: Bounding dimension in pixels (width and height).
- `color`: Vector stroke color (hex code).

#### Shape
```markdown
- Shape: <id> [shape: <rectangle|ellipse|divider>, w: <num>, h: <num>, fill: <hex>, r: <num>]
```
- `shape`: Geometric primitive type (`rectangle`, `ellipse`, or `divider`).
- `w`, `h`: Dimensions in pixels.
- `fill`: Fill color (hex code).
- `r`: Corner radius for rectangles.

---

### Component Examples

#### Social Card Component
```markdown
- Frame: social-card [w: 360, dir: vertical, gap: 16, pad: 20, fill: #181825, r: 16, stroke: #313244, strokeWidth: 1]
  - Frame: author-row [dir: horizontal, gap: 12, align: center]
    - Shape: avatar [shape: ellipse, w: 40, h: 40, fill: #89B4FA]
    - Frame: author-meta [dir: vertical, gap: 4]
      - Text: author-name [text: "Sarah Connor", size: 16, weight: 600, fill: #CDD6F4]
      - Text: author-handle [text: "@resistance · 2h ago", size: 13, fill: #6C7086]
  - Text: post-body [text: "The future is not set. There is no fate but what we make for ourselves.", size: 15, fill: #BAC2DE, wrap: true, maxW: 320]
  - Frame: action-bar [dir: horizontal, gap: 24, align: center]
    - Frame: like-btn [dir: horizontal, gap: 6, align: center]
      - Icon: heart-icon [icon: "heart", size: 16, color: #F38BA8]
      - Text: like-count [text: "1,248", size: 13, fill: #A6ADC8]
    - Frame: share-btn [dir: horizontal, gap: 6, align: center]
      - Icon: share-icon [icon: "arrow-up-right", size: 16, color: #89B4FA]
      - Text: share-count [text: "342", size: 13, fill: #A6ADC8]
```

#### Navigation Bar Component
```markdown
- Frame: navbar [w: 1200, h: 64, dir: horizontal, gap: 32, pad: 16, fill: #0F172A, align: center, justify: space-between]
  - Frame: nav-brand [dir: horizontal, gap: 8, align: center]
    - Shape: logo-mark [shape: rectangle, w: 28, h: 28, fill: #38BDF8, r: 6]
    - Text: brand-name [text: "Vitra Studio", size: 18, weight: 700, fill: #F8FAFC]
  - Frame: nav-links [dir: horizontal, gap: 24, align: center]
    - Text: link-features [text: "Features", size: 14, weight: 500, fill: #94A3B8]
    - Text: link-docs [text: "Documentation", size: 14, weight: 500, fill: #94A3B8]
    - Text: link-showcase [text: "Showcase", size: 14, weight: 500, fill: #94A3B8]
  - Frame: nav-actions [dir: horizontal, gap: 12, align: center]
    - Frame: btn-search [dir: horizontal, gap: 6, pad: 8, fill: #1E293B, r: 8, align: center]
      - Icon: search-icon [icon: "search", size: 14, color: #94A3B8]
      - Text: search-label [text: "Search...", size: 13, fill: #64748B]
    - Frame: btn-cta [dir: horizontal, gap: 6, pad: 10, fill: #38BDF8, r: 8, align: center]
      - Text: cta-label [text: "Get Started", size: 14, weight: 600, fill: #0F172A]
```

---

## 4. Vitra CLI Command Reference

All commands run against the `.vitra` project directory:

### Scene Mutation & Ingestion
- **`vitra apply <projectDir> <file.md|file.json> [--parent <id>]`**
  Parses declarative `design.md` or Vitra JSON AST and atomically mounts nodes under the specified parent (or root).
- **`vitra init [projectDir]`**
  Initializes a new `.vitra` project repository with empty staging index and HEAD pointer.

### Inspection & Serialization
- **`vitra inspect <projectDir>`**
  Prints project metadata, artboards, node hierarchies, child counts, and design system token status.
- **`vitra spec <projectDir> [--node <id>] [--out <file.md>]`**
  Serializes any node subtree or the full canvas into clean, human-readable `design.md` format.

### Sensory Verification & Rendering
- **`vitra render <projectDir> [--node <id>] [--out <file.png>] [--scale 2]`**
  Renders the target node into a high-resolution PNG snapshot.
- **`vitra audit <projectDir> [--strict] [--json]`**
  Performs accessibility checks including WCAG 2.1 AA/AAA text-to-background contrast ratios and container boundary overflow detection. In strict mode, exits with a non-zero status code if violations are detected.

### Design Tokens & Theming
- **`vitra tokens import <globals.css> [--out <tokens.json>]`**
  Extracts CSS custom properties and generates standardized W3C Design Tokens with dark/light theme support.
- **`vitra tokens list <projectDir>`**
  Displays registered design tokens and their active values.

### Visual Version Control (Visual Git)
- **`vitra status [projectDir]`**: Displays modified, staged, unstaged, and untracked canvas nodes.
- **`vitra add <projectDir> <nodeId... | .>`**: Stages scene changes to the staging index.
- **`vitra commit <projectDir> -m "<message>"`**: Creates an immutable, content-addressed commit snapshot.
- **`vitra log [projectDir]`**: Displays commit history and DAG traversal.
- **`vitra branch [projectDir] [-d <name>]`**: Lists, creates, or deletes named branches.
- **`vitra checkout <projectDir> [-b] <ref>`**: Switches the active branch or restores canvas state from a commit.
- **`vitra diff [projectDir] [dirA] [dirB]`**: Computes structural and property-level AST diffs between versions.
- **`vitra merge <projectDir> <branch>`**: Performs clean 3-way AST merge with automatic conflict detection and resolution.

### Code Generation & Export
- **`vitra export <projectDir> --target react-tailwind [--out <dir>]`**
  Compiles visual nodes directly into production-ready React components styled with Tailwind CSS.

---

## 5. Design System & Accessibility Guardrails

When generating or editing UI with Vitra, adhere to these guidelines:

1. **Vector Icons (Lucide Library)**:
   - Use `Icon: <id> [icon: "<name>", ...]`. Vitra bundles the complete Lucide icon library (over 2,100+ icons, e.g., `shopping-cart`, `bell`, `settings`, `arrow-up-right`, `check`, `search`, `user`).
   - Do not use emoji characters in place of vector icons.
2. **Auto Layout Discipline**:
   - Always specify layout direction (`dir`), spacing (`gap`), and padding (`pad`) on layout frames.
   - Use `align` and `justify` to control child distribution explicitly rather than relying on absolute positioning.
3. **Responsive Sizing**:
   - Use `fill` for responsive elements that should adapt to their container width or height.
   - Use `hug` for containers that should shrink-wrap their content.
4. **Text Safety & Wrapping**:
   - For labels and dynamic text longer than several words, set `wrap: true` and specify a bounding `maxW`.
5. **Accessibility & Contrast Compliance**:
   - Ensure color contrast between text and parent frame backgrounds meets WCAG AA standards (minimum 4.5:1 for normal text, 3:1 for large text).
   - Run `vitra audit --strict` to verify accessibility compliance before committing changes.
