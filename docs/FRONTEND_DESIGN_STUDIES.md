# Frontend design studies

Two working alternatives explore a distinctive first impression for a generalist engineering portfolio. They live in a separate Vite entry and do not replace the existing application or change its approved public projection.

Monograph uses paper, ink, expressive serif typography, asymmetric composition and an interactive illustrated exhibit. Studio uses a dark engineering workspace, a tactile object and an explicit reveal of the mechanism. Both offer direct Explore, For your team, Technical profile and For sales routes. These are alternative presentations of the same selected accounts, not separate claims about the person.

## Open the examples

```sh
npm ci
npm run dev:designs
```

Open `http://127.0.0.1:5186/designs.html?design=monograph` or change `design` to `studio`. The committed content is explicitly fictional. `view=client`, `view=technical` and `view=sales` open the audience presentations directly. Case links, browser Back, direct reload, exhibit interactions and the design switch work. Studio's sales view stores selected example IDs in the `shortlist` query parameter and can copy an introduction with personal contribution, reported outcome and scope.

## Local experience preview

Real experience text remains in ignored local files. Provide a local selection with identity, short headline, introduction, strengths, selected experience IDs, dated technology context and any necessary editorial overrides. Each selection needs a material limit, supplied either explicitly or by the existing editorial account. The projection reads the existing local semantic atlas; it does not modify interviews, source accounts or review ledgers. Input digests are retained with the generated local profile.

```sh
npm run design:profile -- /absolute/local/atlas.json /absolute/local/selection.json
npm run dev:designs:private
```

Then add `dataset=private` to either example URL. The endpoint requires explicit enabling, loopback host and peer address, same-origin requests and GET. It sends no-store headers. Raw private paths are denied. Vite's exact installed environment module is the sole narrowly identified exception when its managed installation has a sensitive-looking ancestor name. Production builds cannot load the real profile. They show fictional content or an explicit unavailable message for a private URL. Neither an example nor a local selection confers publication approval.

## Validation

```sh
npm test
npm run build
npm run build:designs
npm run preview:designs
```

The regular build and its existing publication audit remain unchanged. The separate design build audits its output allowlist and private markers; when the local profile exists it also checks that its name and substantial account text are absent from built assets. No real profile is bundled. There are no remote fonts, analytics, external image requests or new dependencies.

## Review from each audience's perspective

This is an expert inspection and implementation review, not research with external clients or a complete accessibility audit.

| Reader | Task | Assessment |
| --- | --- | --- |
| Prospective client | Understand the person, identify a relevant situation and inspect an actual contribution | The opening gives identity, purpose and a substantial visual exhibit. The client route ties situations to contributions and reported changes. Monograph is the calmer introduction; Studio makes technical investigation more tangible. |
| Technical reader | Check a familiar technology and establish how it was used | The technical route shows dated context and related accounts. Personal implementation, collaborative integration and assessment remain distinct. No score or undated proficiency is inferred. |
| Sales colleague | Introduce the person for a particular opportunity | Monograph supplies a concise introduction and selected examples. Studio supports a shortlist that survives sharing/reload and a copyable introduction. Scope and adverse outcomes stay attached. |
| Mobile visitor | Recognize the person, see the exhibit, navigate without a canvas | Both layouts recompose into ordinary vertical reading. Secondary context is reduced to bring the exhibit forward. The audience navigation stays visible and works without hover. |

The review resulted in larger reading text, shorter first-screen composition, a concise contribution summary, persistent sales selections, visual-specific reconstruction labels and earlier mobile exhibits. Raw review history is not placed in the opening. The device, structural and practice illustrations are explicitly schematic and do not count as evidence of the original artifacts or measured performance.

The intended next decision is which visual direction to develop. Current tradeoffs: the type-led headline relies on its adjacent introduction for meaning; the examples use illustrations rather than original project imagery or a portrait; the technical inventory is deliberately selected rather than exhaustive; contact information and current availability are not invented. Client/sales interviews should test whether the resulting impression translates into a relevant conversation.

Local verification on 26 October 2026 passed 100 tests, TypeScript, the regular build/publication audit and the separate design build/audit. The existing local corpus scan found no matches across 13,483 redacted probes. Browser inspection covered desktop and 390px/320px layouts, all four audience routes in each design, exhibit changes, contribution details, Escape/focus restoration, technical links, sales selection reload and copying an introduction. The 320px checks found no horizontal overflow or reading elements outside the viewport. Runtime probes rejected cross-origin requests, non-GET requests and raw private paths. The compiled preview explicitly refused a private-profile URL. These local runs used Node 26; the repository targets Node 22, which remains the hosted CI environment.
