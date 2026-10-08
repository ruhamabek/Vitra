# linear.app: design rules

A dark interface on a near-black neutral background where an orange accent marks the next step. Type is Inter Variable set tight at large sizes, corners are fully rounded on controls, and depth comes from soft neutral shadows.

## Principles

### Soft, neutral depth

Lift raised elements with the measured shadow (rgba(0, 0, 0, 0.2) 0px 0px 0px 1px).

_Why:_ Shadows appear on about 2% of elements; they mark what floats above the page and are never tinted.

### Big type, quiet body

Pair 72px headings with 20px body text in Inter Variable.

_Why:_ A 3.6× jump between headline and body creates strong hierarchy with few elements.

### A steady rhythm

Space everything on the 4px grid: 1, 2, 3, 4, 8, 12, 16, 20px.

_Why:_ 63% of measured spacing values fall on this grid, which is what makes the layout feel ordered.

### Rounded and approachable

Use pill shapes for buttons and chips, and 8px corners for containers.

_Why:_ Fully rounded shapes make up 43% of measured radii; they soften an otherwise structured page.

## Never

- **Never tint shadows with colour.** Every measured shadow is neutral; a coloured glow would read as a different product.
- **Never introduce a second accent colour.** Only one saturated colour (#f7bf8b) carries weight in the measured palette.
- **Never use positive letter-spacing on headings.** Large type is tightened, down to -0.022em on the biggest sizes.
- **Never square off buttons.** Measured buttons are fully rounded; square ones would break the shape language.
- **Never set button labels in all capitals.** No measured button uses uppercase text.
- **Never mix in a second display typeface.** Headings and body share Inter Variable; a second family would split the voice.

## Colour

- Dark theme: near-black neutral background (#08090a) with #0f1011 surfaces.
- Body text #f7f8f8 on the background reads at 18.7:1; secondary text uses #d0d6e0.
- Accent #f7bf8b (orange) with #08090a text on top of it.
- A light theme also exists: #ffffff background, #282a30 text; tokens.json lists both.

## Typography

- Inter Variable throughout, Berkeley Mono for code.
- Scale: display 72px, h1 64px, h2 56px, h3 48px, h4 40px, h5 38px, h6 32px.
- Weights in use: 300, 400, 510.
- Headings are tightened (-0.022em at 72px); body text keeps normal tracking.

## Shape and depth

- Radii: 2px (3%), 4px (11%), 6px (6%), 8px (14%), 9px (7%), 12px (10%), 16px (3%), pill (43%).
- Borders: 1px in #1c1d1e.
- Shadows: rgba(0, 0, 0, 0.2) 0px 0px 0px 1px | rgba(0, 0, 0, 0.2) 0px 0px 12px 0px inset | rgba(0, 0, 0, 0.25) 0px 2px 32px 0px | rgba(255, 255, 255, 0.08) 0px 0px 0px 0.5px inset | rgba(255, 255, 255, 0.05) 0px 0px 0px 1px inset.
