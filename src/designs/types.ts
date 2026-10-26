export type Audience = 'explore' | 'client' | 'technical' | 'sales';
export type DesignKind = 'monograph' | 'studio';
export type DesignCase = {
  id: string;
  title: string;
  kicker: string;
  organization: string;
  period: string;
  summary: string;
  contribution: string;
  outcome: string;
  limit: string;
  tools: string[];
  category: 'investigate' | 'build' | 'enable';
  visual: 'device' | 'structure' | 'workflow';
  details: string[];
  sourceLabel: string;
};
export type DesignProfile = {
  private: boolean;
  name: string;
  role: string;
  headline: [string, string];
  intro: string;
  context: string;
  strengths: string[];
  cases: DesignCase[];
  technologies: { name: string; context: string; caseIds: string[] }[];
  contact?: { label: string; href: string };
};
export type DesignProps = {
  profile: DesignProfile;
  audience: Audience;
  onAudience: (audience: Audience) => void;
  onCase: (id: string) => void;
};
