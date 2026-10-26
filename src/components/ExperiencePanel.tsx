import type { Experience, MosaicData } from '../types';
import { getCapabilityMap, getExperienceCapabilityIds, getPrincipleMap } from '../utils/mosaic';

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
      <aside className="detail-panel" tabIndex={0} aria-label="Project story">
        <p className="eyebrow">Experience</p>
        <h2>Pick an experience</h2>
        <p>Select a card or a point on the timeline to inspect how it contributes to the atlas.</p>
      </aside>
    );
  }

  const tools = experience.tools ?? [];
  const revealedPatterns = experience.revealedPatterns ?? [];
  const principles = experience.principles ?? [];
  const evidence = experience.evidence ?? [];
  const episodes = (data.evidenceEpisodes ?? []).filter((episode) => episode.experienceId === experience.id);
  const links = (data.evidenceLinks ?? []).filter((link) => link.experienceId === experience.id);

  return (
    <aside className="detail-panel" tabIndex={0} aria-label="Project story">
      <p className="eyebrow">{experience.type} · {experience.period.label}</p>
      <h2>{experience.title}</h2>
      {experience.company && <p className="detail-panel__company">{experience.company}</p>}
      <p className="detail-panel__summary">{experience.summary}</p>
      {experience.publicNarrative && (
        <p className="detail-panel__narrative">{experience.publicNarrative}</p>
      )}

      {episodes.length > 0 && (
        <section className="episode-section" aria-label="Evidence episodes">
          <h3>The evidence behind the connection</h3>
          {episodes.map((episode) => (
            <article key={episode.id} id={episode.id} className="evidence-episode">
              <h4>{episode.summary}</h4>
              <dl>
                <dt>My contribution</dt><dd>{episode.myContribution}</dd>
                <dt>Team / existing work</dt><dd>{episode.teamContribution}</dd>
                <dt>AI assistance</dt><dd>{episode.aiContribution}</dd>
                <dt>Result · {episode.outcomeStatus}</dt><dd>{episode.result}</dd>
                <dt>Limitations</dt><dd>{episode.limitation}</dd>
              </dl>
              {links.filter((link) => link.episodeId === episode.id).map((link) => (
                <div key={link.id} className="evidence-connection">
                  <strong>{capabilityMap[link.capabilityId]?.label}</strong>
                  <p>{link.explanation}</p>
                  <small>
                    {link.signalType} · {link.confidence} confidence · {link.confirmedByUser ? 'User-confirmed' : 'Interpretation awaiting confirmation'}
                  </small>
                </div>
              ))}
            </article>
          ))}
        </section>
      )}

      {revealedPatterns.length > 0 && (
        <section className="pattern-section pattern-section--primary">
          <h3>What did it reveal?</h3>
          <div className="pattern-list">
            {revealedPatterns.map((pattern) => (
              <p key={pattern}>{pattern}</p>
            ))}
          </div>
        </section>
      )}

      {principles.length > 0 && (
        <section className="principle-section">
          <h3>Principles this points to</h3>
          <div className="principle-list">
            {principles.map((principleId) => {
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
      )}

      <div className="detail-grid">
        {experience.challenge && (
          <section>
            <h3>What was difficult?</h3>
            <p>{experience.challenge}</p>
          </section>
        )}
        {experience.approach && (
          <section>
            <h3>How did I approach it?</h3>
            <p>{experience.approach}</p>
          </section>
        )}
        {experience.impact && (
          <section>
            <h3>Why does this matter now?</h3>
            <p>{experience.impact}</p>
          </section>
        )}
      </div>

      <section className="tag-section">
        <h3>Connected capabilities</h3>
        <div className="tag-list">
          {getExperienceCapabilityIds(experience).map((capabilityId) => {
            const capability = capabilityMap[capabilityId];
            const isSelected = selectedCapabilityId === capabilityId;
            return (
              <span
                key={capabilityId}
                className={`tag ${isSelected ? 'is-selected' : ''}`}
                data-category={capability?.category}
              >
                {capability?.label ?? capabilityId}
              </span>
            );
          })}
        </div>
      </section>

      {tools.length > 0 && (
        <section className="tag-section">
          <h3>Tools and materials</h3>
          <div className="tag-list">
            {tools.map((tool) => (
              <span key={tool} className="tag tag--tool">
                {tool}
              </span>
            ))}
          </div>
        </section>
      )}

      {evidence.length > 0 && (
        <section className="evidence-section">
          <h3>Evidence</h3>
          <div className="evidence-list">
            {evidence.map((item) => (
              <a key={item.url} href={item.url} target="_blank" rel="noreferrer">
                {item.label}
              </a>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}
