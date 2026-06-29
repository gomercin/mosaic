# Next Codex Prompt · Constellation Usability Pass

Copy/paste this into Codex while working on the `codex-implementation` branch.

---

Continue the Mosaic implementation from the current `codex-implementation` branch.

Read these docs first:

- `docs/CODEX_HANDOFF.md`
- `docs/CONSTELLATION_FOUNDATION.md`
- `docs/CONSTELLATION_UI_DESIGN_SPEC.md`
- `docs/IMPLEMENTATION_TASKS.md`

Goal: improve the Overview / Constellation view so it is clear, usable, and closer to the mockup direction. The current problem is that capabilities are visible, but projects/experiences are too hidden. Visitors should immediately understand which nodes are capabilities, which nodes are projects, and how they connect.

Constraints:

- Keep the app static-first and JSON-driven.
- Do not add a backend, auth, database, CMS, analytics, or hosted Studio behavior.
- Do not add major dependencies yet.
- Do not introduce D3, React Flow, or Framer Motion for this pass.
- Preserve existing shared selection/filter state across Overview, Timeline, Principles, and Detail Panel.
- Keep `privateNotes` local-only and never render it in public discovery/detail components.
- Keep `npm ci`, `npm test`, and `npm run build` passing.

Implementation tasks:

1. Make project/experience nodes visible in overview.
   - Keep capability anchors as large rounded rectangles.
   - Make project/experience nodes visually distinct: circle/pill with icon/glyph.
   - Show short project labels in the overview, at least while density is low.
   - Use shape distinction, not only color: capability = rectangle, project = circle/pill, relationship = line.

2. Add a hover/focus project preview.
   - On hover/focus of a project node, show a compact preview card near the project or near the center.
   - Preview fields: title, one/two-line summary, period, type.
   - Connected capability anchors and edges should brighten.
   - Unrelated nodes should fade, not disappear.
   - Clicking still selects the project and updates the detail panel.

3. Refine the center bubble states.
   - Default overview center should be identity/helpful guide, not an arbitrary selected project.
   - Default text: Mosaic / Capability Atlas / Hover a project to preview its path / Click to open the full story.
   - Hovered/selected project state should show: project icon, title, period, type, number of connected capabilities.

4. Add selected-capability connected-projects panel.
   - When clicking a capability, show a small list of projects connected to that capability.
   - It can appear in the left rail or as a floating mini-panel near the selected capability.
   - Include project glyph, title, type, and period.
   - This solves the current confusion about which projects demonstrate a capability.

5. Add or improve Legend / Help explanation.
   - Explain capability anchor, project/experience node, and relationship line.
   - Keep it compact and not dashboard-like.
   - It can be a simple always-visible legend or a lightweight panel toggled by existing controls.

6. Keep the visual direction.
   - Dark luminous field.
   - Soft category glows.
   - Connected path brightens.
   - Unrelated signals fade.
   - Avoid random decoration that does not explain the graph.

Verification:

- Run `npm ci` if needed.
- Run `npm test`.
- Run `npm run build`.
- Summarize what changed and mention any remaining UX tradeoffs.

Acceptance criteria:

- A visitor can tell within 10 seconds that rectangles are capabilities and smaller nodes are projects/experiences.
- Hovering a project clearly previews that project and lights up its capability path.
- Clicking a capability clearly shows related projects.
- The center bubble has separate overview and project states.
- The constellation itself explains the portfolio; it is not just decoration behind a detail panel.
