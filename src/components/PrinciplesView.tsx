import type { MosaicData } from '../types';
import {
  experiencesByPrinciple,
  principleUsage,
  revealedPatternsByExperience
} from '../utils/mosaic';

type PrinciplesViewProps = {
  data: MosaicData;
  selectedPrincipleId: string | null;
  selectedExperienceId: string | null;
  onPrincipleSelect: (principleId: string | null) => void;
  onExperienceSelect: (experienceId: string) => void;
};

export function PrinciplesView({
  data,
  selectedPrincipleId,
  selectedExperienceId,
  onPrincipleSelect,
  onExperienceSelect
}: PrinciplesViewProps) {
  const principleGroups = experiencesByPrinciple(data);
  const usage = principleUsage(data);
  const selectedPrinciple = data.principles.find((principle) => principle.id === selectedPrincipleId);
  const visiblePrinciples = selectedPrinciple ? [selectedPrinciple] : data.principles;

  return (
    <section className="principles-card" aria-label="Principles and revealed patterns">
      <div className="map-card__header">
        <div>
          <p className="eyebrow">Principles</p>
          <h2>Patterns behind the experiences</h2>
        </div>
        <p>{data.principles.length} principles · {data.experiences.length} stories</p>
      </div>

      <div className="principle-grid">
        {data.principles.map((principle) => {
          const isSelected = selectedPrincipleId === principle.id;
          const isDimmed = selectedPrincipleId !== null && !isSelected;

          return (
            <button
              key={principle.id}
              className={`principle-node ${isSelected ? 'is-selected' : ''} ${isDimmed ? 'is-dimmed' : ''}`}
              type="button"
              onClick={() => onPrincipleSelect(isSelected ? null : principle.id)}
            >
              <span>{principle.label}</span>
              <small>{usage[principle.id] ?? 0} connected experience{usage[principle.id] === 1 ? '' : 's'}</small>
              <p>{principle.description}</p>
            </button>
          );
        })}
      </div>

      <div className="pattern-explorer">
        {visiblePrinciples.map((principle) => {
          const relatedExperiences = principleGroups[principle.id] ?? [];

          return (
            <article key={principle.id} className="principle-story">
              <header>
                <p className="eyebrow">Revealed through</p>
                <h3>{principle.label}</h3>
                <p>{principle.description}</p>
              </header>

              <div className="principle-story__experiences">
                {relatedExperiences.map((experience) => (
                  <button
                    key={experience.id}
                    className={`principle-experience ${experience.id === selectedExperienceId ? 'is-selected' : ''}`}
                    type="button"
                    onClick={() => onExperienceSelect(experience.id)}
                  >
                    <span>{experience.title}</span>
                    <small>{experience.period.label} · {experience.type}</small>
                  </button>
                ))}
              </div>

              <div className="principle-story__patterns">
                {relatedExperiences.flatMap((experience) =>
                  revealedPatternsByExperience(experience).map((pattern) => (
                    <blockquote key={`${experience.id}-${pattern}`}>
                      <p>{pattern}</p>
                      <cite>{experience.title}</cite>
                    </blockquote>
                  ))
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
