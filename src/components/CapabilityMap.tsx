import type { MosaicData } from '../types';
import {
  capabilityUsage,
  experienceMatchesCapability,
  getExperienceCapabilityIds
} from '../utils/mosaic';

type CapabilityMapProps = {
  data: MosaicData;
  selectedCapabilityId: string | null;
  selectedExperienceId: string | null;
  onCapabilitySelect: (capabilityId: string | null) => void;
  onExperienceSelect: (experienceId: string) => void;
};

export function CapabilityMap({
  data,
  selectedCapabilityId,
  selectedExperienceId,
  onCapabilitySelect,
  onExperienceSelect
}: CapabilityMapProps) {
  const usage = capabilityUsage(data);
  const selectedExperience = data.experiences.find(
    (experience) => experience.id === selectedExperienceId
  );

  return (
    <section className="map-card" aria-label="Capability map">
      <div className="map-card__header">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>Capability constellation</h2>
        </div>
        <p>{data.experiences.length} experiences · {data.capabilities.length} capabilities</p>
      </div>

      <div className="constellation">
        <svg className="constellation__lines" viewBox="0 0 100 100" aria-hidden="true">
          {data.capabilities.map((capability, index) => {
            const angle = (index / data.capabilities.length) * Math.PI * 2 - Math.PI / 2;
            const x = 50 + Math.cos(angle) * 39;
            const y = 50 + Math.sin(angle) * 34;
            const isConnectedToSelectedExperience = selectedExperience
              ? getExperienceCapabilityIds(selectedExperience).includes(capability.id)
              : false;
            const isSelectedCapability = selectedCapabilityId === capability.id;

            return (
              <line
                key={capability.id}
                x1="50"
                y1="50"
                x2={x}
                y2={y}
                className={isConnectedToSelectedExperience || isSelectedCapability ? 'is-lit' : ''}
              />
            );
          })}
        </svg>

        <div className="constellation__center">
          <span>Mosaic</span>
          <strong>{selectedExperience?.title ?? 'Select an experience'}</strong>
        </div>

        {data.capabilities.map((capability, index) => {
          const angle = (index / data.capabilities.length) * Math.PI * 2 - Math.PI / 2;
          const x = 50 + Math.cos(angle) * 39;
          const y = 50 + Math.sin(angle) * 34;
          const isSelected = selectedCapabilityId === capability.id;
          const isDimmed = selectedCapabilityId !== null && !isSelected;

          return (
            <button
              key={capability.id}
              className={`capability-node ${isSelected ? 'is-selected' : ''} ${isDimmed ? 'is-dimmed' : ''}`}
              data-category={capability.category}
              style={{ left: `${x}%`, top: `${y}%` }}
              type="button"
              onClick={() => onCapabilitySelect(isSelected ? null : capability.id)}
              title={capability.description}
            >
              <span>{capability.label}</span>
              <small>{capability.category} · {usage[capability.id] ?? 0}</small>
            </button>
          );
        })}
      </div>

      <div className="experience-strip">
        {data.experiences.map((experience) => {
          const matches = experienceMatchesCapability(experience, selectedCapabilityId);
          return (
            <button
              key={experience.id}
              className={`experience-chip ${experience.id === selectedExperienceId ? 'is-selected' : ''} ${!matches ? 'is-muted' : ''}`}
              type="button"
              onClick={() => onExperienceSelect(experience.id)}
            >
              <span>{experience.title}</span>
              <small>{experience.period.label}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
