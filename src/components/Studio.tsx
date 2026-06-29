import { useMemo, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { ExperiencePanel } from './ExperiencePanel';
import type { Experience, MosaicData } from '../types';
import { slugify } from '../utils/mosaic';
import { validateMosaicData } from '../utils/validateMosaicData';

type StudioProps = {
  data: MosaicData;
  onExperienceAdded: (experience: Experience) => void;
  onDataImported: (data: MosaicData) => void;
};

type DraftState = {
  title: string;
  type: string;
  company: string;
  start: string;
  end: string;
  rawNarrative: string;
  summary: string;
  publicNarrative: string;
  challenge: string;
  approach: string;
  impact: string;
  privateNotes: string;
  strengthenedCapabilities: string[];
  revealedPatterns: string;
  tools: string;
  principles: string[];
  tone: string;
};

const initialDraft: DraftState = {
  title: '',
  type: 'Draft experience',
  company: '',
  start: new Date().getFullYear().toString(),
  end: new Date().getFullYear().toString(),
  rawNarrative: '',
  summary: '',
  publicNarrative: '',
  challenge: '',
  approach: '',
  impact: '',
  privateNotes: '',
  strengthenedCapabilities: [],
  revealedPatterns: '',
  tools: '',
  principles: [],
  tone: ''
};

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function firstUsefulText(...values: string[]): string {
  return values.map((value) => value.trim()).find(Boolean) ?? '';
}

function buildDraftExperience(draft: DraftState): Experience {
  const id = `${slugify(draft.title)}-${Date.now().toString(36)}`;
  const start = draft.start.trim();
  const end = draft.end.trim() || start;
  const periodLabel = start === end ? start : `${start}–${end}`;
  const rawNarrative = draft.rawNarrative.trim();
  const summary = firstUsefulText(draft.summary, draft.publicNarrative, rawNarrative.slice(0, 180));
  const revealedPatterns = splitLines(draft.revealedPatterns);

  return {
    id,
    title: draft.title.trim(),
    type: draft.type.trim() || 'Draft experience',
    company: draft.company.trim() || undefined,
    period: {
      start,
      end,
      label: periodLabel
    },
    summary: summary || 'Draft experience awaiting refinement.',
    rawNarrative,
    publicNarrative: draft.publicNarrative.trim() || undefined,
    privateNotes: draft.privateNotes.trim() || undefined,
    challenge: draft.challenge.trim() || 'To be refined from the raw narrative.',
    approach: draft.approach.trim() || 'To be refined from the raw narrative.',
    impact: draft.impact.trim() || 'To be refined from the raw narrative.',
    strengthenedCapabilities: draft.strengthenedCapabilities,
    revealedPatterns: revealedPatterns.length > 0
      ? revealedPatterns
      : ['To be refined from the raw narrative.'],
    tools: splitLines(draft.tools),
    principles: draft.principles,
    tone: splitLines(draft.tone),
    visibility: 'draft'
  };
}

function downloadJson(data: MosaicData, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toPublicMosaicData(data: MosaicData): MosaicData {
  return {
    ...data,
    experiences: data.experiences
      .filter((experience) => experience.visibility === 'public')
      .map(({ privateNotes: _privateNotes, rawNarrative, publicNarrative, summary, ...experience }) => ({
        ...experience,
        summary,
        rawNarrative: publicNarrative ?? summary ?? rawNarrative,
        publicNarrative,
        visibility: 'public'
      }))
  };
}

function AiBadge() {
  return (
    <span className="ai-candidate-badge" title="Good candidate for AI extraction/refinement">
      <span aria-hidden="true">🤖</span>
      AI candidate
    </span>
  );
}

type FieldLabelProps = {
  label: string;
  hint?: string;
  ai?: boolean;
  children: ReactNode;
};

function FieldLabel({ label, hint, ai = false, children }: FieldLabelProps) {
  return (
    <label className={`studio-field ${ai ? 'studio-field--ai' : ''}`}>
      <span className="studio-field__topline">
        <span className="studio-field__name">{label}</span>
        {ai && <AiBadge />}
      </span>
      {hint && <span className="studio-field__hint">{hint}</span>}
      {children}
    </label>
  );
}

type CheckboxSectionProps = {
  title: string;
  hint: string;
  ai?: boolean;
  children: ReactNode;
};

function CheckboxSection({ title, hint, ai = false, children }: CheckboxSectionProps) {
  return (
    <fieldset className={`studio-choice-section ${ai ? 'studio-choice-section--ai' : ''}`}>
      <legend>
        <span>{title}</span>
        {ai && <AiBadge />}
      </legend>
      <p>{hint}</p>
      <div className="checkbox-grid">{children}</div>
    </fieldset>
  );
}

export function Studio({ data, onExperienceAdded, onDataImported }: StudioProps) {
  const [draft, setDraft] = useState<DraftState>(initialDraft);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const enhancerPrompt = useMemo(() => {
    if (!draft.rawNarrative.trim()) {
      return 'Paste a raw story first. Mosaic will generate an enhancer prompt here.';
    }

    return [
      'Transform this raw story into a Mosaic experience object.',
      '',
      'Context:',
      '- Fields marked as AI candidates should be proposed from the raw narrative.',
      '- Human-owned fields such as title, period, type, company/context, and privateNotes can be preserved or lightly normalized.',
      '',
      'Rules:',
      '- Keep the user\'s voice, but make it concise and portfolio-safe.',
      '- Extract summary, publicNarrative, challenge, approach, impact, strengthenedCapabilities, tools, principles, revealedPatterns, and tone.',
      '- Do not invent facts that are not implied by the story.',
      '- Prefer capabilities over tool names when the lesson is transferable.',
      '- Keep privateNotes empty unless the user clearly marks content as private/local-only.',
      '- Return JSON only for one Mosaic experience object.',
      '',
      'Required shape:',
      '{',
      '  "title": "Short title",',
      '  "type": "Work project | Side project | Talk / facilitation | Creative / hobby | ...",',
      '  "company": "Optional context",',
      '  "period": { "start": "YYYY", "end": "YYYY", "label": "YYYY-YYYY" },',
      '  "visibility": "draft",',
      '  "rawNarrative": "Original source story",',
      '  "publicNarrative": "Portfolio-safe narrative",',
      '  "privateNotes": "",',
      '  "summary": "One concise sentence",',
      '  "challenge": "What was difficult?",',
      '  "approach": "How did I approach it?",',
      '  "impact": "Why does this matter now?",',
      '  "strengthenedCapabilities": ["capability-id"],',
      '  "revealedPatterns": ["I ..."],',
      '  "tools": ["tool or material"],',
      '  "principles": ["principle-id"],',
      '  "tone": ["tone-word"]',
      '}',
      '',
      'Available capability IDs:',
      data.capabilities.map((capability) => `- ${capability.id}: ${capability.label}`).join('\n'),
      '',
      'Available principle IDs:',
      data.principles.map((principle) => `- ${principle.id}: ${principle.label}`).join('\n'),
      '',
      'Raw story:',
      draft.rawNarrative
    ].join('\n');
  }, [data.capabilities, data.principles, draft.rawNarrative]);

  const previewExperience = useMemo(() => {
    if (!draft.title.trim() || !draft.rawNarrative.trim()) {
      return null;
    }

    return buildDraftExperience(draft);
  }, [draft]);
  const hasSource = draft.title.trim().length > 0 && draft.rawNarrative.trim().length > 0;
  const hasAiCandidate =
    draft.summary.trim().length > 0 ||
    draft.publicNarrative.trim().length > 0 ||
    draft.challenge.trim().length > 0 ||
    draft.approach.trim().length > 0 ||
    draft.impact.trim().length > 0 ||
    draft.strengthenedCapabilities.length > 0 ||
    draft.principles.length > 0 ||
    draft.revealedPatterns.trim().length > 0;

  function updateField<K extends keyof DraftState>(field: K, value: DraftState[K]) {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }));
  }

  function toggleCapability(event: ChangeEvent<HTMLInputElement>) {
    const capabilityId = event.target.value;
    setDraft((currentDraft) => ({
      ...currentDraft,
      strengthenedCapabilities: event.target.checked
        ? [...currentDraft.strengthenedCapabilities, capabilityId]
        : currentDraft.strengthenedCapabilities.filter(
            (existingCapabilityId) => existingCapabilityId !== capabilityId
          )
    }));
  }

  function togglePrinciple(event: ChangeEvent<HTMLInputElement>) {
    const principleId = event.target.value;
    setDraft((currentDraft) => ({
      ...currentDraft,
      principles: event.target.checked
        ? [...currentDraft.principles, principleId]
        : currentDraft.principles.filter((existingPrincipleId) => existingPrincipleId !== principleId)
    }));
  }

  function createDraftExperience() {
    if (!draft.title.trim() || !draft.rawNarrative.trim()) {
      return;
    }

    onExperienceAdded(buildDraftExperience(draft));
    setDraft(initialDraft);
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setImportErrors([]);
    setImportMessage(null);

    try {
      const parsedData = JSON.parse(await file.text()) as unknown;
      const errors = validateMosaicData(parsedData);

      if (errors.length > 0) {
        setImportErrors(errors);
        return;
      }

      onDataImported(parsedData as MosaicData);
      setImportMessage(`Imported ${file.name}`);
    } catch (error) {
      setImportErrors([
        error instanceof Error ? error.message : 'Could not parse the selected JSON file.'
      ]);
    }
  }

  function exportAuthoringJson() {
    downloadJson(data, 'mosaic-authoring.json');
  }

  function exportPublicJson() {
    downloadJson(toPublicMosaicData(data), 'mosaic.public.json');
  }

  return (
    <section className="studio studio--composer">
      <div className="studio__intro studio-composer__intro">
        <div>
          <p className="eyebrow">Local Studio</p>
          <h2>Capture the story first. Let AI help shape the signal.</h2>
          <p>
            Fill the source fields yourself, then use the robot-marked fields as AI output candidates.
            Review everything before adding it to the atlas.
          </p>
        </div>
        <div className="studio-progress" aria-label="Studio progress">
          <span className={hasSource ? 'is-complete' : ''}>1 Source</span>
          <span className={hasAiCandidate ? 'is-complete' : ''}>2 AI candidates</span>
          <span className={previewExperience ? 'is-complete' : ''}>3 Review</span>
        </div>
      </div>

      <div className="studio__grid studio-composer__grid">
        <form className="studio-form studio-form--experience" onSubmit={(event) => event.preventDefault()}>
          <section className="studio-step studio-step--source">
            <header>
              <span>1</span>
              <div>
                <p className="studio-step__mode">You fill this</p>
                <h3>Source material</h3>
                <p>These fields anchor the experience. The raw story is intentionally allowed to be long and messy.</p>
              </div>
            </header>

            <div className="studio-form__row studio-form__row--title">
              <FieldLabel label="Title" hint="A short working name. You can refine it later.">
                <input
                  value={draft.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  placeholder="e.g. Mosaic capability atlas"
                />
              </FieldLabel>
              <FieldLabel label="Type" hint="Work project, side project, talk, hobby, learning, coaching...">
                <input
                  value={draft.type}
                  onChange={(event) => updateField('type', event.target.value)}
                  placeholder="Work project, hobby, talk..."
                />
              </FieldLabel>
            </div>

            <div className="studio-form__row studio-form__row--meta">
              <FieldLabel label="Company / context" hint="Where this happened or why it matters.">
                <input
                  value={draft.company}
                  onChange={(event) => updateField('company', event.target.value)}
                  placeholder="Personal, Xebia, Philips, client..."
                />
              </FieldLabel>
              <div className="studio-form__row studio-form__row--dates">
                <FieldLabel label="Start">
                  <input value={draft.start} onChange={(event) => updateField('start', event.target.value)} />
                </FieldLabel>
                <FieldLabel label="End">
                  <input value={draft.end} onChange={(event) => updateField('end', event.target.value)} />
                </FieldLabel>
              </div>
            </div>

            <FieldLabel
              label="Raw story"
              hint="Write in your own words. This is the source of truth that AI can extract from."
            >
              <textarea
                value={draft.rawNarrative}
                onChange={(event) => updateField('rawNarrative', event.target.value)}
                rows={10}
                placeholder="What happened? Why did it matter? What was awkward, funny, difficult, or revealing? Too long is fine here."
              />
            </FieldLabel>

            <FieldLabel
              label="Private notes"
              hint="Local-only context. These are preserved in authoring JSON but stripped from public export."
            >
              <textarea
                value={draft.privateNotes}
                onChange={(event) => updateField('privateNotes', event.target.value)}
                rows={4}
                placeholder="Optional private context, reminders, or things you do not want to publish."
              />
            </FieldLabel>
          </section>

          <section className="studio-step studio-step--ai">
            <header>
              <span>2</span>
              <div>
                <p className="studio-step__mode studio-step__mode--ai"><AiBadge /></p>
                <h3>AI output candidates</h3>
                <p>These fields can be proposed from the raw story. Treat them as suggestions, not truth.</p>
              </div>
            </header>

            <div className="studio-ai-note">
              <span aria-hidden="true">🤖</span>
              <p>Robot-marked fields are good candidates for ChatGPT, Codex, or a local LLM to draft from your raw story.</p>
            </div>

            <FieldLabel label="Summary" ai hint="One concise sentence used on cards and previews.">
              <input
                value={draft.summary}
                onChange={(event) => updateField('summary', event.target.value)}
                placeholder="A concise public-facing one-liner for this experience."
              />
            </FieldLabel>

            <FieldLabel label="Public narrative" ai hint="Short portfolio-safe version. No private/internal details.">
              <textarea
                value={draft.publicNarrative}
                onChange={(event) => updateField('publicNarrative', event.target.value)}
                rows={4}
                placeholder="A polished version of the story that is safe to publish."
              />
            </FieldLabel>

            <div className="studio-form__row studio-form__row--story-parts">
              <FieldLabel label="Challenge" ai hint="What was difficult, vague, constrained, or blocked?">
                <textarea
                  value={draft.challenge}
                  onChange={(event) => updateField('challenge', event.target.value)}
                  rows={4}
                  placeholder="What made this experience non-trivial?"
                />
              </FieldLabel>
              <FieldLabel label="Approach" ai hint="How did you think, act, connect, build, or coach?">
                <textarea
                  value={draft.approach}
                  onChange={(event) => updateField('approach', event.target.value)}
                  rows={4}
                  placeholder="What did you do that reveals your way of working?"
                />
              </FieldLabel>
            </div>

            <FieldLabel label="Impact / why it matters now" ai hint="Not just business impact; also what this says about you.">
              <textarea
                value={draft.impact}
                onChange={(event) => updateField('impact', event.target.value)}
                rows={4}
                placeholder="What changed, what did it enable, or why is this still relevant?"
              />
            </FieldLabel>

            <FieldLabel label="Revealed patterns" ai hint="One per line. These are often the most interesting part of Mosaic.">
              <textarea
                value={draft.revealedPatterns}
                onChange={(event) => updateField('revealedPatterns', event.target.value)}
                rows={5}
                placeholder="I turn vague operational pain into inspectable workflows.\nI connect disconnected systems instead of replacing them."
              />
            </FieldLabel>

            <div className="studio-form__row studio-form__row--lists">
              <FieldLabel label="Tools and materials" ai hint="Concrete tools, media, methods, or materials. One per line.">
                <textarea
                  value={draft.tools}
                  onChange={(event) => updateField('tools', event.target.value)}
                  rows={4}
                  placeholder="React\nPower BI\nfacilitation prompts\nclarinet practice loops"
                />
              </FieldLabel>
              <FieldLabel label="Tone" ai hint="How this experience should feel. One word/phrase per line.">
                <textarea
                  value={draft.tone}
                  onChange={(event) => updateField('tone', event.target.value)}
                  rows={4}
                  placeholder="pragmatic\nreflective\ninventive\nconstraint-driven"
                />
              </FieldLabel>
            </div>

            <CheckboxSection
              title="Strengthened capabilities"
              hint="Select the capabilities this experience demonstrates. AI can propose, you approve."
              ai
            >
              {data.capabilities.map((capability) => (
                <label key={capability.id}>
                  <input
                    type="checkbox"
                    value={capability.id}
                    checked={draft.strengthenedCapabilities.includes(capability.id)}
                    onChange={toggleCapability}
                  />
                  <span>{capability.label}</span>
                </label>
              ))}
            </CheckboxSection>

            <CheckboxSection
              title="Principles this points to"
              hint="Select principles revealed by the experience. AI can suggest, you decide."
              ai
            >
              {data.principles.map((principle) => (
                <label key={principle.id}>
                  <input
                    type="checkbox"
                    value={principle.id}
                    checked={draft.principles.includes(principle.id)}
                    onChange={togglePrinciple}
                  />
                  <span>{principle.label}</span>
                </label>
              ))}
            </CheckboxSection>
          </section>

          <section className="studio-step studio-step--review">
            <header>
              <span>3</span>
              <div>
                <p className="studio-step__mode">Review</p>
                <h3>Add draft to atlas</h3>
                <p>The entry stays local/in-memory until you export JSON and publish it.</p>
              </div>
            </header>

            <div className="studio-form__actions">
              <button
                type="button"
                onClick={createDraftExperience}
                disabled={!draft.title.trim() || !draft.rawNarrative.trim()}
              >
                Add draft experience
              </button>
            </div>
          </section>
        </form>

        <div className="studio__side studio-composer__side">
          <section className="studio-side-card import-panel">
            <p className="eyebrow">Data in / out</p>
            <FieldLabel label="Import Mosaic JSON" hint="Load an authoring or sample JSON file.">
              <input type="file" accept="application/json,.json" onChange={importJson} />
            </FieldLabel>
            {importMessage && <p className="studio-message">{importMessage}</p>}
            {importErrors.length > 0 && (
              <div className="validation-panel" role="alert">
                <strong>Import validation failed</strong>
                <ul>
                  {importErrors.slice(0, 8).map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
                {importErrors.length > 8 && <p>{importErrors.length - 8} more issues…</p>}
              </div>
            )}
            <div className="studio-form__actions studio-form__actions--stacked">
              <button type="button" className="secondary" onClick={exportAuthoringJson}>
                Export authoring JSON
              </button>
              <button type="button" className="secondary" onClick={exportPublicJson}>
                Export public JSON
              </button>
            </div>
          </section>

          <section className="preview-panel">
            <p className="eyebrow">Live preview</p>
            <ExperiencePanel
              data={data}
              experience={previewExperience}
              selectedCapabilityId={null}
            />
          </section>

          <aside className="prompt-panel prompt-panel--studio">
            <h3><span aria-hidden="true">🤖</span> Enhancer prompt</h3>
            <p>
              Copy this into ChatGPT or a local LLM after writing the raw story. Paste the result back into the robot-marked fields.
            </p>
            <textarea readOnly value={enhancerPrompt} rows={21} />
          </aside>
        </div>
      </div>
    </section>
  );
}
