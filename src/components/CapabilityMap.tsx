import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ActiveFocus, Capability, Experience, HoverTarget, MosaicData } from '../types';
import {
  capabilityUsage,
  experienceMatchesFilters,
  getCapabilityMap,
  getExperienceCapabilityIds
} from '../utils/mosaic';

type CapabilityMapProps = {
  data: MosaicData;
  activeFocus: ActiveFocus;
  onFocusChange: (focus: ActiveFocus) => void;
};

type Point = {
  x: number;
  y: number;
};

type CapabilityNode = Capability & Point & {
  collisionAnchor: Point;
  usage: number;
};

type ExperienceNode = Experience & Point & {
  capabilityIds: string[];
  dominantCategory?: string;
  collisionAnchor: Point;
  glyph: string;
};

type HelperPanel = 'filters' | 'legend' | 'help';

const HELPER_LABELS: Record<HelperPanel, string> = {
  filters: 'Filters',
  legend: 'Legend',
  help: 'Help'
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

function distanceBetween(left: Point, right: Point): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
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

  const initialNodes = categories.flatMap((category, categoryIndex) => {
    const capabilities = groupedCapabilities[category];
    const [start, end] = CATEGORY_ARCS[category] ?? FALLBACK_ARCS[categoryIndex % FALLBACK_ARCS.length];

    return capabilities.map((capability, index) => {
      const angle = interpolateArc(start, end, index, capabilities.length);
      const point = polarPoint(angle, 39, 34);

      return {
        ...capability,
        ...point,
        collisionAnchor: point,
        usage: usage[capability.id] ?? 0
      };
    });
  });

  return resolveCapabilityCollisions(initialNodes);
}

function resolveCapabilityCollisions(nodes: CapabilityNode[]): CapabilityNode[] {
  const minimumDistance = 18.8;
  const centerExclusionRadius = 34;
  let resolvedNodes = nodes.map((node) => ({ ...node }));

  for (let pass = 0; pass < 10; pass += 1) {
    resolvedNodes = resolvedNodes.map((node) => ({ ...node }));

    for (let leftIndex = 0; leftIndex < resolvedNodes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < resolvedNodes.length; rightIndex += 1) {
        const left = resolvedNodes[leftIndex];
        const right = resolvedNodes[rightIndex];
        const distance = distanceBetween(left, right);

        if (distance >= minimumDistance) {
          continue;
        }

        const fallbackAngle = ((hashString(`${left.id}-${right.id}-capability`) % 360) / 180) * Math.PI;
        const directionX = distance === 0 ? Math.cos(fallbackAngle) : (right.x - left.x) / distance;
        const directionY = distance === 0 ? Math.sin(fallbackAngle) : (right.y - left.y) / distance;
        const push = (minimumDistance - distance) / 2;

        left.x = clamp(left.x - directionX * push, 9, 91);
        left.y = clamp(left.y - directionY * push, 12, 88);
        right.x = clamp(right.x + directionX * push, 9, 91);
        right.y = clamp(right.y + directionY * push, 12, 88);
      }
    }

    resolvedNodes.forEach((node) => {
      const centerDistance = distanceBetween(node, CENTER);

      if (centerDistance < centerExclusionRadius) {
        const fallbackAngle = ((hashString(`${node.id}-capability-center`) % 360) / 180) * Math.PI;
        const directionX = centerDistance === 0 ? Math.cos(fallbackAngle) : (node.x - CENTER.x) / centerDistance;
        const directionY = centerDistance === 0 ? Math.sin(fallbackAngle) : (node.y - CENTER.y) / centerDistance;
        const push = centerExclusionRadius - centerDistance;

        node.x = clamp(node.x + directionX * push, 9, 91);
        node.y = clamp(node.y + directionY * push, 12, 88);
      }

      node.x = clamp(node.x * 0.97 + node.collisionAnchor.x * 0.03, 9, 91);
      node.y = clamp(node.y * 0.97 + node.collisionAnchor.y * 0.03, 12, 88);
    });
  }

  return resolvedNodes;
}

function buildExperienceNodes(data: MosaicData, capabilityNodes: CapabilityNode[]): ExperienceNode[] {
  const capabilityMap = Object.fromEntries(capabilityNodes.map((node) => [node.id, node]));

  const initialNodes = data.experiences.map((experience, index) => {
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

    const x = clamp(
      normalizedAverage.x * 0.72 + CENTER.x * 0.28 + Math.cos(jitterAngle) * jitterRadius + Math.cos(orbitAngle) * 2.8,
      10,
      90
    );
    const y = clamp(
      normalizedAverage.y * 0.72 + CENTER.y * 0.28 + Math.sin(jitterAngle) * jitterRadius + Math.sin(orbitAngle) * 2.8,
      12,
      88
    );

    return {
      ...experience,
      capabilityIds,
      dominantCategory: relatedCapabilityNodes[0]?.category,
      glyph: getExperienceGlyph(experience),
      x,
      y,
      collisionAnchor: { x, y }
    };
  });

  return resolveExperienceCollisions(initialNodes);
}

function resolveExperienceCollisions(nodes: ExperienceNode[]): ExperienceNode[] {
  const minimumDistance = 15.2;
  const centerExclusionRadius = 31;
  let resolvedNodes = nodes.map((node) => ({ ...node }));

  for (let pass = 0; pass < 8; pass += 1) {
    resolvedNodes = resolvedNodes.map((node) => ({ ...node }));

    for (let leftIndex = 0; leftIndex < resolvedNodes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < resolvedNodes.length; rightIndex += 1) {
        const left = resolvedNodes[leftIndex];
        const right = resolvedNodes[rightIndex];
        const distance = distanceBetween(left, right);

        if (distance >= minimumDistance) {
          continue;
        }

        const fallbackAngle = ((hashString(`${left.id}-${right.id}`) % 360) / 180) * Math.PI;
        const directionX = distance === 0 ? Math.cos(fallbackAngle) : (right.x - left.x) / distance;
        const directionY = distance === 0 ? Math.sin(fallbackAngle) : (right.y - left.y) / distance;
        const push = (minimumDistance - distance) / 2;

        left.x = clamp(left.x - directionX * push, 8, 92);
        left.y = clamp(left.y - directionY * push, 10, 90);
        right.x = clamp(right.x + directionX * push, 8, 92);
        right.y = clamp(right.y + directionY * push, 10, 90);
      }
    }

    resolvedNodes.forEach((node) => {
      const centerDistance = distanceBetween(node, CENTER);

      if (centerDistance < centerExclusionRadius) {
        const fallbackAngle = ((hashString(node.id) % 360) / 180) * Math.PI;
        const directionX = centerDistance === 0 ? Math.cos(fallbackAngle) : (node.x - CENTER.x) / centerDistance;
        const directionY = centerDistance === 0 ? Math.sin(fallbackAngle) : (node.y - CENTER.y) / centerDistance;
        const push = centerExclusionRadius - centerDistance;

        node.x = clamp(node.x + directionX * push, 8, 92);
        node.y = clamp(node.y + directionY * push, 10, 90);
      }

      node.x = clamp(node.x * 0.94 + node.collisionAnchor.x * 0.06, 8, 92);
      node.y = clamp(node.y * 0.94 + node.collisionAnchor.y * 0.06, 10, 90);
    });
  }

  return resolvedNodes;
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
  activeFocus,
  onFocusChange
}: CapabilityMapProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoverTarget, setHoverTarget] = useState<HoverTarget>(null);
  const [openHelper, setOpenHelper] = useState<HelperPanel | null>(null);
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
  const selectedCapabilityId = activeFocus.kind === 'capability' ? activeFocus.id : null;
  const selectedPrincipleId = activeFocus.kind === 'principle' ? activeFocus.id : null;
  const selectedExperienceId = activeFocus.kind === 'project' ? activeFocus.id : null;
  const focusedExperience = activeFocus.kind === 'project'
    ? experienceNodes.find((experience) => experience.id === activeFocus.id)
    : undefined;
  const centerPreviewExperience = activeFocus.kind === 'overview' && hoverTarget?.kind === 'project'
    ? experienceNodes.find((experience) => experience.id === hoverTarget.id)
    : undefined;
  const activeExperience = activeFocus.kind === 'project' ? focusedExperience : centerPreviewExperience;
  const activeCapabilityIds = activeExperience?.capabilityIds ?? [];
  const hasActiveFilter = Boolean(selectedCapabilityId || selectedPrincipleId || selectedCategory);
  const selectedCapability = selectedCapabilityId ? capabilityNodeMap[selectedCapabilityId] : undefined;
  const selectedCapabilityExperiences = selectedCapabilityId
    ? experienceNodes.filter((experience) => experience.capabilityIds.includes(selectedCapabilityId))
    : [];
  const selectedPrinciple = activeFocus.kind === 'principle'
    ? data.principles.find((principle) => principle.id === activeFocus.id)
    : undefined;
  const selectedPrincipleExperienceCount = activeFocus.kind === 'principle'
    ? experienceNodes.filter((experience) => experience.principles.includes(activeFocus.id)).length
    : 0;
  const coreClassName = [
    'constellation-core',
    centerPreviewExperience ? 'is-previewing' : '',
    !centerPreviewExperience ? `is-${activeFocus.kind}-focus` : ''
  ].filter(Boolean).join(' ');
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

  function toggleHelper(helper: HelperPanel) {
    setOpenHelper((currentHelper) => currentHelper === helper ? null : helper);
  }

  return (
    <section className="map-card" aria-label="Capability constellation">
      <div className="map-card__header constellation-heading">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>The constellation</h2>
          <p className="constellation-heading__subtitle">
            Experiences orbit capabilities. Hover an experience to preview its path; click it to open the full story.
          </p>
        </div>
        <p>{data.experiences.length} experiences · {data.capabilities.length} capabilities</p>
      </div>

      <div className="constellation-foundation">
        <div
          className="constellation-stage"
          aria-label="Interactive capability constellation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              onFocusChange({ kind: 'overview' });
            }
          }}
        >
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

          <div className="constellation-helper-bar" aria-label="Constellation helpers">
            {(Object.keys(HELPER_LABELS) as HelperPanel[]).map((helper) => (
              <button
                key={helper}
                className={`constellation-helper-button ${openHelper === helper ? 'is-active' : ''}`}
                type="button"
                aria-expanded={openHelper === helper}
                aria-controls={`constellation-helper-${helper}`}
                onClick={() => toggleHelper(helper)}
              >
                {HELPER_LABELS[helper]}
              </button>
            ))}
          </div>

          {openHelper === 'filters' && (
            <aside
              id="constellation-helper-filters"
              className="constellation-floating-panel constellation-floating-panel--filters constellation-rail"
              aria-label="Constellation filters"
            >
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
            </aside>
          )}

          {openHelper === 'legend' && (
            <aside
              id="constellation-helper-legend"
              className="constellation-floating-panel constellation-floating-panel--legend constellation-legend"
              aria-label="Constellation legend"
            >
              <p className="eyebrow">Legend</p>
              <h3>How to read it</h3>
              <div className="constellation-legend__grammar">
                <span>
                  <i className="constellation-legend__sample constellation-legend__sample--capability" aria-hidden="true" />
                  <strong>Capability anchor</strong>
                  <small>Large rounded rectangle.</small>
                </span>
                <span>
                  <i className="constellation-legend__sample constellation-legend__sample--project" aria-hidden="true" />
                  <strong>Project / experience</strong>
                  <small>Smaller pill with a glyph.</small>
                </span>
                <span>
                  <i className="constellation-legend__sample constellation-legend__sample--line" aria-hidden="true" />
                  <strong>Relationship</strong>
                  <small>Line showing a project strengthens a capability.</small>
                </span>
              </div>

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
            </aside>
          )}

          {openHelper === 'help' && (
            <aside
              id="constellation-helper-help"
              className="constellation-floating-panel constellation-floating-panel--help"
              aria-label="Constellation foundation"
            >
              <div className="constellation-hint">
                <strong>Interaction rule</strong>
                <p>Nothing disappears abruptly. Unrelated nodes fade so the selected path still lives inside the whole map.</p>
              </div>
              <div className="constellation-hint constellation-hint--right">
                <strong>Foundation note</strong>
                <p>This view intentionally uses deterministic layout math for now. Codex can later replace the positioning engine without changing the data model.</p>
              </div>
            </aside>
          )}

          <svg
            className="constellation-network"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
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
                const isActiveExperiencePath = isActiveExperience && activeExperience?.id === experience.id;
                const isFilterPath =
                  (isSelectedCapabilityEdge && experienceMatchesSelectedCapability(experience)) ||
                  (Boolean(selectedPrincipleId) && experienceMatchesSelectedPrinciple(experience));
                const isLit =
                  (isActiveExperiencePath && experience.capabilityIds.includes(capabilityId)) ||
                  isFilterPath;
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
                    className={`constellation-edge ${isLit ? 'is-lit' : ''} ${isActiveExperiencePath ? 'is-active-path' : ''} ${isFilterPath ? 'is-filter-path' : ''} ${isMuted ? 'is-muted' : ''}`}
                    data-category={capability.category}
                  />
                );
              })
            )}
          </svg>

          <div className={coreClassName} aria-label="Profile core">
            {centerPreviewExperience ? (
              <>
                <span className="constellation-core__project-glyph">{centerPreviewExperience.glyph}</span>
                <span className="constellation-core__label">Preview</span>
                <strong className="constellation-core__title">{centerPreviewExperience.title}</strong>
                <small className="constellation-core__meta">{centerPreviewExperience.type} · {centerPreviewExperience.period.label}</small>
                <p className="constellation-core__summary">{centerPreviewExperience.summary}</p>
                <small className="constellation-core__count">{centerPreviewExperience.capabilityIds.length} capabilities connected</small>
              </>
            ) : activeFocus.kind === 'project' && focusedExperience ? (
              <>
                <span className="constellation-core__project-glyph">{focusedExperience.glyph}</span>
                <span className="constellation-core__label">Selected project</span>
                <strong className="constellation-core__title">{focusedExperience.title}</strong>
                <small className="constellation-core__count">{focusedExperience.capabilityIds.length} capabilities connected</small>
              </>
            ) : activeFocus.kind === 'capability' && selectedCapability ? (
              <>
                <span className="constellation-core__initials">C</span>
                <span className="constellation-core__label">Capability focus</span>
                <strong className="constellation-core__title">{selectedCapability.label}</strong>
                <small className="constellation-core__meta">{selectedCapability.category}</small>
                <small className="constellation-core__count">{selectedCapabilityExperiences.length} projects connected</small>
              </>
            ) : activeFocus.kind === 'principle' && selectedPrinciple ? (
              <>
                <span className="constellation-core__initials">P</span>
                <span className="constellation-core__label">Principle focus</span>
                <strong className="constellation-core__title">{selectedPrinciple.label}</strong>
                <small className="constellation-core__count">{selectedPrincipleExperienceCount} experiences connected</small>
              </>
            ) : (
              <>
                <span className="constellation-core__initials">{getProfileInitials(data.profile.name)}</span>
                <span className="constellation-core__label">Mosaic</span>
                <strong className="constellation-core__title">Capability Atlas</strong>
                <small>Hover a project to preview its path. Click to open the full story.</small>
              </>
            )}
          </div>

          {capabilityNodes.map((capability) => {
            const isSelected = selectedCapabilityId === capability.id;
            const isHovered = hoverTarget?.kind === 'capability' && hoverTarget.id === capability.id;
            const isConnected = activeCapabilityIds.includes(capability.id);
            const isSelectedPath = isSelected || isConnected;
            const isDimmed = isCapabilityDimmed(capability);

            return (
              <button
                key={capability.id}
                className={`constellation-capability ${isSelected ? 'is-selected' : ''} ${isHovered ? 'is-hovered' : ''} ${isConnected ? 'is-connected' : ''} ${isSelectedPath ? 'is-selected-path' : ''} ${isDimmed ? 'is-dimmed' : ''}`}
                data-category={capability.category}
                style={{ left: `${capability.x}%`, top: `${capability.y}%` } as CSSProperties}
                type="button"
                onClick={() => onFocusChange(isSelected ? { kind: 'overview' } : { kind: 'capability', id: capability.id })}
                onFocus={() => setHoverTarget({ kind: 'capability', id: capability.id })}
                onBlur={() => setHoverTarget(null)}
                onMouseEnter={() => setHoverTarget({ kind: 'capability', id: capability.id })}
                onMouseLeave={() => setHoverTarget(null)}
                title={capability.description}
              >
                <span>{capability.label}</span>
                <small>{capability.usage} experience{capability.usage === 1 ? '' : 's'}</small>
              </button>
            );
          })}

          {experienceNodes.map((experience) => {
            const isSelected = selectedExperienceId === experience.id;
            const isHovered = hoverTarget?.kind === 'project' && hoverTarget.id === experience.id;
            const isDimmed = isExperienceDimmed(experience);
            const isRelatedToCapability = Boolean(selectedCapabilityId) && experienceMatchesSelectedCapability(experience);
            const isRelatedToPrinciple = Boolean(selectedPrincipleId) && experienceMatchesSelectedPrinciple(experience);
            const isSelectedPath = isSelected || isHovered || isRelatedToCapability || isRelatedToPrinciple;

            return (
              <button
                key={experience.id}
                className={`constellation-experience ${isSelected ? 'is-selected' : ''} ${isHovered ? 'is-hovered' : ''} ${isSelectedPath ? 'is-selected-path' : ''} ${isDimmed ? 'is-dimmed' : ''} ${isRelatedToCapability || isRelatedToPrinciple ? 'is-related' : ''}`}
                data-category={experience.dominantCategory}
                style={{ left: `${experience.x}%`, top: `${experience.y}%` } as CSSProperties}
                type="button"
                onClick={() => onFocusChange({ kind: 'project', id: experience.id })}
                onFocus={() => setHoverTarget({ kind: 'project', id: experience.id })}
                onBlur={() => setHoverTarget(null)}
                onMouseEnter={() => setHoverTarget({ kind: 'project', id: experience.id })}
                onMouseLeave={() => setHoverTarget(null)}
                aria-label={`Select experience: ${experience.title}`}
              >
                <span className="constellation-experience__glyph">{experience.glyph}</span>
                <span className="constellation-experience__story">
                  <strong>{experience.title}</strong>
                  <small>{experience.type} · {experience.period.label}</small>
                </span>
              </button>
            );
          })}

        </div>
      </div>
    </section>
  );
}
