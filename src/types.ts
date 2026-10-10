export type ViewMode = 'overview' | 'timeline' | 'principles' | 'studio';

export type ActiveFocus =
  | { kind: 'overview' }
  | { kind: 'project'; id: string }
  | { kind: 'capability'; id: string }
  | { kind: 'principle'; id: string };

export type HoverTarget =
  | { kind: 'project'; id: string }
  | { kind: 'capability'; id: string }
  | null;

export type Profile = {
  name: string;
  title: string;
  tagline: string;
  location?: string;
  summary: string;
};

export type Capability = {
  id: string;
  label: string;
  category: string;
  description: string;
};

export type Principle = {
  id: string;
  label: string;
  description: string;
};

export type ExperiencePeriod = {
  start: string;
  end?: string;
  label: string;
};

export type Visibility = 'public' | 'private' | 'draft';

export type Evidence = {
  label: string;
  url: string;
};

export type Experience = {
  id: string;
  title: string;
  type: string;
  company?: string;
  period: ExperiencePeriod;
  summary: string;
  rawNarrative?: string;
  publicNarrative?: string;
  privateNotes?: string;
  challenge?: string;
  approach?: string;
  impact?: string;
  strengthenedCapabilities: string[];
  skills?: string[];
  revealedPatterns: string[];
  tools: string[];
  principles: string[];
  evidence?: Evidence[];
  tone?: string[];
  visibility?: Visibility;
};

export type MosaicData = {
  profile: Profile;
  capabilities: Capability[];
  principles: Principle[];
  experiences: Experience[];
  datasetKind?: 'synthetic' | 'curated';
  evidenceEpisodes?: EvidenceEpisode[];
  evidenceLinks?: EvidenceLink[];
};


export type PublicationApproval = {
  status: 'approved';
  reviewer: string;
  revision: string;
};

export type EvidenceEpisode = {
  id: string;
  experienceId: string;
  summary: string;
  myContribution: string;
  teamContribution: string;
  aiContribution: string;
  result: string;
  limitation: string;
  outcomeStatus: 'delivered' | 'stopped' | 'idea';
};

export type EvidenceLink = {
  id: string;
  capabilityId: string;
  experienceId: string;
  episodeId: string;
  explanation: string;
  signalType: 'strengthened' | 'demonstrated' | 'candidate';
  confidence: 'high' | 'medium' | 'low';
  confirmedByUser: boolean;
};

// Publication data has its own versioned contract. Authoring fields never cross it.
export type PublicExperience = Omit<Pick<Experience,
  'id' | 'title' | 'type' | 'company' | 'period' | 'summary' | 'publicNarrative' |
  'challenge' | 'approach' | 'impact' | 'strengthenedCapabilities' |
  'revealedPatterns' | 'tools' | 'principles' | 'tone'
>, 'publicNarrative' | 'challenge' | 'approach' | 'impact'> & {
  publicNarrative: string;
  challenge: string;
  approach: string;
  impact: string;
};

export type PublicMosaicData = {
  schemaVersion: '1.0';
  datasetKind: 'synthetic' | 'curated';
  publication: PublicationApproval;
  profile: Profile;
  capabilities: Capability[];
  principles: Principle[];
  experiences: PublicExperience[];
  evidenceEpisodes: EvidenceEpisode[];
  evidenceLinks: EvidenceLink[];
};
