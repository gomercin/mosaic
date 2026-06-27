export type ViewMode = 'overview' | 'timeline' | 'studio';

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
  rawNarrative: string;
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
  visibility: Visibility;
};

export type MosaicData = {
  profile: Profile;
  capabilities: Capability[];
  principles: Principle[];
  experiences: Experience[];
};
