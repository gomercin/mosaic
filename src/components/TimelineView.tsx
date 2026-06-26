import type { MosaicData } from '../types';
import { experienceMatchesCapability, sortExperiencesByStart } from '../utils/mosaic';

type TimelineViewProps = {
  data: MosaicData;
  selectedCapabilityId: string | null;
  selectedExperienceId: string | null;
  onExperienceSelect: (experienceId: string) => void;
};

export function TimelineView({
  data,
  selectedCapabilityId,
  selectedExperienceId,
  onExperienceSelect
}: TimelineViewProps) {
  const sortedExperiences = sortExperiencesByStart(data.experiences);

  return (
    <section className="timeline-card" aria-label="Experience timeline">
      <div className="map-card__header">
        <div>
          <p className="eyebrow">Timeline</p>
          <h2>Journey through experiences</h2>
        </div>
        <p>Same data, different lens</p>
      </div>

      <div className="timeline">
        {sortedExperiences.map((experience, index) => {
          const matches = experienceMatchesCapability(experience, selectedCapabilityId);
          return (
            <button
              key={experience.id}
              type="button"
              className={`timeline-item ${experience.id === selectedExperienceId ? 'is-selected' : ''} ${!matches ? 'is-muted' : ''}`}
              onClick={() => onExperienceSelect(experience.id)}
            >
              <span className="timeline-item__year">{experience.period.label}</span>
              <span className="timeline-item__dot" aria-hidden="true">{index + 1}</span>
              <span className="timeline-item__body">
                <strong>{experience.title}</strong>
                <small>{experience.type}{experience.company ? ` · ${experience.company}` : ''}</small>
                <span>{experience.summary}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
