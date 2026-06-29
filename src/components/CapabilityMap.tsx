import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Capability, Experience, MosaicData } from '../types';
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

type Point = {
  x: number;
  y: number;
};

type CapabilityNode = Capability & Point & { usage: number };

type ExperienceNode = Experience & Point & {
  capabilityIds: string[];
  dominantCategory?: string;
  glyph: string;
};

const CATEGORY_ARCS: Record<string, [number, number]> = {
  'Core capability': [130, 235],
  Technical: [-25, 50],
  Human: [45, 125],
  Creative: [-125, -50]
};

const FALLBACK_ARCS: Array<[number, number]> = [
  [-135, -55],
  [-35, 45],
  [55, 135],
  [145, 225]
];

const CENTER: Point = { x: 50, y: 50 };

function polarPoint(angleDegrees: number, radiusX: number, radiusY: number): Point {
  const radians = (angleDegrees / 180) * Math.PI;

  return {
    x: CENTER.x + Math.cos(radians) * radiusX,
    y: CENTER.y + Math.sin(radians) * radiusY
  };
}

function interpolateArc(start: number, end: number, index: number, total: number): number {
  if (total <= 1) {
    return (start + end) / 2;
  }

  return start + ((end - start) * index) / (total - 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hashString(value: string): number {
  return Array.from(value).reduce((hash, character) => {
    return (hash * 31 + character.charCodeAt(0)) >>> 0;
  }, 7);
}

function intersects(left: string[], right: string[]): boolean {
  return left.some((item) => right.includes(item));
}

function getExperienceGlyph(experience: Experience): string {
  const descriptor = `${experience.type} ${experience.title}`.toLowerCase();

  if (descriptor.includes('talk') || descriptor.includes('facilitation')) {
    return '✦';
  }

  if (descriptor.includes('creative') || descriptor.includes('hobby') || descriptor.includes('clarinet')) {
    return '♪';
  }

  if (descriptor.includes('work')) {
    return '▣';
  }

  if (descriptor.includes('product')) {
    return '⬡';
  }

  if (descriptor.includes('side')) {
    return '◇';
  }

  return '○';
}

function getProfileInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function buildCapabilityNodes(data: MosaicData): CapabilityNode[] {
  const usage = capabilityUsage(data);
  const groupedCapabilities = data.capabilities.reduce<Record<string, Capability[]>>(
    (groups, capability) => {
      groups[capability.category] = [...(groups[capability.category] ?? []), capability];
      return groups;
    },
    {}
  );
  const categories = Object.keys(groupedCapabilities);

  return categories.flatMap((category, categoryIndex) => {
    const capabilities = groupedCapabilities[category];
    const [start, end] = CATEGORY_ARCS[category] ?? FALLBACK_ARCS[categoryIndex % FALLBACK_ARCS.length];

    return capabilities.map((capability, index) => {
      const angle = interpolateArc(start, end, index, capabilities.length);
      const point = polarPoint(angle, 39, 34);

      return {
        ...capability,
        ...point,
        usage: usage[capability.id] ?? 0
      };
    });
  });
}

function buildExperienceNodes(data: MosaicData, capabilityNodes: CapabilityNode[]): ExperienceNode[] {
  const capabilityMap = Object.fromEntries(capabilityNodes.map((node) => [node.id, node]));

  return data.experiences.map((experience, index) => {
    const capabilityIds = getExperienceCapabilityIds(experience);
    const relatedCapabilityNodes = capabilityIds
      .map((capabilityId) => capabilityMap[capabilityId])
      .filter((capability): capability is CapabilityNode => Boolean(capability));
    const seed = hashString(experience.id);
    const jitterAngle = ((seed % 360) / 180) * Math.PI;
    const jitterRadius = 4.5 + (seed % 9) * 0.35;
    const orbitAngle = ((index / Math.max(data.experiences.length, 1)) * Math.PI * 2) + jitterAngle / 7;

    const averagePoint = relatedCapabilityNodes.length > 0
      ? relatedCapabilityNodes.reduce<Point>(
          (sum, capability) => ({ x: sum.x + capability.x, y: sum.y + capability.y }),
          { x: 0, y: 0 }
        )
      : CENTER;
    const normalizedAverage = relatedCapabilityNodes.length > 0
      ? {
          x: averagePoint.x / relatedCapabilityNodes.length,
          y: averagePoint.y / relatedCapabilityNodes.length
        }
      : polarPoint((index / Math.max(data.experiences.length, 1)) * 360, 28, 22);

    return {
      ...experience,
      capabilityIds,
      dominantCategory: relatedCapabilityNodes[0]?.category,
      glyph: getExperienceGlyph(experience),
      x: clamp(
        normalizedAverage.x * 0.72 + CENTER.x * 0.28 + Math.cos(jitterAngle) * jitterRadius + Math.cos(orbitAngle) * 2.8,
        10,
        90
      ),
      y: clamp(
        normalizedAverage.y * 0.72 + CENTER.y * 0.28 + Math.sin(jitterAngle) * jitterRadius + Math.sin(orbitAngle) * 2.8,
        12,
        88
      )
    };
  });
}

function buildBackgroundSignals(count: number): Array<Point & { size: number; opacity: number }> {
  return Array.from({ length: count }, (_, index) => {
    const seed = hashString(`signal-${index}`);

    return {
      x: 4 + (seed % 9200) / 100,
      y: 5 + ((seed / 97) % 8800) / 100,
      size: 2 + (seed % 5),
      opacity: 0.08 + (seed % 10) / 100
    };
  });
}

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
  const capabilityMap = getCapabilityMap(data.capabilities);
  const categories = useMemo(
    () => Array.from(new Set(data.capabilities.map((capability) => capability.category))),
    [data.capabilities]
  );
  const experienceTypes = useMemo(
    () => Array.from(new Set(data.experiences.map((experience) => experience.type))),
    [data.experiences]
  );
  const capabilityNodes = useMemo(() => buildCapabilityNodes(data), [data]);
  const capabilityNodeMap = useMemo(
    () => Object.fromEntries(capabilityNodes.map((node) => [node.id, node])),
    [capabilityNodes]
  );
  const experienceNodes = useMemo(
    () => buildExperienceNodes(data, capabilityNodes),
    [data, capabilityNodes]
  );
  const backgroundSignals = useMemo(() => buildBackgroundSignals(90), []);
  const selectedExperience = experienceNodes.find(
    (experience) => experience.id === selectedExperienceId
  );
  const hoveredExperience = experienceNodes.find(
    (experience) => experience.id === hoveredExperienceId
  );
  const activeExperience = hoveredExperience ?? selectedExperience;
  const activeCapabilityIds = activeExperience?.capabilityIds ?? [];
  const hasActiveFilter = Boolean(selectedCapabilityId || selectedPrincipleId || selectedCategory);

  function experienceMatchesCategory(experience: ExperienceNode): boolean {
    if (!selectedCategory) {
      return true;
    }

    return experience.capabilityIds.some(
      (capabilityId) => capabilityMap[capabilityId]?.category === selectedCategory
    );
  }

  function experienceMatchesSelectedCapability(experience: ExperienceNode): boolean {
    return !selectedCapabilityId || experience.capabilityIds.includes(selectedCapabilityId);
  }

  function experienceMatchesSelectedPrinciple(experience: ExperienceNode): boolean {
    return !selectedPrincipleId || experience.principles.includes(selectedPrincipleId);
  }

  function isExperienceDimmed(experience: ExperienceNode): boolean {
    const matchesFilters = experienceMatchesFilters(experience, {
      capabilityId: selectedCapabilityId,
      principleId: selectedPrincipleId
    });
    const matchesCategory = experienceMatchesCategory(experience);
    const isActiveExperience = activeExperience?.id === experience.id;
    const sharesActiveCapability = activeCapabilityIds.length > 0 && intersects(experience.capabilityIds, activeCapabilityIds);

    return (
      !matchesFilters ||
      !matchesCategory ||
      (Boolean(activeExperience) && !isActiveExperience && !sharesActiveCapability)
    );
  }

  function isCapabilityDimmed(capability: CapabilityNode): boolean {
    const matchesCategory = !selectedCategory || selectedCategory === capability.category;
    const isSelected = selectedCapabilityId === capability.id;
    const isConnectedToActiveExperience = activeCapabilityIds.includes(capability.id);

    return (
      !matchesCategory ||
      (Boolean(selectedCapabilityId) && !isSelected && !isConnectedToActiveExperience) ||
      (Boolean(activeExperience) && !isConnectedToActiveExperience && !isSelected)
    );
  }

  return (
    <section className="map-card" aria-label="Capability constellation">
      <div className="map-card__header constellation-heading">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>The constellation</h2>
          <p className="constellation-heading__subtitle">
            Experiences orbit capabilities. Hover an experience to reveal the path; click a capability to filter the signal.
          </p>
        </div>
        <p>{data.experiences.length} experiences · {data.capabilities.length} capabilities</p>
      </div>

      <div className="constellation-foundation">
        <aside className="constellation-rail" aria-label="Constellation filters">
          <div>
            <p className="eyebrow">Filter by</p>
            <h3>Capability family</h3>
          </div>

          <div className="constellation-rail__summary">
            <span>{data.experiences.length}</span>
            <small>experiences mapped into one living graph</small>
          </div>

          <div className="constellation-category-list">
            <button
              className={selectedCategory === null ? 'is-active' : ''}
              type="button"
              onClick={() => setSelectedCategory(null)}
            >
              <span>All</span>
              <small>{data.capabilities.length}</small>
            </button>
            {categories.map((category) => {
              const capabilityCount = data.capabilities.filter(
                (capability) => capability.category === category
              ).length;

              return (
                <button
                  key={category}
                  className={selectedCategory === category ? 'is-active' : ''}
                  data-category={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                >
                  <span>{category}</span>
                  <small>{capabilityCount}</small>
                </button>
              );
            })}
          </div>

          <div className="constellation-hint">
            <strong>Interaction rule</strong>
            <p>Nothing disappears abruptly. Unrelated nodes fade so the selected path still lives inside the whole map.</p>
          </div>
        </aside>

        <div className="constellation-stage" aria-label="Interactive capability constellation">
          <div className="constellation-atmosphere" aria-hidden="true" />
          {backgroundSignals.map((signal, index) => (
            <span
              key={index}
              className="constellation-spark"
              style={{
                left: `${signal.x}%`,
                top: `${signal.y}%`,
                width: `${signal.size}px`,
                height: `${signal.size}px`,
                opacity: signal.opacity
              }}
              aria-hidden="true"
            />
          ))}

          <svg className="constellation-network" viewBox="0 0 100 100" aria-hidden="true">
            <defs>
              <filter id="constellation-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="0.7" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {experienceNodes.flatMap((experience) =>
              experience.capabilityIds.map((capabilityId) => {
                const capability = capabilityNodeMap[capabilityId];

                if (!capability) {
                  return null;
                }

                const isActiveExperience = activeExperience?.id === experience.id;
                const isSelectedCapabilityEdge = selectedCapabilityId === capabilityId;
                const isLit =
                  (isActiveExperience && experience.capabilityIds.includes(capabilityId)) ||
                  (isSelectedCapabilityEdge && experienceMatchesSelectedCapability(experience)) ||
                  (Boolean(selectedPrincipleId) && experienceMatchesSelectedPrinciple(experience));
                const isMuted =
                  !isLit &&
                  (hasActiveFilter || Boolean(activeExperience) || !experienceMatchesCategory(experience));

                return (
                  <line
                    key={`${experience.id}-${capabilityId}`}
                    x1={experience.x}
                    y1={experience.y}
                    x2={capability.x}
                    y2={capability.y}
                    className={`constellation-edge ${isLit ? 'is-lit' : ''} ${isMuted ? 'is-muted' : ''}`}
                    data-category={capability.category}
                  />
                );
              })
            )}
          </svg>

          <div className="constellation-core" aria-label="Profile core">
            <span className="constellation-core__initials">{getProfileInitials(data.profile.name)}</span>
            <span className="constellation-core__label">Mosaic</span>
            <strong>{activeExperience?.title ?? data.profile.tagline}</strong>
            {activeExperience && (
              <small>{activeExperience.type} · {activeExperience.period.label}</small>
            )}
          </div>

          {capabilityNodes.map((capability) => {
            const isSelected = selectedCapabilityId === capability.id;
            const isConnected = activeCapabilityIds.includes(capability.id);
            const isDimmed = isCapabilityDimmed(capability);

            return (
              <button
                key={capability.id}
                className={`constellation-capability ${isSelected ? 'is-selected' : ''} ${isConnected ? 'is-connected' : ''} ${isDimmed ? 'is-dimmed' : ''}`}
                data-category={capability.category}
                style={{ left: `${capability.x}%`, top: `${capability.y}%` } as CSSProperties}
                type="button"
                onClick={() => onCapabilitySelect(isSelected ? null : capability.id)}
                title={capability.description}
              >
                <span>{capability.label}</span>
                <small>{capability.usage} experience{capability.usage === 1 ? '' : 's'}</small>
              </button>
            );
          })}

          {experienceNodes.map((experience) => {
            const isSelected = selectedExperienceId === experience.id;
            const isHovered = hoveredExperienceId === experience.id;
            const isDimmed = isExperienceDimmed(experience);
            const isRelatedToCapability = experienceMatchesSelectedCapability(experience);

            return (
              <button
                key={experience.id}
                className={`constellation-experience ${isSelected ? 'is-selected' : ''} ${isHovered ? 'is-hovered' : ''} ${isDimmed ? 'is-dimmed' : ''} ${isRelatedToCapability ? 'is-related' : ''}`}
                data-category={experience.dominantCategory}
                style={{ left: `${experience.x}%`, top: `${experience.y}%` } as CSSProperties}
                type="button"
                onClick={() => onExperienceSelect(experience.id)}
                onFocus={() => setHoveredExperienceId(experience.id)}
                onBlur={() => setHoveredExperienceId(null)}
                onMouseEnter={() => setHoveredExperienceId(experience.id)}
                onMouseLeave={() => setHoveredExperienceId(null)}
                aria-label={`Select experience: ${experience.title}`}
              >
                <span className="constellation-experience__glyph">{experience.glyph}</span>
                <span className="constellation-experience__story">
                  <strong>{experience.title}</strong>
                  <small>{experience.period.label} · {experience.type}</small>
                </span>
              </button>
            );
          })}
        </div>

        <aside className="constellation-legend" aria-label="Constellation legend">
          <p className="eyebrow">Legend</p>
          <h3>Signal colors</h3>
          <div className="constellation-legend__items">
            {categories.map((category) => (
              <span key={category} data-category={category}>
                {category}
              </span>
            ))}
          </div>

          <h3>Experience types</h3>
          <div className="constellation-legend__types">
            {experienceTypes.map((type) => (
              <span key={type}>{type}</span>
            ))}
          </div>

          <div className="constellation-hint constellation-hint--right">
            <strong>Foundation note</strong>
            <p>This view intentionally uses deterministic layout math for now. Codex can later replace the positioning engine without changing the data model.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
