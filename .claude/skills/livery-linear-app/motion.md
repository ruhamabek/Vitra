# Motion and Interactions

Considered transitions, with signature motion that carries the personality: shimmer, float, hard blink.

- Default to 100ms transitions (58% of measured ones).
- Ease with cubic-bezier(0.25, 0.46, 0.45, 0.94).
- Animate color, filter, transform, background; avoid animating layout.
- Stagger repeated items: entrance starts each one 2ms after the last.
- Looping motion is slow and steady (several seconds per cycle), never frantic.
- Turn every loop and decorative animation off under prefers-reduced-motion, as the site does.

## Signature motion

The animations that make this site feel like itself. Recreate the behaviour with your own elements and content; the keyframes are the measured reference.

### Shimmer

A highlight sweeps across every 2s. It runs on its own, on list items.

```css
@keyframes -VOcTG_agentBorderSweep { 0% { background-position-x: 0px; background-position-y: 50%; } 100% { background-position-x: 120px; background-position-y: 50%; } }
.-VOcTGagentBorderSweep { animation: -VOcTG_agentBorderSweep 2000ms ease infinite; }
```

### Float

Drifts gently up and down every 2.4s. It runs on its own, on blocks, text.

```css
@keyframes sx-45fvhf-B { 0%, 100% { transform: translateX(0px); } 75%, 99.999% { transform: translateX(100%); } }
.sx-45fvhf-B { animation: sx-45fvhf-B 2400ms linear infinite; }
```

### Hard blink

Switches hard on and off every 1.6s, no fade (cursors and carets). It runs on its own, on SVG shapes.

```css
@keyframes grid-dot-0-0-pong { 0% { opacity: 0.3; } 12.5% { opacity: 0.3; } 12.5% { opacity: 0.3; } 25% { opacity: 0.3; } 25% { opacity: 0.3; } 37.5% { opacity: 0.3; } 37.5% { opacity: 0.3; } 50% { opacity: 0.3; } 50% { opacity: 1; } 62.5% { opacity: 1; } 62.5% { opacity: 1; } 75% { opacity: 1; } 75% { opacity: 1; } 87.5% { opacity: 1; } 87.5% { opacity: 0.3; } 100% { opacity: 0.3; } }
.grid-dot-0-0-pong { animation: grid-dot-0-0-pong 1600ms steps(1) infinite; }
```

### Entrance

Arrives with a fade and scale over 420ms with cubic-bezier(0.25, 0.46, 0.45, 0.94), staggered 2ms apart. It runs on its own, on SVG shapes.

```css
@keyframes fFDhtq_dotIn { 0% { opacity: 0; transform: scale(0.4); animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94); } 100% { opacity: 1; transform: scale(1); animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94); } }
.fFDhtqdotIn { animation: fFDhtq_dotIn 420ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both; /* + 2ms delay per item */ }
```

## Interactions

- **Hover** changes background colour (33% of hover rules), text colour (25% of hover rules), background (19% of hover rules), opacity (19% of hover rules), position or scale (10% of hover rules), filter (8% of hover rules). Things rarely move on hover; they change colour.
- **Illustrations** are line art: thin strokes that stay thin at any size (vector-effect: non-scaling-stroke) on flat fills. Highlight a part by brightening its stroke, not by adding colour.

## Measurements

- Durations: 100ms (58%), 160ms (31%), 700ms (5%), 400ms (4%), 200ms (3%)
- Easings: `cubic-bezier(0.25, 0.46, 0.45, 0.94)`, `ease`, `cubic-bezier(0.32, 0.72, 0, 1)`, `ease-out`
- Animated properties: color, filter, transform, background, background-color, stroke, border, box-shadow

The site turns its motion off under `prefers-reduced-motion: reduce`. Do the same: every looping or decorative animation stops, and state changes happen instantly.
