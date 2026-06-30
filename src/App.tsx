import { useEffect, useMemo, useState } from 'react';
import { DnaHelixView } from './components/DnaHelixView';
import { ExperiencePanel } from './components/ExperiencePanel';
import { Header } from './components/Header';
import { PrinciplesView } from './components/PrinciplesView';
import { Studio } from './components/Studio';
import { TimelineView } from './components/TimelineView';
import { loadMosaicData } from './data/loadMosaic';
import type { ActiveFocus, Experience, MosaicData, ViewMode } from './types';
import {
  experienceMatchesFilters,
  experiencesByCapability,
  experiencesByPrinciple,
  revealedPatternsByExperience
} from './utils/mosaic';

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

export function App() {
  const [data, setData] = useState<MosaicData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [activeFocus, setActiveFocus] = useState<ActiveFocus>({ kind: 'overview' });

  useEffect(() => {
    loadMosaicData()
      .then((loadedData) => setData(loadedData))
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : 'Unknown load error');
      });
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActiveFocus({ kind: 'overview' });
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const selectedCapabilityId = activeFocus.kind === 'capability' ? activeFocus.id : null;
  const selectedPrincipleId = activeFocus.kind === 'principle' ? activeFocus.id : null;
  const selectedExperienceId = activeFocus.kind === 'project' ? activeFocus.id : null;

  const selectedExperience = useMemo(() => {
    if (!data || !selectedExperienceId) {
      return null;
    }

    return data.experiences.find((experience) => experience.id === selectedExperienceId) ?? null;
  }, [data, selectedExperienceId]);

  const visibleExperiences = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.experiences.filter((experience) =>
      experienceMatchesFilters(experience, {
        capabilityId: selectedCapabilityId,
        principleId: selectedPrincipleId
      })
    );
  }, [data, selectedCapabilityId, selectedPrincipleId]);

  const capabilityGroups = useMemo(() => data ? experiencesByCapability(data) : {}, [data]);
  const principleGroups = useMemo(() => data ? experiencesByPrinciple(data) : {}, [data]);

  const activeFilterLabels = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      data.capabilities.find((capability) => capability.id === selectedCapabilityId)?.label,
      data.principles.find((principle) => principle.id === selectedPrincipleId)?.label
    ].filter((label): label is string => Boolean(label));
  }, [data, selectedCapabilityId, selectedPrincipleId]);

  function handleExperienceAdded(experience: Experience) {
    setData((currentData) => {
      if (!currentData) {
        return currentData;
      }

      return {
        ...currentData,
        experiences: [experience, ...currentData.experiences]
      };
    });
    setViewMode('overview');
    setActiveFocus({ kind: 'project', id: experience.id });
  }

  function handleDataImported(importedData: MosaicData) {
    setData(importedData);
    setViewMode('overview');
    setActiveFocus({ kind: 'overview' });
  }

  function handleViewModeChange(nextViewMode: ViewMode) {
    setViewMode(nextViewMode);
  }

  function renderOverviewInspector() {
    if (!data || activeFocus.kind === 'overview') {
      return null;
    }

    if (activeFocus.kind === 'project') {
      return (
        <div className="overview-detail-drawer" aria-label="Selected project story">
          <div className="overview-detail-drawer__bar">
            <p className="eyebrow">Project focus</p>
            <button
              type="button"
              className="overview-detail-drawer__close"
              onClick={() => setActiveFocus({ kind: 'overview' })}
            >
              Close
            </button>
          </div>
          <ExperiencePanel
            data={data}
            experience={selectedExperience}
            selectedCapabilityId={selectedCapabilityId}
          />
        </div>
      );
    }

    if (activeFocus.kind === 'capability') {
      const capability = data.capabilities.find((item) => item.id === activeFocus.id);
      const connectedExperiences = capabilityGroups[activeFocus.id] ?? [];

      return (
        <aside className="overview-detail-drawer overview-inspector" aria-label="Connected projects inspector">
          <div className="overview-detail-drawer__bar">
            <p className="eyebrow">Capability focus</p>
            <button
              type="button"
              className="overview-detail-drawer__close"
              onClick={() => setActiveFocus({ kind: 'overview' })}
            >
              Close
            </button>
          </div>
          <section className="overview-inspector__body">
            <p className="eyebrow">Projects connected to</p>
            <h2>{capability?.label ?? activeFocus.id}</h2>
            {capability?.description && <p>{capability.description}</p>}
            <div className="overview-inspector__list">
              {connectedExperiences.map((experience) => (
                <button
                  key={experience.id}
                  type="button"
                  onClick={() => setActiveFocus({ kind: 'project', id: experience.id })}
                >
                  <span className="overview-inspector__glyph">{getExperienceGlyph(experience)}</span>
                  <span>
                    <strong>{experience.title}</strong>
                    <small>{experience.type} · {experience.period.label}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      );
    }

    const principle = data.principles.find((item) => item.id === activeFocus.id);
    const connectedExperiences = principleGroups[activeFocus.id] ?? [];

    return (
      <aside className="overview-detail-drawer overview-inspector" aria-label="Principle and patterns inspector">
        <div className="overview-detail-drawer__bar">
          <p className="eyebrow">Principle focus</p>
          <button
            type="button"
            className="overview-detail-drawer__close"
            onClick={() => setActiveFocus({ kind: 'overview' })}
          >
            Close
          </button>
        </div>
        <section className="overview-inspector__body">
          <p className="eyebrow">Principle</p>
          <h2>{principle?.label ?? activeFocus.id}</h2>
          {principle?.description && <p>{principle.description}</p>}
          <div className="overview-inspector__list">
            {connectedExperiences.map((experience) => (
              <button
                key={experience.id}
                type="button"
                onClick={() => setActiveFocus({ kind: 'project', id: experience.id })}
              >
                <span className="overview-inspector__glyph">{getExperienceGlyph(experience)}</span>
                <span>
                  <strong>{experience.title}</strong>
                  <small>{experience.type} · {experience.period.label}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="overview-inspector__patterns">
            {connectedExperiences.flatMap((experience) =>
              revealedPatternsByExperience(experience).map((pattern) => (
                <blockquote key={`${experience.id}-${pattern}`}>
                  <p>{pattern}</p>
                  <cite>{experience.title}</cite>
                </blockquote>
              ))
            )}
          </div>
        </section>
      </aside>
    );
  }

  if (loadError) {
    return (
      <main className="app-shell app-shell--centered">
        <section className="empty-state">
          <p className="eyebrow">Mosaic</p>
          <h1>Could not load the sample data.</h1>
          <p>{loadError}</p>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="app-shell app-shell--centered">
        <section className="empty-state">
          <p className="eyebrow">Mosaic</p>
          <h1>Loading capability atlas…</h1>
        </section>
      </main>
    );
  }

  return (
    <main className={`app-shell ${viewMode === 'overview' ? 'app-shell--canvas' : ''}`}>
      <Header
        profile={data.profile}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        activeFilterLabels={activeFilterLabels}
        onClearFilters={() => {
          setActiveFocus({ kind: 'overview' });
        }}
        selectedCount={visibleExperiences.length}
      />

      {viewMode === 'overview' && (
        <section className="workspace workspace--overview workspace--overview-canvas workspace--dna">
          <DnaHelixView
            data={data}
            activeFocus={activeFocus}
            onFocusChange={setActiveFocus}
          />
          {renderOverviewInspector()}
        </section>
      )}

      {viewMode === 'timeline' && (
        <section className="workspace workspace--timeline">
          <TimelineView
            data={data}
            selectedCapabilityId={selectedCapabilityId}
            selectedPrincipleId={selectedPrincipleId}
            selectedExperienceId={selectedExperienceId}
            onExperienceSelect={(experienceId) => setActiveFocus({ kind: 'project', id: experienceId })}
          />
          <ExperiencePanel
            data={data}
            experience={selectedExperience}
            selectedCapabilityId={selectedCapabilityId}
          />
        </section>
      )}

      {viewMode === 'principles' && (
        <section className="workspace workspace--principles">
          <PrinciplesView
            data={data}
            selectedPrincipleId={selectedPrincipleId}
            selectedExperienceId={selectedExperienceId}
            onPrincipleSelect={(principleId) =>
              setActiveFocus(principleId ? { kind: 'principle', id: principleId } : { kind: 'overview' })
            }
            onExperienceSelect={(experienceId) => setActiveFocus({ kind: 'project', id: experienceId })}
          />
          <ExperiencePanel
            data={data}
            experience={selectedExperience}
            selectedCapabilityId={selectedCapabilityId}
          />
        </section>
      )}

      {viewMode === 'studio' && (
        <Studio
          data={data}
          onExperienceAdded={handleExperienceAdded}
          onDataImported={handleDataImported}
        />
      )}
    </main>
  );
}
