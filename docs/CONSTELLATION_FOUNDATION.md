# Mosaic · Constellation Foundation

This document describes the current constellation implementation and the intended next steps.

The goal of this pass is not to finish the final visual language. The goal is to create a clear foundation that looks and behaves like an actual constellation instead of a single-note visualizer.

---

## What changed

The Overview now renders three kinds of visual objects in one stage:

1. **Profile core**
   - central Mosaic / person node
   - shows the active experience when one is selected or hovered

2. **Capability anchors**
   - larger labeled nodes around the core
   - grouped by capability category
   - selectable as filters

3. **Experience nodes**
   - smaller orbiting nodes positioned near their related capabilities
   - hover/click reveals the experience story
   - connected capabilities and edges brighten

Edges are drawn between experience nodes and all their strengthened capabilities.

---

## Current files

```txt
src/components/CapabilityMap.tsx
src/constellation.css
src/main.tsx
```

`CapabilityMap.tsx` contains the deterministic layout logic for now. `constellation.css` contains the mockup-inspired styling isolated from the older base stylesheet.

---

## Interaction model

### Hover an experience

- active experience expands
- connected capability anchors brighten
- connected lines brighten
- unrelated nodes dim instead of disappearing

### Click an experience

- sets the selected experience
- updates the detail panel
- keeps the same object selected when switching views

### Click a capability

- toggles capability filter
- related experiences remain clear
- unrelated experiences fade

### Filter category in left rail

- capability families can be emphasized without removing the rest of the map
- this is intentionally local UI state, not part of the global app filter yet

---

## Layout approach

The layout is deterministic and intentionally simple.

Capabilities are placed on semantic arcs:

```txt
Creative          upper-left/top
Technical         upper-right/right
Human             lower-right
Core capability   left/lower-left
```

Experience nodes are positioned by:

1. collecting their strengthened capability IDs
2. averaging the coordinates of those capability anchors
3. blending that average back toward the center
4. adding deterministic jitter based on experience ID

This makes repeated renders stable while giving the map an organic feeling.

This is not meant to be the final graph layout algorithm. It is a stable foundation Codex can improve.

---

## Aesthetic target

The current visual target follows the uploaded mockup:

- dark luminous field
- capability clusters around a central person/core
- experience nodes orbiting between capabilities
- soft glowing edges
- hover reveals signal
- unrelated items fade but remain visible
- side rails for filters/legend

Avoid drifting back to:

- a list of cards
- a dashboard grid
- a force-directed graph with no story
- random particles that do not communicate meaning

---

## Things intentionally not added yet

- Framer Motion
- D3
- React Flow
- actual timeline-to-constellation morphing
- drag/zoom
- image/avatar upload
- persistent Studio storage

These may be useful later, but the foundation should first prove the visual grammar.

---

## Next good Codex tasks

### 1. Validate build and fix type/CSS issues

```bash
npm ci
npm test
npm run build
```

Do this before adding features.

### 2. Improve collision handling

Current experience nodes use deterministic jitter. With more real experiences, collisions will happen.

Possible next step:

- detect close experience nodes
- nudge them apart in small deterministic passes
- keep them near their capability cluster

Do not introduce D3 just for this unless the simple approach fails.

### 3. Improve selected experience card

The selected/hovered experience currently expands inline. Future iteration could show a compact floating preview card near the node, like the mockup.

Acceptance criteria:

- does not cover too many nodes
- keyboard focus still works
- detail panel remains the canonical full story

### 4. Connect principle filters visually

Principles currently affect global filtering but do not have visible anchors in the constellation.

Future options:

- show principles as faint golden orbit markers
- draw principle arcs around the capability graph
- keep principles in their own view but show active principle glow in overview

### 5. Prepare for timeline morph

The same experience IDs should become the bridge between views.

Keep these stable:

```txt
experience.id
selectedExperienceId
selectedCapabilityId
selectedPrincipleId
```

Future animation should make it feel like the same experience nodes are rearranging from a timeline into the constellation.

---

## Design guardrail

The constellation should not be merely beautiful. It should answer:

> Which experiences demonstrate which capabilities, and what pattern emerges from all of them together?

If a visual element does not support that, it is decoration and should be treated skeptically.
