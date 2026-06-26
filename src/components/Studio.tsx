import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { Experience, MosaicData } from '../types';
import { slugify } from '../utils/mosaic';

type StudioProps = {
  data: MosaicData;
  onExperienceAdded: (experience: Experience) => void;
};

type DraftState = {
  title: string;
  type: string;
  company: string;
  start: string;
  end: string;
  rawNarrative: string;
  skills: string[];
};

const initialDraft: DraftState = {
  title: '',
  type: 'Draft experience',
  company: '',
  start: new Date().getFullYear().toString(),
  end: new Date().getFullYear().toString(),
  rawNarrative: '',
  skills: []
};

export function Studio({ data, onExperienceAdded }: StudioProps) {
  const [draft, setDraft] = useState<DraftState>(initialDraft);

  const enhancerPrompt = useMemo(() => {
    if (!draft.rawNarrative.trim()) {
      return 'Paste a raw story first. Mosaic will generate an enhancer prompt here.';
    }

    return [
      'Transform this raw story into a Mosaic experience object.',
      '',
      'Rules:',
      '- Keep the user\'s voice, but make it concise and portfolio-safe.',
      '- Extract summary, challenge, approach, impact, skills, and principles.',
      '- Do not invent facts that are not implied by the story.',
      '- Prefer capabilities over tool names when the lesson is transferable.',
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

  function updateField<K extends keyof DraftState>(field: K, value: DraftState[K]) {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }));
  }

  function toggleSkill(event: ChangeEvent<HTMLInputElement>) {
    const skillId = event.target.value;
    setDraft((currentDraft) => ({
      ...currentDraft,
      skills: event.target.checked
        ? [...currentDraft.skills, skillId]
        : currentDraft.skills.filter((existingSkillId) => existingSkillId !== skillId)
    }));
  }

  function createDraftExperience() {
    if (!draft.title.trim()) {
      return;
    }

    const id = `${slugify(draft.title)}-${Date.now().toString(36)}`;
    const periodLabel = draft.start === draft.end ? draft.start : `${draft.start}–${draft.end}`;
    const rawNarrative = draft.rawNarrative.trim();

    const experience: Experience = {
      id,
      title: draft.title.trim(),
      type: draft.type.trim() || 'Draft experience',
      company: draft.company.trim() || undefined,
      period: {
        start: draft.start.trim(),
        end: draft.end.trim() || draft.start.trim(),
        label: periodLabel
      },
      summary: rawNarrative.slice(0, 180) || 'Draft experience awaiting refinement.',
      rawNarrative,
      challenge: 'To be refined from the raw narrative.',
      approach: 'To be refined from the raw narrative.',
      impact: 'To be refined from the raw narrative.',
      skills: draft.skills,
      principles: [],
      visibility: 'draft'
    };

    onExperienceAdded(experience);
    setDraft(initialDraft);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mosaic.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="studio">
      <div className="studio__intro">
        <p className="eyebrow">Local Studio</p>
        <h2>Capture messy stories, then refine them into capability data.</h2>
        <p>
          This is intentionally not a CMS. It is a local JSON sculpting tool: capture, review,
          export, publish static files.
        </p>
      </div>

      <div className="studio__grid">
        <form className="studio-form" onSubmit={(event) => event.preventDefault()}>
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

          <fieldset>
            <legend>Initial capability tags</legend>
            <div className="checkbox-grid">
              {data.capabilities.map((capability) => (
                <label key={capability.id}>
                  <input
                    type="checkbox"
                    value={capability.id}
                    checked={draft.skills.includes(capability.id)}
                    onChange={toggleSkill}
                  />
                  {capability.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="studio-form__actions">
            <button type="button" onClick={createDraftExperience} disabled={!draft.title.trim()}>
              Add draft experience
            </button>
            <button type="button" className="secondary" onClick={exportJson}>
              Export JSON
            </button>
          </div>
        </form>

        <aside className="prompt-panel">
          <h3>Enhancer prompt</h3>
          <p>
            For now this is copy/paste friendly. Later, this can be wired to Ollama or another LLM.
          </p>
          <textarea readOnly value={enhancerPrompt} rows={21} />
        </aside>
      </div>
    </section>
  );
}
