import type { MosaicData } from '../types';
import {
  experienceMatchesFilters,
  getDominantCapabilityCategory,
  sortExperiencesByStart
} from '../utils/mosaic';

type TimelineViewProps = {
  data: MosaicData;
  selectedCapabilityId: string | null;
  selectedPrincipleId: string | null;
  selectedExperienceId: string | null;
  onExperienceSelect: (experienceId: string) => void;
};

export function TimelineView({
  data,
  selectedCapabilityId,
  selectedPrincipleId,
  selectedExperienceId,
  onExperienceSelect
}: TimelineViewProps) {
  const sortedExperiences = sortExperiencesByStart(data.experiences);
  const ribbonPoints = sortedExperiences.map((experience, index) => {
    const x = sortedExperiences.length === 1
      ? 50
      : 6 + (index / (sortedExperiences.length - 1)) * 88;
    const y = 18 + Math.sin(index * 1.2) * 8;

    return { experience, x, y };
  });
  const ribbonPath = ribbonPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return (
    <section className="timeline-card" aria-label="Experience timeline">
      <div className="map-card__header">
        <div>
          <p className="eyebrow">Timeline</p>
          <h2>Journey through experiences</h2>
        </div>
        <p>Same data, different lens</p>
      </div>

      <div className="timeline-ribbon" aria-hidden="true">
        <svg viewBox="0 0 100 36" preserveAspectRatio="none">
          <path className="timeline-ribbon__path" d={ribbonPath} />
          {ribbonPoints.map(({ experience, x, y }) => {
            const matches = experienceMatchesFilters(experience, {
              capabilityId: selectedCapabilityId,
              principleId: selectedPrincipleId
            });
            const category = getDominantCapabilityCategory(data.capabilities, experience);

            return (
              <circle
                key={experience.id}
                className={`${experience.id === selectedExperienceId ? 'is-selected' : ''} ${!matches ? 'is-muted' : ''}`}
                data-category={category}
                cx={x}
                cy={y}
                r="1.9"
              />
            );
          })}
        </svg>
      </div>

      <div className="timeline">
        {sortedExperiences.map((experience, index) => {
          const matches = experienceMatchesFilters(experience, {
            capabilityId: selectedCapabilityId,
            principleId: selectedPrincipleId
          });
          const category = getDominantCapabilityCategory(data.capabilities, experience);
          return (
            <button
              key={experience.id}
              type="button"
              className={`timeline-item ${experience.id === selectedExperienceId ? 'is-selected' : ''} ${!matches ? 'is-muted' : ''}`}
              data-category={category}
              onClick={() => onExperienceSelect(experience.id)}
            >
              <span className="timeline-item__year">{experience.period.label}</span>
              <span className="timeline-item__dot" data-category={category} aria-hidden="true">{index + 1}</span>
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
