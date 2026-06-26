import type { Profile, ViewMode } from '../types';

const modes: Array<{ id: ViewMode; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'studio', label: 'Studio' }
];

type HeaderProps = {
  profile: Profile;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectedCapabilityId: string | null;
  onClearCapability: () => void;
  selectedCount: number;
};

export function Header({
  profile,
  viewMode,
  onViewModeChange,
  selectedCapabilityId,
  onClearCapability,
  selectedCount
}: HeaderProps) {
  return (
    <header className="hero">
      <div>
        <p className="eyebrow">Mosaic · Capability Atlas</p>
        <h1>{profile.name}</h1>
        <p className="hero__title">{profile.title}</p>
        <p className="hero__summary">{profile.summary}</p>
      </div>

      <div className="hero__actions">
        <nav className="mode-switch" aria-label="View mode">
          {modes.map((mode) => (
            <button
              key={mode.id}
              className={mode.id === viewMode ? 'is-active' : ''}
              onClick={() => onViewModeChange(mode.id)}
              type="button"
            >
              {mode.label}
            </button>
          ))}
        </nav>

        {selectedCapabilityId && (
          <button className="filter-pill" type="button" onClick={onClearCapability}>
            Showing {selectedCount} related experience{selectedCount === 1 ? '' : 's'} · clear filter
          </button>
        )}
      </div>
    </header>
  );
}
