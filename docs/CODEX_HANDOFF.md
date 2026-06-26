# Mosaic · Codex Handoff

This document is the product, design, and implementation handoff for Mosaic.

Use it as the north star when continuing implementation with Codex or another coding agent. The main purpose is to protect the original idea from becoming a generic portfolio dashboard.

---

## 1. Product north star

Mosaic is **not** a traditional portfolio.

Mosaic is an interactive **personal capability atlas** for generalists.

It maps experiences across work, hobbies, talks, coaching, learning, creative practice, and odd constraints into a living graph of capabilities, principles, and patterns.

The visitor should not only learn **what projects happened**. They should discover **what kind of person/engineer/coach emerges from the pattern of those projects**.

### One-sentence pitch

> Mosaic turns messy life and work experiences into an interactive capability map.

### Deeper framing

Most portfolios answer:

> What did you build?

Mosaic should answer:

> What capabilities did these experiences strengthen, and what patterns do they reveal about how you think?

---

## 2. Why this exists

The initial use case is an impactful introduction during a team switch at Xebia, from **Xebia Transformation** to **Xebia Software Technologies**.

The new group values:

- generalists
- coaching-like skills
- technical breadth
- creativity
- the ability to connect disciplines
- ownership and self-made artifacts

A normal CV or portfolio undersells this. Mosaic should make generalist value visible.

This project may later become useful to other people as well, especially consultants, creative technologists, coaches, architects, and people whose value is hard to compress into job titles.

---

## 3. What Mosaic is not

Avoid drifting into these shapes:

- a resume builder
- a LinkedIn clone
- a CRUD CMS
- a generic dark SaaS dashboard
- a project card grid
- a skill badge collection
- a data admin tool
- a personal brag page

Mosaic can contain project cards, skill tags, and timelines, but those are not the product. They are lenses over a richer personal graph.

The center of gravity should stay here:

```txt
Experiences -> Capabilities -> Principles -> Revealed patterns
```

---

## 4. Current implementation state

Repository: `gomercin/mosaic`

Current deployment target:

```txt
https://gomercin.github.io/mosaic/
```

Current architecture:

- Vite
- React
- TypeScript
- static JSON data
- GitHub Actions for CI, release packaging, and GitHub Pages deployment
- no backend
- no authentication
- no database

Important files:

```txt
public/data/mosaic.sample.json
src/types.ts
src/App.tsx
src/components/CapabilityMap.tsx
src/components/TimelineView.tsx
src/components/ExperiencePanel.tsx
src/components/Studio.tsx
scripts/validate-mosaic-data.mjs
.github/workflows/ci.yml
.github/workflows/pages.yml
.github/workflows/release.yml
```

The current UI is a functional first scaffold. It should be treated as a prototype, not the final visual direction.

---

## 5. Architecture constraints

Preserve these constraints unless explicitly changed by the project owner.

### Must stay static-first

Mosaic should work as a static site generated from JSON.

Good targets:

- GitHub Pages
- Bluehost static folder
- Netlify/Vercel
- zipped `dist/` release
- iframe inside WordPress

Avoid for now:

- server backend
- user accounts
- database
- WordPress plugin architecture
- SaaS-style multi-user system

### Studio is local-first

The Studio is a local authoring tool, not a hosted CMS.

Preferred workflow:

```txt
Write messy raw story
        ↓
Studio stores rawNarrative
        ↓
LLM or prompt helper proposes structured fields
        ↓
Human reviews and edits
        ↓
Export JSON
        ↓
Build and publish static site
```

### Data is the product

The UI should render multiple views from the same data model:

- overview / constellation
- timeline
- filters
- experience detail
- principle view
- future pattern summaries
- future interview/talk generator

Do not hardcode visual-only assumptions into the data structure.

---

## 6. Data model philosophy

The model should distinguish between **skills**, **capabilities**, **tools**, and **patterns**.

### Skill/tool examples

- React
- TypeScript
- Python
- Power BI
- GitHub Actions

### Capability examples

- systems thinking
- bridge building
- stakeholder translation
- coaching
- learning agility
- McGyvering
- automation
- data observability

### Principle examples

- Bridge, don't replace
- Constraints fuel creativity
- Show the system
- Think with your hands
- Adoption beats elegance when people must actually use the thing

### Revealed pattern examples

- I connect disconnected systems.
- I turn vague operational pain into inspectable workflows.
- I often solve adoption problems by bridging existing behavior instead of replacing it.
- I learn through making small artifacts.
- I use creative practice as a thinking tool.

The most valuable layer is the pattern layer. This is where Mosaic becomes more than a skill map.

---

## 7. Suggested future data shape

Current data is intentionally simple. Future iterations should evolve toward something like this:

```json
{
  "id": "copiercin",
  "title": "CopierciN",
  "type": "Side project",
  "company": "Personal",
  "period": {
    "start": "2010",
    "end": "2012",
    "label": "2010-2012"
  },
  "visibility": "public",
  "rawNarrative": "Long messy story in the author's own words.",
  "publicNarrative": "Short story safe for public portfolio use.",
  "privateNotes": "Meaningful context that should not be published.",
  "summary": "One concise sentence.",
  "challenge": "What was awkward, blocked, unclear, or constrained?",
  "approach": "How did I think and act?",
  "impact": "What changed because of this?",
  "strengthenedCapabilities": ["bridge-building", "mcgyvering"],
  "revealedPatterns": [
    "I prefer bridging existing workflows over replacing them.",
    "I enjoy solving problems under awkward constraints."
  ],
  "tools": ["browser bookmarks", "system files"],
  "principles": ["bridge-dont-replace", "constraints-fuel-creativity"],
  "evidence": [
    {
      "label": "Public page",
      "url": "https://example.com"
    }
  ],
  "tone": ["inventive", "pragmatic", "constraint-driven"]
}
```

Keep `rawNarrative`. It is the source of truth. Polished fields are projections.

---

## 8. UX concept

The homepage should feel like asking:

> What would you like to discover?

Not:

> Here are my projects.

Suggested discovery paths:

- Explore the Capability Atlas
- Follow the timeline
- Explore by capability
- Explore principles
- Talks and coaching
- Outside of software

---

## 9. Core UI states

### Overview / constellation

Purpose: show the person as a capability graph.

Expected feel:

- organic
- luminous
- exploratory
- connected
- slightly playful, not corporate

Interaction:

- capabilities are visible as nodes
- experiences are connected to capabilities
- selecting a capability highlights related experiences
- unrelated experiences fade or blur, not disappear abruptly
- selecting an experience lights up its connected capabilities

Mental sketch:

```txt
                    Coaching
                       o

        Creativity                  AI tooling
             o                          o

                  [ Selected experience ]
                         Mosaic

       Bridge building             Automation
              o                         o

                 Systems thinking
                         o
```

### Timeline

Purpose: show evolution through time.

Expected feel:

- not a resume timeline
- more like a journey where unrelated experiences slowly form the current pattern
- timeline points should correspond to the same experience objects used in overview

Interaction:

- selected experience persists when switching views
- filtering by capability also affects timeline items
- timeline items should dim/blur rather than vanish
- the switch from timeline to constellation should eventually feel like objects rearranging, not a hard page change

Mental sketch:

```txt
2010  o  CopierciN
        |  bridge building, McGyvering, UX
        |
2024  o  TED-style talk
        |  public speaking, storytelling
        |
2026  o  Defect observability dashboard
        |  automation, data observability, systems thinking
        |
2026  o  Mosaic
           personal capability graph, UX, AI tooling
```

### Detail panel

Purpose: tell the story behind one experience.

Avoid making it feel like a Jira ticket.

Better structure:

```txt
Title
One-sentence summary

What was difficult?
How did I approach it?
What did it strengthen?
What did it reveal?
Why does this matter now?
```

The strongest field is usually not `impact`; it is `what this reveals about me`.

### Studio

Purpose: turn messy self-written stories into structured capability data.

Expected feel:

- journaling first
- form second
- encouraging, not bureaucratic
- helpful for raw thoughts that are too long

Preferred workflow:

```txt
Raw story -> proposed structure -> review -> preview -> export
```

Avoid overwhelming the user with all fields at once.

---

## 10. Aesthetic direction

The aesthetic should feel like:

- a personal constellation
- a living archive
- a capability map
- a creative systems-thinking artifact
- a polished self-made tool

It should not feel like:

- admin dashboard
- generic analytics product
- corporate intranet
- Bootstrap template
- KPI report

### Visual keywords

Use these as design anchors:

- dark luminous space
- glass-like panels
- soft neon edges
- connected particles
- constellation lines
- timeline morph
- signal emerging from noise
- mosaic tiles forming a larger picture
- subtle motion, not arcade animation

### Motion principles

Motion should communicate meaning.

Good motion:

- selected nodes glow and pull attention
- unrelated items gently fade or desaturate
- timeline points rearrange toward constellation nodes
- detail panel feels like a story unfolding

Bad motion:

- random particles everywhere
- excessive bouncing
- dashboard widgets sliding for no reason
- animation that makes reading harder

### Color direction

Current direction is dark with blue/purple glow. Keep this direction for now.

Suggested semantic color usage:

- Technical: cool blue/cyan
- Human/coaching: warm violet or rose
- Creative: amber/pink
- Engineering/system: teal/green
- Principles: soft gold/white

Do not make every tag equally loud. The selected path should be the brightest signal.

---

## 11. Important interaction metaphor

Mosaic should feel like the same data changing shape.

The most important future interaction is:

```txt
Timeline view <-> Constellation view
```

This should eventually feel fluid:

- same experience IDs
- same selected item
- same filters
- same visual objects if possible
- different layout geometry

A technical approach could use shared layout animation with Framer Motion later, but do not add the library until the current structure is ready for it.

---

## 12. Suggested implementation roadmap

### Milestone 1: Make the foundation reliable

- Keep GitHub Pages deployment green
- Keep CI green
- Add or commit a package lock eventually
- Ensure `npm test` and `npm run build` pass locally and in Actions
- Keep static hosting working with subpaths

### Milestone 2: Improve the data model

- separate capabilities from tools
- add `publicNarrative`
- add `privateNotes`
- add `revealedPatterns`
- add `strengthenedCapabilities`
- add validation for these fields
- migrate sample data carefully

### Milestone 3: Improve Studio

- make raw narrative the first-class input
- add import JSON
- add export JSON
- add validation feedback in UI
- improve generated enhancer prompt
- add a preview before adding a draft
- make the Studio feel like a writing/reflection tool, not a database form

### Milestone 4: Improve visual language

- extract design tokens
- create reusable panel/card/tag components
- improve visual hierarchy
- make selected path visually clear
- reduce generic dashboard feeling
- add capability category styling

### Milestone 5: Timeline-to-constellation transition

- persist selection across views
- preserve filters across views
- introduce smoother mode transition
- explore shared layout animation
- make objects feel like they rearrange rather than reload

### Milestone 6: Real content

- replace sample entries with real experiences
- create real capability taxonomy
- create public-safe narratives
- keep private notes local only
- make the site useful for an actual Xebia introduction

---

## 13. Coding guidance for Codex

Prefer small, reviewable changes.

Good task shape:

> Refactor the current UI toward the Mosaic design direction in `docs/CODEX_HANDOFF.md`. Preserve the static JSON architecture. Do not introduce a backend. Focus only on visual hierarchy, smoother selection states, and making overview/timeline feel like connected states.

Bad task shape:

> Make it nicer.

### Do not introduce without explicit approval

- backend server
- database
- authentication
- state management framework
- heavy visualization framework
- CMS integration
- paid API dependency
- analytics/tracking

### Useful future dependencies, but only when justified

- Framer Motion for shared layout transitions
- Zod or Valibot for schema validation
- React Flow if the constellation needs richer interaction
- D3 only if layout/math becomes genuinely necessary

Do not add these just because they are popular.

---

## 14. Acceptance criteria for the next substantial UI iteration

A good next UI iteration should satisfy these checks:

- A visitor understands within 10 seconds that this is not a normal portfolio.
- Selecting a capability clearly reveals related experiences.
- Selecting an experience clearly reveals connected capabilities and principles.
- Timeline and overview feel like two lenses over the same data.
- The detail panel tells a human story, not only a project summary.
- Studio encourages writing a raw story before filling structured fields.
- The page feels self-made, polished, and personal without looking chaotic.
- The site still builds as a static app and deploys to GitHub Pages.

---

## 15. Product owner taste notes

The owner likes:

- local-first tools
- open-source/free approaches
- technically challenging but meaningful work
- building from scratch when it creates ownership
- playful but useful artifacts
- constraint-driven engineering
- bridging existing systems instead of replacing them
- coaching, reflection, and human context
- creative links between software, music, storytelling, and systems thinking

The owner does not want:

- generic SaaS polish without soul
- overengineered infrastructure before the concept is clear
- a normal portfolio template
- a tool that hides the messy story too early

---

## 16. The sentence to protect

When in doubt, return to this:

> Mosaic is a personal capability graph with portfolio-like outputs, not a portfolio website with fancy filters.
