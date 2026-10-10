import type { ActiveFocus, MosaicData } from '../types';
import { getExperienceCapabilityIds } from '../utils/mosaic';

type Props = {
  data: MosaicData;
  activeFocus: ActiveFocus;
  onFocusChange: (focus: ActiveFocus) => void;
};

// The same evidence and selection state, with a reading order for narrow screens.
export function CapabilityReadingView({ data, activeFocus, onFocusChange }: Props) {
  const selectedCapability = activeFocus.kind === 'capability' ? activeFocus.id : null;
  const projects = data.experiences.filter((experience) =>
    !selectedCapability || getExperienceCapabilityIds(experience).includes(selectedCapability)
  );

  return (
    <section className="capability-reading-view" aria-label="Capability reading view">
      <header>
        <h3>Explore the evidence</h3>
        <p>Choose a capability, then a project to read its contribution, result, and limitations.</p>
      </header>
      <div className="reading-capabilities" aria-label="Capabilities">
        {data.capabilities.map((capability) => {
          const count = data.experiences.filter((experience) =>
            getExperienceCapabilityIds(experience).includes(capability.id)
          ).length;
          const selected = selectedCapability === capability.id;
          return (
            <button
              key={capability.id}
              className="reading-capability-button"
              type="button"
              aria-pressed={selected}
              onClick={() => onFocusChange(selected ? { kind: 'overview' } : { kind: 'capability', id: capability.id })}
            >
              <strong>{capability.label}</strong>
              <span>{capability.description}</span>
              <small>{count} connected project{count === 1 ? '' : 's'}</small>
            </button>
          );
        })}
      </div>
      <h3>{selectedCapability ? 'Connected projects' : 'Projects'}</h3>
      <p>Connections describe evidence, not a proficiency score. Tentative interpretations remain visible in each story.</p>
      <div className="reading-projects" aria-label="Projects">
        {projects.map((experience) => (
          <button
            key={experience.id}
            className="reading-project-button"
            type="button"
            aria-label={`Select experience: ${experience.title}`}
            onClick={() => onFocusChange({ kind: 'project', id: experience.id })}
          >
            <strong>{experience.title}</strong>
            <small>{experience.type} · {experience.period.label}</small>
            <span>{experience.summary}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
