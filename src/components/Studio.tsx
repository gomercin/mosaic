import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
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
  publicNarrative: string;
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
  publicNarrative: '',
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

function buildDraftExperience(draft: DraftState): Experience {
  const id = `${slugify(draft.title)}-${Date.now().toString(36)}`;
  const start = draft.start.trim();
  const end = draft.end.trim() || start;
  const periodLabel = start === end ? start : `${start}–${end}`;
  const rawNarrative = draft.rawNarrative.trim();
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
    summary: rawNarrative.slice(0, 180) || 'Draft experience awaiting refinement.',
    rawNarrative,
    publicNarrative: draft.publicNarrative.trim() || undefined,
    privateNotes: draft.privateNotes.trim() || undefined,
    challenge: 'To be refined from the raw narrative.',
    approach: 'To be refined from the raw narrative.',
    impact: 'To be refined from the raw narrative.',
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
    <section className="studio">
      <div className="studio__intro">
        <p className="eyebrow">Local Studio</p>
        <h2>Write the raw story first, then shape it into capability data.</h2>
        <p>
          This is intentionally not a CMS. It is a local JSON sculpting tool: capture, review,
          export, publish static files.
        </p>
      </div>

      <div className="studio__grid">
        <form className="studio-form" onSubmit={(event) => event.preventDefault()}>
          <section className="import-panel">
            <label>
              Import Mosaic JSON
              <input type="file" accept="application/json,.json" onChange={importJson} />
            </label>
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
          </section>

          <label>
            Title
            <input
              value={draft.title}
              onChange={(event) => updateField('title', event.target.value)}
              placeholder="e.g. Mosaic capability atlas"
            />
          </label>

          <div className="studio-form__row">
            <label>
              Type
              <input
                value={draft.type}
                onChange={(event) => updateField('type', event.target.value)}
                placeholder="Work project, hobby, talk..."
              />
            </label>
            <label>
              Company / context
              <input
                value={draft.company}
                onChange={(event) => updateField('company', event.target.value)}
                placeholder="Personal, Xebia, client..."
              />
            </label>
          </div>

          <div className="studio-form__row">
            <label>
              Start
              <input value={draft.start} onChange={(event) => updateField('start', event.target.value)} />
            </label>
            <label>
              End
              <input value={draft.end} onChange={(event) => updateField('end', event.target.value)} />
            </label>
          </div>

          <label>
            Raw story
            <textarea
              value={draft.rawNarrative}
              onChange={(event) => updateField('rawNarrative', event.target.value)}
              rows={8}
              placeholder="Tell it in your own words first. Too long is fine here."
            />
          </label>

          <label>
            Public narrative
            <textarea
              value={draft.publicNarrative}
              onChange={(event) => updateField('publicNarrative', event.target.value)}
              rows={4}
              placeholder="Optional public-safe story. Leave blank if this still needs refinement."
            />
          </label>

          <label>
            Revealed patterns
            <textarea
              value={draft.revealedPatterns}
              onChange={(event) => updateField('revealedPatterns', event.target.value)}
              rows={4}
              placeholder="One pattern per line, e.g. I turn vague pain into inspectable workflows."
            />
          </label>

          <div className="studio-form__row">
            <label>
              Tools and materials
              <textarea
                value={draft.tools}
                onChange={(event) => updateField('tools', event.target.value)}
                rows={4}
                placeholder="One per line: React, facilitation prompts, dashboard views..."
              />
            </label>
            <label>
              Tone
              <textarea
                value={draft.tone}
                onChange={(event) => updateField('tone', event.target.value)}
                rows={4}
                placeholder="One per line: pragmatic, reflective, inventive..."
              />
            </label>
          </div>

          <fieldset>
            <legend>Strengthened capabilities</legend>
            <div className="checkbox-grid">
              {data.capabilities.map((capability) => (
                <label key={capability.id}>
                  <input
                    type="checkbox"
                    value={capability.id}
                    checked={draft.strengthenedCapabilities.includes(capability.id)}
                    onChange={toggleCapability}
                  />
                  {capability.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Principles</legend>
            <div className="checkbox-grid">
              {data.principles.map((principle) => (
                <label key={principle.id}>
                  <input
                    type="checkbox"
                    value={principle.id}
                    checked={draft.principles.includes(principle.id)}
                    onChange={togglePrinciple}
                  />
                  {principle.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label>
            Private notes
            <textarea
              value={draft.privateNotes}
              onChange={(event) => updateField('privateNotes', event.target.value)}
              rows={4}
              placeholder="Local-only notes. Do not put real private notes in public deployed JSON."
            />
          </label>

          <div className="studio-form__actions">
            <button
              type="button"
              onClick={createDraftExperience}
              disabled={!draft.title.trim() || !draft.rawNarrative.trim()}
            >
              Add draft experience
            </button>
            <button type="button" className="secondary" onClick={exportAuthoringJson}>
              Export authoring JSON
            </button>
            <button type="button" className="secondary" onClick={exportPublicJson}>
              Export public JSON
            </button>
          </div>
        </form>

        <div className="studio__side">
          <section className="preview-panel">
            <p className="eyebrow">Preview</p>
            <ExperiencePanel
              data={data}
              experience={previewExperience}
              selectedCapabilityId={null}
            />
          </section>

          <aside className="prompt-panel">
            <h3>Enhancer prompt</h3>
            <p>
              For now this is copy/paste friendly. Later, this can be wired to Ollama or another LLM.
            </p>
            <textarea readOnly value={enhancerPrompt} rows={21} />
          </aside>
        </div>
      </div>
    </section>
  );
}
