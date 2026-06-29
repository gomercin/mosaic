# Mosaic · Constellation UI Design Spec

This spec translates the latest visual mockup into implementation guidance for the Overview / Constellation view.

The current UI is close, but one important usability issue remains: **capabilities are visible, projects/experiences are too hidden**. The constellation must make both object types legible at a glance.

---

## 1. Core design decision

The constellation has two first-class object types:

```txt
Capability / skill area       = large rectangular anchor, always visible
Project / experience          = smaller circular or pill node, always visible
Relationship                  = glowing line between a project and its capabilities
```

Do not let projects collapse into anonymous dots. Visitors must quickly understand which things are projects, which things are capabilities, and how they connect.

---

## 2. Visual language

### Capability anchors

Capabilities are the larger named anchors around the map.

Shape:

- rounded rectangle
- label always visible
- count visible, for example `2 experiences`
- category-colored border/glow
- lower z-index than active project preview

Examples:

```txt
Bridge building
1 experience
```

```txt
Data observability
1 experience
```

### Project / experience nodes

Projects must be more discoverable than they are now.

Shape options:

- default: circular icon node with a short label below or beside it
- hover: expands to a compact project preview
- selected: becomes the center of the constellation or opens detail mode

Minimum information visible in overview:

```txt
icon/glyph
short title
experience type, optionally abbreviated
```

Example compact node:

```txt
[▣] Defect Dashboard
     Work Project
```

Projects can be smaller than capability anchors, but they cannot be unlabeled dots.

### Relationship lines

Relationship lines explain why a project is in a region of the graph.

Line strength:

- strong: selected/hovered path
- medium: directly related context
- weak: background context

Line color should usually come from the capability category.

---

## 3. Overview state

Goal: show the whole capability atlas without requiring interaction.

The visitor should understand within 10 seconds:

- this is a capability atlas, not a normal portfolio
- rectangles are capabilities
- smaller nodes are projects/experiences
- lines show relationships
- the center represents the person / Mosaic core

### Overview composition

```txt
           [Learning agility]
        o Butterfly Garden      o CopierciN

[Bridge building] ---- o CopierciN ---- [McGyvering]
        \                               /
         \                             /
              [ center: myDNA / Mosaic ]
         /                             \
        /                               \
[Systems thinking] -- o Defect Dashboard -- [Data observability]

             o Coaching Course ---- [Coaching]
```

### Center bubble in overview

The center should not show a random selected project by default unless the user has selected something.

Default center state:

```txt
myDNA / Mosaic
Capability Atlas
Hover a project to preview its path.
Click to open the full story.
```

This reduces confusion. The center is the identity anchor, not automatically a project card.

---

## 4. Hover project state

Goal: projects become understandable before clicking.

When hovering/focusing a project:

- project node expands or shows adjacent preview card
- connected capability anchors brighten
- connected relationship lines brighten
- unrelated nodes fade but stay visible
- center bubble switches to active project state

### Hover preview card

Preview card should be compact, not full detail.

Fields:

```txt
PREVIEW
Project title
One-line summary, clipped after 2 lines

WHEN       TYPE
2021-2022  Work Project
```

Optional:

- tiny close button for touch/tablet if using persistent preview
- `Open full story` affordance

### Center bubble during hover

```txt
[project icon]
Defect Dashboard
2021-2022
Work Project
5 capabilities connected
```

This teaches the user what they are hovering.

---

## 5. Click capability state

Goal: clicking a capability answers: **which projects demonstrate this?**

When clicking a capability anchor:

- selected capability becomes bright
- directly connected projects become bright and labeled
- directly connected edges become strong
- unrelated projects/capabilities fade
- a side mini-panel lists connected projects

### Connected projects mini-panel

This can appear near the selected capability or in the left rail.

Example:

```txt
Projects connected to
Bridge building

◇ CopierciN
  Side Project · 2010

▣ Defect Dashboard
  Work Project · 2021-2022

✦ Stakeholder Translation
  Work Practice · 2020

View all (3)
```

This solves the current confusion: projects become explicit once a skill/capability is selected.

---

## 6. Click project state / detail mode

Goal: clicking a project shifts the constellation into a project-centered detail mode while keeping context.

Two acceptable implementations:

### Option A — detail panel remains on the side

- selected project remains in constellation
- connected capabilities brighten
- right-side detail panel shows full story

### Option B — project-centered constellation

- selected project moves or visually becomes the center
- connected capabilities form a tighter orbit around it
- left panel shows project details

Option A is safer for now. Option B is cooler later.

### Project detail panel content

The detail panel should emphasize story and patterns:

```txt
Active Project
Defect Dashboard
Work Project · 2021-2022

Summary
...

What was difficult?
...

What did it strengthen?
Bridge building, Data observability, Systems thinking

What did it reveal?
I turn vague operational pain into inspectable workflows.
```

---

## 7. Filters / legend / signal modes

The UI needs a clear explanation of the visual grammar.

Recommended controls:

```txt
Filters     Legend     Help
```

These can be tabs or popovers to keep the constellation clean.

### Legend must explain object types

```txt
Capability
Large rectangular node. Always visible.

Project / Experience
Smaller circular/pill node. Real-world work, hobbies, talks, courses, experiments.

Relationship
Line showing that a project demonstrates or strengthens a capability.
```

### Signal modes

Future optional modes:

- All signals
- Strongest paths
- Latest first
- My focus
- Hide archived

Do not implement all now. Keep the structure ready.

---

## 8. Usability fixes required before more eye candy

### Make projects visible in overview

Projects should not be tiny unlabeled symbols. At minimum, show labels for:

- selected project
- hovered project
- projects connected to selected capability
- a few high-priority projects in overview

A simple rule:

```txt
Show labels for all project nodes unless there are more than 20 visible projects.
```

Later, add density rules.

### Add shape distinction

Use shape, not only color:

```txt
Capability = rectangle
Project = circle/pill
Relationship = line
```

This helps accessibility and immediate comprehension.

### Keep center meaningful

Default center should explain the atlas. Hover/selection should explain the active project.

---

## 9. Implementation guidance

Keep the current deterministic layout approach for now.

Recommended next implementation slice:

1. Update project nodes so labels are visible in overview.
2. Add hover preview card for project nodes.
3. Change center bubble default state to identity/guide text.
4. On project hover, center bubble shows project summary state.
5. On capability click, show a connected-projects mini-panel.
6. Add a simple Legend/Help popover explaining object types.
7. Keep build passing.

Avoid introducing:

- D3
- React Flow
- Framer Motion
- backend/auth/database
- a large animation system

The current goal is visual grammar and usability, not final animation.

---

## 10. Acceptance criteria

A successful implementation pass should satisfy:

- Projects are identifiable without guessing.
- Capabilities remain visible and readable.
- Hovering a project clearly explains its connected capabilities.
- Clicking a capability clearly shows related projects.
- The center bubble has distinct overview/project states.
- The legend explains capability vs project vs relationship.
- Unrelated nodes fade instead of disappearing.
- The app remains static-first and data-driven.
- `npm ci`, `npm test`, and `npm run build` pass.

---

## 11. Design mantra

> The constellation is not a beautiful background for a detail panel. It is the main explanation of how experiences become capabilities.
