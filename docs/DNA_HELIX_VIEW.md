# Mosaic · DNA Helix View

This branch introduces a horizontal DNA Helix overview.

The goal is to keep the coolness of the DNA metaphor while staying usable: the DNA is not decoration, it is the main explanation of how capabilities are shaped by experiences.

---

## Product metaphor

```txt
Capabilities = DNA segments / skill strands
Experiences  = events that shaped the DNA
Connections  = evidence that an experience strengthened a capability
```

The view should answer:

> Which experiences shaped which capabilities, and what does that say about this person?

---

## Why horizontal first

Horizontal was chosen for the first implementation because it is the most usable layout:

- supports left-to-right reading
- has natural room for project nodes above and below the strand
- can later connect to the Timeline view
- works well on wide desktop screens
- easier to debug than diagonal or vertical layouts

The diagonal version is visually stronger, but it has higher label-placement and collision risk. The vertical version is likely the best mobile layout, but it needs different interaction rules.

---

## Current interaction model

The DNA view keeps the single-focus model from the constellation work.

```txt
Hover = peek / highlight
Click = persistent focus + bottom drawer
```

### Hover project

- project node brightens
- connected capability segments brighten
- relationship lines brighten
- a non-overlapping peek dock shows project summary
- no full drawer opens

### Click project

- bottom drawer opens with the full project story
- connected capability path remains highlighted
- unrelated signals fade

### Hover capability

- capability segment brightens
- connected projects brighten
- peek dock shows capability summary

### Click capability

- bottom drawer opens with connected projects
- selected capability remains highlighted

### Escape / close / background click

Returns to overview.

---

## Visual structure

The view has five layers:

1. atmospheric dark grid / soft sparks
2. SVG DNA helix strands and rungs
3. translucent capability segment bands
4. project nodes above/below the DNA strand
5. peek dock and bottom detail drawer

The detail drawer intentionally moved to the bottom for this view because right-side drawers reduce horizontal space and fight the helix layout.

---

## Implementation files

```txt
src/components/DnaHelixView.tsx
src/dna-helix.css
src/App.tsx
src/main.tsx
```

`DnaHelixView.tsx` contains deterministic layout math:

- capability segment widths are proportional to usage count
- project x-position is the average of its connected capability segment centers
- project y-position alternates above/below the helix with simple collision rows
- SVG paths draw helix strands, rungs, and relationship lines

No D3, React Flow, Three.js, or WebGL is used.

---

## Design guardrails

Keep these rules:

- The DNA should remain symbolic, not a literal biotech visualization.
- Capability labels must stay readable.
- Projects must remain visibly separate from capability segments.
- Hover previews must not overlap the main helix or compete with the full detail drawer.
- Unrelated nodes fade, not disappear.
- The detail drawer owns the full story.
- The peek dock owns temporary hover summaries.

---

## Future plan: diagonal layout

The diagonal layout is the visual north star for a more cinematic `Living DNA` mode.

Why it is desirable:

- stronger first impression
- more motion and depth
- feels less like a dashboard
- more memorable as an identity artifact

Risks:

- horizontal labels fight a diagonal object
- project cards can collide with corners
- connection lines are harder to route cleanly
- mobile gets awkward fast

Recommended implementation approach:

1. Reuse the same DNA layout data from the horizontal view.
2. Compute coordinates in horizontal space first.
3. Apply a coordinate transform to DNA/rung/segment geometry.
4. Keep labels and project cards unrotated for readability.
5. Add smarter label collision logic before exposing it as a default view.

Possible API:

```ts
type DnaOrientation = 'horizontal' | 'diagonal' | 'vertical';
```

Do not create a separate data model for diagonal DNA.

---

## Future plan: vertical mobile layout

The vertical layout should be treated as a mobile-first adaptation, not simply the horizontal view rotated 90 degrees.

Why vertical helps mobile:

- phone screens scroll vertically
- capabilities can become stacked DNA sections
- projects can attach left/right of the strand
- bottom drawer can become a sheet

Recommended mobile behavior:

```txt
Vertical DNA strand
Capability segment cards stacked along the strand
Project chips attach left/right
Tap = open bottom sheet
Hover behavior replaced by tap/press preview
```

For mobile, avoid requiring precise hover or tiny nodes.

---

## Next technical improvements

1. Add better project collision handling for dense real data.
2. Add density modes: `all`, `important`, `focused`.
3. Add capability ordering configuration in JSON.
4. Add optional experience importance / featured flag.
5. Add timeline-aware x-positioning as an alternate layout mode.
6. Add keyboard navigation between project nodes and capability segments.
7. Add snapshot tests for layout helper functions if they are extracted.

---

## Acceptance criteria for this branch

- The overview clearly looks like a horizontal DNA strand.
- Capabilities are represented as colored DNA segments.
- Segment width roughly reflects number of linked experiences.
- Projects are visible as nodes above/below the strand.
- Hovering highlights related paths and shows a non-overlapping peek dock.
- Clicking opens the bottom detail drawer.
- No new backend, database, CMS, D3, React Flow, Three.js, or WebGL.
- `npm test` and `npm run build` pass.
