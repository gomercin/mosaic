import { useEffect, useMemo, useState } from 'react';
import { CapabilityMap } from './components/CapabilityMap';
import { ExperiencePanel } from './components/ExperiencePanel';
import { Header } from './components/Header';
import { PrinciplesView } from './components/PrinciplesView';
import { Studio } from './components/Studio';
import { TimelineView } from './components/TimelineView';
import { loadMosaicData } from './data/loadMosaic';
import type { Experience, MosaicData, ViewMode } from './types';
import { experienceMatchesFilters } from './utils/mosaic';

export function App() {
  const [data, setData] = useState<MosaicData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedCapabilityId, setSelectedCapabilityId] = useState<string | null>(null);
  const [selectedPrincipleId, setSelectedPrincipleId] = useState<string | null>(null);
  const [selectedExperienceId, setSelectedExperienceId] = useState<string | null>(null);

  useEffect(() => {
    loadMosaicData()
      .then((loadedData) => {
        setData(loadedData);
        setSelectedExperienceId(loadedData.experiences[0]?.id ?? null);
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : 'Unknown load error');
      });
  }, []);

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
    setSelectedExperienceId(experience.id);
    setViewMode('overview');
  }

  function handleDataImported(importedData: MosaicData) {
    setData(importedData);
    setSelectedCapabilityId(null);
    setSelectedPrincipleId(null);
    setSelectedExperienceId(importedData.experiences[0]?.id ?? null);
    setViewMode('overview');
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
    <main className="app-shell">
      <Header
        profile={data.profile}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        activeFilterLabels={activeFilterLabels}
        onClearFilters={() => {
          setSelectedCapabilityId(null);
          setSelectedPrincipleId(null);
        }}
        selectedCount={visibleExperiences.length}
      />

      {viewMode === 'overview' && (
        <section className="workspace workspace--overview">
          <CapabilityMap
            data={data}
            selectedCapabilityId={selectedCapabilityId}
            selectedPrincipleId={selectedPrincipleId}
            selectedExperienceId={selectedExperienceId}
            onCapabilitySelect={setSelectedCapabilityId}
            onExperienceSelect={setSelectedExperienceId}
          />
          <ExperiencePanel
            data={data}
            experience={selectedExperience}
            selectedCapabilityId={selectedCapabilityId}
          />
        </section>
      )}

      {viewMode === 'timeline' && (
        <section className="workspace workspace--timeline">
          <TimelineView
            data={data}
            selectedCapabilityId={selectedCapabilityId}
            selectedPrincipleId={selectedPrincipleId}
            selectedExperienceId={selectedExperienceId}
            onExperienceSelect={setSelectedExperienceId}
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
            onPrincipleSelect={setSelectedPrincipleId}
            onExperienceSelect={setSelectedExperienceId}
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
