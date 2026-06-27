import { useMemo, useState } from 'react';
import type { MosaicData } from '../types';
import {
  capabilityUsage,
  experienceMatchesFilters,
  getCapabilityMap,
  getExperienceCapabilityIds
} from '../utils/mosaic';

type CapabilityMapProps = {
  data: MosaicData;
  selectedCapabilityId: string | null;
  selectedPrincipleId: string | null;
  selectedExperienceId: string | null;
  onCapabilitySelect: (capabilityId: string | null) => void;
  onExperienceSelect: (experienceId: string) => void;
};

export function CapabilityMap({
  data,
  selectedCapabilityId,
  selectedPrincipleId,
  selectedExperienceId,
  onCapabilitySelect,
  onExperienceSelect
}: CapabilityMapProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredExperienceId, setHoveredExperienceId] = useState<string | null>(null);
  const usage = capabilityUsage(data);
  const capabilityMap = getCapabilityMap(data.capabilities);
  const categories = useMemo(
    () => Array.from(new Set(data.capabilities.map((capability) => capability.category))),
    [data.capabilities]
  );
  const selectedExperience = data.experiences.find(
    (experience) => experience.id === selectedExperienceId
  );
  const hoveredExperience = data.experiences.find(
    (experience) => experience.id === hoveredExperienceId
  );
  const highlightedExperience = hoveredExperience ?? selectedExperience;

  function experienceMatchesCategory(experienceId: string): boolean {
    if (!selectedCategory) {
      return true;
    }

    const experience = data.experiences.find((item) => item.id === experienceId);

    if (!experience) {
      return false;
    }

    return getExperienceCapabilityIds(experience).some(
      (capabilityId) => capabilityMap[capabilityId]?.category === selectedCategory
    );
  }

  return (
    <section className="map-card" aria-label="Capability map">
      <div className="map-card__header">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>Capability constellation</h2>
        </div>
        <p>{data.experiences.length} experiences · {data.capabilities.length} capabilities</p>
      </div>

      <div className="atlas-board">
        <aside className="discover-rail" aria-label="Discover filters">
          <div>
            <p className="eyebrow">Discover</p>
            <h3>Filter signal</h3>
          </div>

          <div className="rail-summary">
            <span>{data.experiences.length}</span>
            <small>experiences mapped to {data.capabilities.length} capabilities</small>
          </div>

          <div className="category-filter">
            <button
              className={selectedCategory === null ? 'is-active' : ''}
              type="button"
              onClick={() => setSelectedCategory(null)}
            >
              All categories
            </button>
            {categories.map((category) => (
              <button
                key={category}
                className={selectedCategory === category ? 'is-active' : ''}
                data-category={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="rail-experiences">
            <p className="rail-label">Experiences</p>
            {data.experiences.map((experience) => {
              const matchesFilters = experienceMatchesFilters(experience, {
                capabilityId: selectedCapabilityId,
                principleId: selectedPrincipleId
              });
              const matchesCategory = experienceMatchesCategory(experience.id);
              const isMuted = !matchesFilters || !matchesCategory;

              return (
                <button
                  key={experience.id}
                  className={`experience-chip ${experience.id === selectedExperienceId ? 'is-selected' : ''} ${isMuted ? 'is-muted' : ''}`}
                  type="button"
                  onClick={() => onExperienceSelect(experience.id)}
                  onFocus={() => setHoveredExperienceId(experience.id)}
                  onBlur={() => setHoveredExperienceId(null)}
                  onMouseEnter={() => setHoveredExperienceId(experience.id)}
                  onMouseLeave={() => setHoveredExperienceId(null)}
                >
                  <span>{experience.title}</span>
                  <small>{experience.period.label}</small>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="constellation">
          <svg className="constellation__lines" viewBox="0 0 100 100" aria-hidden="true">
            {data.capabilities.map((capability, index) => {
              const angle = (index / data.capabilities.length) * Math.PI * 2 - Math.PI / 2;
              const x = 50 + Math.cos(angle) * 39;
              const y = 50 + Math.sin(angle) * 34;
              const isConnectedToHighlightedExperience = highlightedExperience
                ? getExperienceCapabilityIds(highlightedExperience).includes(capability.id)
                : false;
              const isSelectedCapability = selectedCapabilityId === capability.id;
              const isCategoryMatch = !selectedCategory || selectedCategory === capability.category;

              return (
                <line
                  key={capability.id}
                  x1="50"
                  y1="50"
                  x2={x}
                  y2={y}
                  className={`${isConnectedToHighlightedExperience || isSelectedCapability ? 'is-lit' : ''} ${!isCategoryMatch ? 'is-muted' : ''}`}
                />
              );
            })}
          </svg>

          <div className="constellation__center">
            <span>{data.profile.name}</span>
            <strong>{highlightedExperience?.title ?? 'Mosaic capability atlas'}</strong>
            {highlightedExperience && (
              <small>{highlightedExperience.type} · {highlightedExperience.period.label}</small>
            )}
          </div>

          {data.capabilities.map((capability, index) => {
            const angle = (index / data.capabilities.length) * Math.PI * 2 - Math.PI / 2;
            const x = 50 + Math.cos(angle) * 39;
            const y = 50 + Math.sin(angle) * 34;
            const isSelected = selectedCapabilityId === capability.id;
            const isConnectedToHighlightedExperience = highlightedExperience
              ? getExperienceCapabilityIds(highlightedExperience).includes(capability.id)
              : false;
            const isCategoryMatch = !selectedCategory || selectedCategory === capability.category;
            const isDimmed =
              !isCategoryMatch ||
              (selectedCapabilityId !== null && !isSelected && !isConnectedToHighlightedExperience);

            return (
              <button
                key={capability.id}
                className={`capability-node ${isSelected ? 'is-selected' : ''} ${isConnectedToHighlightedExperience ? 'is-connected' : ''} ${isDimmed ? 'is-dimmed' : ''}`}
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

        <aside className="legend-panel" aria-label="Legend">
          <p className="eyebrow">Legend</p>
          <h3>Signal types</h3>
          <div className="legend-list">
            {categories.map((category) => (
              <span key={category} data-category={category}>
                {category}
              </span>
            ))}
          </div>
          <div className="legend-note">
            <strong>Selected path</strong>
            <p>Hover an experience or select a capability to brighten connected nodes.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
