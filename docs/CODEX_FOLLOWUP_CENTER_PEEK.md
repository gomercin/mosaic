# Codex Follow-up · Use Center Node as Hover Peek

Use this after the constellation single-focus/state-machine work.

---

The current interaction is much better, but the hover preview card now duplicates the central node and makes the constellation crowded. The floating card also has boundary/overlap problems.

Design refinement:

```txt
Hover = peek in center
Click = open detail drawer
```

## Goal

Remove the floating project hover preview card and use the central node as the only hover preview surface.

The constellation should have three clear responsibilities:

```txt
constellation graph = relationships
center node         = orientation / hover peek
right drawer        = full detail after click
```

Do not let the center node, floating preview, and right drawer all tell the same story at once.

---

## Required behavior

### Overview, no hover

Center node shows identity/help text:

```txt
Mosaic
Capability Atlas
Hover a project to preview its path.
Click to open the full story.
```

### Hover/focus a project while focus is overview

Do not show a floating preview card.

Instead, update the center node:

```txt
PREVIEW
Project title
Type · period
Short summary, clipped if needed
N capabilities connected
```

The graph still highlights connected capability anchors and relationship lines.

### Click a project

Open the right detail drawer as before.

Center node becomes compact orientation only:

```txt
SELECTED PROJECT
Project title
N capabilities connected
```

The full summary/story belongs in the drawer, not the center.

### Focus is project/capability/principle

Hovering other nodes may add subtle outline/path highlighting, but must not replace the pinned center state and must not open a large preview surface.

---

## Implementation tasks

1. Remove the rendered `constellation-preview-card` for project hover.
2. Remove unused `previewStyle` / `previewPlacement` logic if present.
3. Keep `hoverTarget` because it is still needed for graph highlighting.
4. Derive center content from `activeFocus` and `hoverTarget`:

```ts
const centerPreviewExperience =
  activeFocus.kind === 'overview' && hoverTarget?.kind === 'project'
    ? experienceNodes.find((experience) => experience.id === hoverTarget.id)
    : undefined;
```

5. Render center node in this priority order:

```txt
centerPreviewExperience -> hover preview state
activeFocus.project     -> compact selected-project state
activeFocus.capability  -> capability focus state
activeFocus.principle   -> principle focus state
overview                -> identity/help state
```

6. Keep graph highlight behavior unchanged.
7. Remove or leave unused CSS only if the build/lint setup permits it. Prefer removing `.constellation-preview-card` styles later in a cleanup pass if risky.

---

## Acceptance criteria

- Hovering a project previews it in the center node.
- No floating project preview card appears.
- Clicking a project still opens the detail drawer.
- The center does not duplicate the full detail drawer.
- Hovering while project/capability/principle focus is pinned does not replace the center content.
- No overlapping preview/card/drawer stack occurs.
- `npm test` and `npm run build` pass.
