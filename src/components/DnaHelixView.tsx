import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ActiveFocus, Capability, Experience, HoverTarget, MosaicData } from '../types';
import {
  capabilityUsage,
  experiencesByCapability,
  getCapabilityMap,
  getExperienceCapabilityIds
} from '../utils/mosaic';

type DnaHelixViewProps = {
  data: MosaicData;
  activeFocus: ActiveFocus;
  onFocusChange: (focus: ActiveFocus) => void;
};

type CapabilitySegment = Capability & {
  x: number;
  startX: number;
  endX: number;
  width: number;
  weight: number;
  usage: number;
  colorRgb: string;
};

type ProjectNode = Experience & {
  x: number;
  y: number;
  row: 'above' | 'below';
  capabilityIds: string[];
  glyph: string;
  dominantCategory?: string;
  colorRgb: string;
};

type BackgroundSignal = {
  x: number;
  y: number;
  size: number;
  opacity: number;
};

const CATEGORY_RGB: Record<string, string> = {
  'Core capability': '45, 212, 191',
  Technical: '56, 189, 248',
  Human: '251, 113, 133',
  Creative: '245, 158, 11'
};

const FALLBACK_RGB = ['125, 211, 252', '168, 85, 247', '74, 222, 128', '245, 158, 11'];
const TRACK_START = 7;
const TRACK_END = 93;
const HELIX_CENTER_Y = 52;
const HELIX_AMPLITUDE = 10.5;

function hashString(value: string): number {
  return Array.from(value).reduce((hash, character) => {
    return (hash * 31 + character.charCodeAt(0)) >>> 0;
  }, 7);
}

function categoryRgb(category: string | undefined, fallbackIndex = 0): string {
  return category ? CATEGORY_RGB[category] ?? FALLBACK_RGB[fallbackIndex % FALLBACK_RGB.length] : FALLBACK_RGB[fallbackIndex % FALLBACK_RGB.length];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function helixPhase(x: number): number {
  return ((x - TRACK_START) / (TRACK_END - TRACK_START)) * Math.PI * 6;
}

function helixY(x: number, strand: 'front' | 'back'): number {
  const sign = strand === 'front' ? 1 : -1;
  return HELIX_CENTER_Y + Math.sin(helixPhase(x)) * HELIX_AMPLITUDE * sign;
}

function buildHelixPath(strand: 'front' | 'back', startX = TRACK_START, endX = TRACK_END): string {
  const points = Array.from({ length: 90 }, (_, index) => {
    const x = startX + ((endX - startX) * index) / 89;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${helixY(x, strand).toFixed(2)}`;
  });

  return points.join(' ');
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

function getDominantCategory(capabilityMap: Record<string, Capability>, capabilityIds: string[]): string | undefined {
  return capabilityIds.map((capabilityId) => capabilityMap[capabilityId]?.category).find(Boolean);
}

function buildCapabilitySegments(data: MosaicData): CapabilitySegment[] {
  const usage = capabilityUsage(data);
  const totalWeight = data.capabilities.reduce((sum, capability) => sum + Math.max(1, usage[capability.id] ?? 0), 0);
  const trackWidth = TRACK_END - TRACK_START;
  let cursor = TRACK_START;

  return data.capabilities.map((capability, index) => {
    const weight = Math.max(1, usage[capability.id] ?? 0);
    const width = totalWeight > 0 ? (trackWidth * weight) / totalWeight : trackWidth / data.capabilities.length;
    const startX = cursor;
    const endX = index === data.capabilities.length - 1 ? TRACK_END : cursor + width;
    cursor = endX;

    return {
      ...capability,
      startX,
      endX,
      width: endX - startX,
      x: (startX + endX) / 2,
      weight,
      usage: usage[capability.id] ?? 0,
      colorRgb: categoryRgb(capability.category, index)
    };
  });
}

function pickRow(existing: ProjectNode[], x: number, preferred: 'above' | 'below'): { row: 'above' | 'below'; y: number } {
  const rows: Array<{ row: 'above' | 'below'; y: number }> = preferred === 'above'
    ? [
        { row: 'above', y: 17 },
        { row: 'above', y: 27 },
        { row: 'below', y: 78 },
        { row: 'below', y: 88 }
      ]
    : [
        { row: 'below', y: 78 },
        { row: 'below', y: 88 },
        { row: 'above', y: 17 },
        { row: 'above', y: 27 }
      ];

  const selected = rows.find((candidate) =>
    existing.every((node) => Math.abs(node.y - candidate.y) > 1 || Math.abs(node.x - x) > 10)
  );

  return selected ?? rows[0];
}

function buildProjectNodes(data: MosaicData, segments: CapabilitySegment[]): ProjectNode[] {
  const segmentMap = Object.fromEntries(segments.map((segment) => [segment.id, segment]));
  const capabilityMap = getCapabilityMap(data.capabilities);
  const sortedExperiences = [...data.experiences].sort((left, right) => Number(left.period.start) - Number(right.period.start));
  const placedNodes: ProjectNode[] = [];

  sortedExperiences.forEach((experience, index) => {
    const capabilityIds = getExperienceCapabilityIds(experience);
    const relatedSegments = capabilityIds
      .map((capabilityId) => segmentMap[capabilityId])
      .filter((segment): segment is CapabilitySegment => Boolean(segment));
    const seed = hashString(experience.id);
    const baseX = relatedSegments.length > 0
      ? relatedSegments.reduce((sum, segment) => sum + segment.x, 0) / relatedSegments.length
      : TRACK_START + ((TRACK_END - TRACK_START) * (index + 1)) / (sortedExperiences.length + 1);
    const jitter = ((seed % 700) / 100 - 3.5) * 0.65;
    const x = clamp(baseX + jitter, TRACK_START + 2, TRACK_END - 2);
    const preferred = index % 2 === 0 ? 'above' : 'below';
    const { row, y } = pickRow(placedNodes, x, preferred);
    const dominantCategory = getDominantCategory(capabilityMap, capabilityIds);
    const node: ProjectNode = {
      ...experience,
      x,
      y,
      row,
      capabilityIds,
      dominantCategory,
      glyph: getExperienceGlyph(experience),
      colorRgb: categoryRgb(dominantCategory, index)
    };

    placedNodes.push(node);
  });

  return placedNodes;
}

function buildBackgroundSignals(count: number): BackgroundSignal[] {
  return Array.from({ length: count }, (_, index) => {
    const seed = hashString(`dna-signal-${index}`);

    return {
      x: 2 + (seed % 9600) / 100,
      y: 4 + ((seed / 131) % 9000) / 100,
      size: 2 + (seed % 4),
      opacity: 0.06 + (seed % 10) / 100
    };
  });
}

function intersects(left: string[], right: string[]): boolean {
  return left.some((item) => right.includes(item));
}

function formatYearRange(experience: Experience): string {
  return experience.period.label || [experience.period.start, experience.period.end].filter(Boolean).join('–');
}

function countCapabilities(project: ProjectNode): number {
  return project.capabilityIds.length;
}

export function DnaHelixView({ data, activeFocus, onFocusChange }: DnaHelixViewProps) {
  const [hoverTarget, setHoverTarget] = useState<HoverTarget>(null);
  const segments = useMemo(() => buildCapabilitySegments(data), [data]);
  const segmentMap = useMemo(() => Object.fromEntries(segments.map((segment) => [segment.id, segment])), [segments]);
  const projects = useMemo(() => buildProjectNodes(data, segments), [data, segments]);
  const projectMap = useMemo(() => Object.fromEntries(projects.map((project) => [project.id, project])), [projects]);
  const groupsByCapability = useMemo(() => experiencesByCapability(data), [data]);
  const backgroundSignals = useMemo(() => buildBackgroundSignals(120), []);
  const selectedProject = activeFocus.kind === 'project' ? projectMap[activeFocus.id] : undefined;
  const selectedCapability = activeFocus.kind === 'capability' ? segmentMap[activeFocus.id] : undefined;
  const hoverProject = activeFocus.kind === 'overview' && hoverTarget?.kind === 'project'
    ? projectMap[hoverTarget.id]
    : undefined;
  const hoverCapability = activeFocus.kind === 'overview' && hoverTarget?.kind === 'capability'
    ? segmentMap[hoverTarget.id]
    : undefined;
  const activeProject = selectedProject ?? hoverProject;
  const activeCapability = selectedCapability ?? hoverCapability;
  const activeCapabilityIds = activeProject?.capabilityIds ?? (activeCapability ? [activeCapability.id] : []);
  const relatedProjectIds = activeCapability
    ? new Set((groupsByCapability[activeCapability.id] ?? []).map((experience) => experience.id))
    : new Set<string>();
  const hasFocus = activeFocus.kind !== 'overview' || Boolean(hoverTarget);
  const totalConnections = data.experiences.reduce((sum, experience) => sum + getExperienceCapabilityIds(experience).length, 0);

  function isProjectHighlighted(project: ProjectNode): boolean {
    if (activeProject) {
      return project.id === activeProject.id || intersects(project.capabilityIds, activeProject.capabilityIds);
    }

    if (activeCapability) {
      return project.capabilityIds.includes(activeCapability.id);
    }

    return true;
  }

  function isSegmentHighlighted(segment: CapabilitySegment): boolean {
    if (activeProject) {
      return activeProject.capabilityIds.includes(segment.id);
    }

    if (activeCapability) {
      return activeCapability.id === segment.id;
    }

    return true;
  }

  function renderPeekDock() {
    if (hoverProject) {
      return (
        <aside className="dna-peek-dock" aria-live="polite">
          <p className="eyebrow">Project signal</p>
          <h3>{hoverProject.title}</h3>
          <p>{hoverProject.summary}</p>
          <dl>
            <div>
              <dt>When</dt>
              <dd>{formatYearRange(hoverProject)}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{hoverProject.type}</dd>
            </div>
            <div>
              <dt>DNA links</dt>
              <dd>{countCapabilities(hoverProject)} capabilities</dd>
            </div>
          </dl>
        </aside>
      );
    }

    if (hoverCapability) {
      return (
        <aside className="dna-peek-dock" aria-live="polite">
          <p className="eyebrow">Capability strand</p>
          <h3>{hoverCapability.label}</h3>
          <p>{hoverCapability.description}</p>
          <dl>
            <div>
              <dt>Family</dt>
              <dd>{hoverCapability.category}</dd>
            </div>
            <div>
              <dt>Projects</dt>
              <dd>{hoverCapability.usage}</dd>
            </div>
          </dl>
        </aside>
      );
    }

    return (
      <aside className="dna-peek-dock dna-peek-dock--guide">
        <p className="eyebrow">How to read your DNA</p>
        <h3>Capabilities are the strands. Experiences shape them.</h3>
        <p>Hover a project to see which capability segments it strengthened. Click a project or skill to open the detail drawer below.</p>
      </aside>
    );
  }

  return (
    <section className="dna-view map-card" aria-label="Horizontal DNA capability map">
      <header className="dna-view__header">
        <div>
          <p className="eyebrow">Overview · DNA helix</p>
          <h2>Your capability DNA</h2>
          <p>Skills become the strand. Projects orbit the strand and show how your experience shaped it.</p>
        </div>
        <div className="dna-view__stats" aria-label="DNA map stats">
          <span><strong>{data.experiences.length}</strong> experiences</span>
          <span><strong>{data.capabilities.length}</strong> capabilities</span>
          <span><strong>{totalConnections}</strong> links</span>
        </div>
      </header>

      <div
        className="dna-canvas"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onFocusChange({ kind: 'overview' });
          }
        }}
      >
        <div className="dna-canvas__atmosphere" aria-hidden="true" />
        {backgroundSignals.map((signal, index) => (
          <span
            key={index}
            className="dna-spark"
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

        <svg className="dna-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <filter id="dna-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="dna-strand-front" x1="0" x2="1" y1="0" y2="0">
              {segments.map((segment) => (
                <stop key={`${segment.id}-front-start`} offset={`${((segment.startX - TRACK_START) / (TRACK_END - TRACK_START)) * 100}%`} stopColor={`rgb(${segment.colorRgb})`} />
              ))}
              {segments.map((segment) => (
                <stop key={`${segment.id}-front-end`} offset={`${((segment.endX - TRACK_START) / (TRACK_END - TRACK_START)) * 100}%`} stopColor={`rgb(${segment.colorRgb})`} />
              ))}
            </linearGradient>
          </defs>

          {segments.map((segment) => {
            const isActive = isSegmentHighlighted(segment);
            return (
              <rect
                key={`${segment.id}-band`}
                className={`dna-segment-band ${isActive ? 'is-active' : ''} ${hasFocus && !isActive ? 'is-muted' : ''}`}
                x={segment.startX}
                y="36"
                width={segment.width}
                height="32"
                rx="9"
                style={{ '--signal-rgb': segment.colorRgb } as CSSProperties}
              />
            );
          })}

          {Array.from({ length: 37 }, (_, index) => {
            const x = TRACK_START + ((TRACK_END - TRACK_START) * index) / 36;
            const relatedSegment = segments.find((segment) => x >= segment.startX && x <= segment.endX) ?? segments[0];
            const active = relatedSegment ? isSegmentHighlighted(relatedSegment) : true;
            return (
              <line
                key={`rung-${index}`}
                className={`dna-rung ${active ? 'is-active' : ''} ${hasFocus && !active ? 'is-muted' : ''}`}
                x1={x}
                y1={helixY(x, 'front')}
                x2={x}
                y2={helixY(x, 'back')}
                style={{ '--signal-rgb': relatedSegment?.colorRgb ?? '125, 211, 252' } as CSSProperties}
              />
            );
          })}

          <path className="dna-strand dna-strand--front" d={buildHelixPath('front')} />
          <path className="dna-strand dna-strand--back" d={buildHelixPath('back')} />

          {projects.flatMap((project) =>
            project.capabilityIds.map((capabilityId) => {
              const segment = segmentMap[capabilityId];

              if (!segment) {
                return null;
              }

              const isProjectPath = activeProject?.id === project.id;
              const isCapabilityPath = activeCapability?.id === capabilityId;
              const isRelatedPath = activeCapability ? relatedProjectIds.has(project.id) && isCapabilityPath : false;
              const isActive = isProjectPath || isCapabilityPath || isRelatedPath;
              const isMuted = hasFocus && !isActive;
              const controlY = project.row === 'above' ? project.y + 16 : project.y - 16;

              return (
                <path
                  key={`${project.id}-${capabilityId}`}
                  className={`dna-connection ${isActive ? 'is-active' : ''} ${isMuted ? 'is-muted' : ''}`}
                  d={`M ${project.x.toFixed(2)} ${project.y.toFixed(2)} C ${project.x.toFixed(2)} ${controlY.toFixed(2)}, ${segment.x.toFixed(2)} ${controlY.toFixed(2)}, ${segment.x.toFixed(2)} ${HELIX_CENTER_Y.toFixed(2)}`}
                  style={{ '--signal-rgb': segment.colorRgb } as CSSProperties}
                />
              );
            })
          )}
        </svg>

        {segments.map((segment) => {
          const isSelected = activeFocus.kind === 'capability' && activeFocus.id === segment.id;
          const isHovered = hoverTarget?.kind === 'capability' && hoverTarget.id === segment.id;
          const isActive = isSegmentHighlighted(segment);

          return (
            <button
              key={segment.id}
              type="button"
              className={`dna-capability ${isSelected ? 'is-selected' : ''} ${isHovered ? 'is-hovered' : ''} ${isActive ? 'is-active' : ''} ${hasFocus && !isActive ? 'is-muted' : ''}`}
              data-category={segment.category}
              style={{ left: `${segment.x}%`, top: `${HELIX_CENTER_Y}%`, '--signal-rgb': segment.colorRgb } as CSSProperties}
              onClick={(event) => {
                event.stopPropagation();
                onFocusChange(isSelected ? { kind: 'overview' } : { kind: 'capability', id: segment.id });
              }}
              onMouseEnter={() => setHoverTarget({ kind: 'capability', id: segment.id })}
              onMouseLeave={() => setHoverTarget(null)}
              onFocus={() => setHoverTarget({ kind: 'capability', id: segment.id })}
              onBlur={() => setHoverTarget(null)}
              title={segment.description}
            >
              <span className="dna-capability__icon">⌁</span>
              <span>
                <strong>{segment.label}</strong>
                <small>{segment.usage} experience{segment.usage === 1 ? '' : 's'}</small>
              </span>
            </button>
          );
        })}

        {projects.map((project) => {
          const isSelected = activeFocus.kind === 'project' && activeFocus.id === project.id;
          const isHovered = hoverTarget?.kind === 'project' && hoverTarget.id === project.id;
          const isActive = isProjectHighlighted(project);

          return (
            <button
              key={project.id}
              type="button"
              className={`dna-project ${isSelected ? 'is-selected' : ''} ${isHovered ? 'is-hovered' : ''} ${isActive ? 'is-active' : ''} ${hasFocus && !isActive ? 'is-muted' : ''}`}
              data-category={project.dominantCategory}
              style={{ left: `${project.x}%`, top: `${project.y}%`, '--signal-rgb': project.colorRgb } as CSSProperties}
              onClick={(event) => {
                event.stopPropagation();
                onFocusChange({ kind: 'project', id: project.id });
              }}
              onMouseEnter={() => setHoverTarget({ kind: 'project', id: project.id })}
              onMouseLeave={() => setHoverTarget(null)}
              onFocus={() => setHoverTarget({ kind: 'project', id: project.id })}
              onBlur={() => setHoverTarget(null)}
              title={`${project.title} · ${project.type} · ${formatYearRange(project)}`}
            >
              <span className="dna-project__glyph">{project.glyph}</span>
              <span className="dna-project__text">
                <strong>{project.title}</strong>
                <small>{project.type} · {formatYearRange(project)}</small>
              </span>
            </button>
          );
        })}

        {renderPeekDock()}

        <div className="dna-axis" aria-hidden="true">
          <span>Foundation</span>
          <span>Exploration</span>
          <span>Growth</span>
          <span>Impact</span>
          <span>Future</span>
        </div>
      </div>

      <footer className="dna-legend-strip" aria-label="DNA map legend">
        <div>
          <strong>Capability segment</strong>
          <span>Colored DNA bands show your skill areas. Wider bands have more experience links.</span>
        </div>
        <div>
          <strong>Project node</strong>
          <span>Projects sit above/below the strand and connect to the capabilities they shaped.</span>
        </div>
        <div>
          <strong>Relationship line</strong>
          <span>Hover or click to brighten the relevant path. Unrelated signals fade, not disappear.</span>
        </div>
      </footer>
    </section>
  );
}
