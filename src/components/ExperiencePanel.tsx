import type { Experience, MosaicData } from '../types';
import { getCapabilityMap, getPrincipleMap } from '../utils/mosaic';

type ExperiencePanelProps = {
  data: MosaicData;
  experience: Experience | null;
  selectedCapabilityId: string | null;
};

export function ExperiencePanel({ data, experience, selectedCapabilityId }: ExperiencePanelProps) {
  const capabilityMap = getCapabilityMap(data.capabilities);
  const principleMap = getPrincipleMap(data.principles);

  if (!experience) {
    return (
      <aside className="detail-panel">
        <p className="eyebrow">Experience</p>
        <h2>Pick an experience</h2>
        <p>Select a card or a point on the timeline to inspect how it contributes to the atlas.</p>
      </aside>
    );
  }

  return (
    <aside className="detail-panel">
      <p className="eyebrow">{experience.type} · {experience.period.label}</p>
      <h2>{experience.title}</h2>
      {experience.company && <p className="detail-panel__company">{experience.company}</p>}
      <p className="detail-panel__summary">{experience.summary}</p>

      <div className="detail-grid">
        {experience.challenge && (
          <section>
            <h3>Challenge</h3>
            <p>{experience.challenge}</p>
          </section>
        )}
        {experience.approach && (
          <section>
            <h3>Approach</h3>
            <p>{experience.approach}</p>
          </section>
        )}
        {experience.impact && (
          <section>
            <h3>Impact</h3>
            <p>{experience.impact}</p>
          </section>
        )}
      </div>

      <section className="tag-section">
        <h3>Capabilities demonstrated</h3>
        <div className="tag-list">
          {experience.skills.map((skillId) => {
            const capability = capabilityMap[skillId];
            const isSelected = selectedCapabilityId === skillId;
            return (
              <span key={skillId} className={`tag ${isSelected ? 'is-selected' : ''}`}>
                {capability?.label ?? skillId}
              </span>
            );
          })}
        </div>
      </section>

      <section className="tag-section">
        <h3>Principles revealed</h3>
        <div className="principle-list">
          {experience.principles.map((principleId) => {
            const principle = principleMap[principleId];
            return (
              <article key={principleId}>
                <strong>{principle?.label ?? principleId}</strong>
                {principle?.description && <p>{principle.description}</p>}
              </article>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
