import type { Capability, Experience, MosaicData, Principle } from '../types';

export type ExperienceFilters = {
  capabilityId?: string | null;
  principleId?: string | null;
};

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getCapabilityMap(capabilities: Capability[]): Record<string, Capability> {
  return Object.fromEntries(capabilities.map((capability) => [capability.id, capability]));
}

export function getPrincipleMap(principles: Principle[]): Record<string, Principle> {
  return Object.fromEntries(principles.map((principle) => [principle.id, principle]));
}

export function getExperienceCapabilityIds(experience: Experience): string[] {
  const strengthenedCapabilities = experience.strengthenedCapabilities ?? [];

  return strengthenedCapabilities.length > 0
    ? strengthenedCapabilities
    : experience.skills ?? [];
}

export function getExperiencePrincipleIds(experience: Experience): string[] {
  return experience.principles ?? [];
}

export function capabilityUsage(data: MosaicData): Record<string, number> {
  return data.experiences.reduce<Record<string, number>>((usage, experience) => {
    getExperienceCapabilityIds(experience).forEach((capabilityId) => {
      usage[capabilityId] = (usage[capabilityId] ?? 0) + 1;
    });

    return usage;
  }, {});
}

export function principleUsage(data: MosaicData): Record<string, number> {
  return data.experiences.reduce<Record<string, number>>((usage, experience) => {
    getExperiencePrincipleIds(experience).forEach((principleId) => {
      usage[principleId] = (usage[principleId] ?? 0) + 1;
    });

    return usage;
  }, {});
}

export function experiencesByCapability(data: MosaicData): Record<string, Experience[]> {
  return data.capabilities.reduce<Record<string, Experience[]>>((groups, capability) => {
    groups[capability.id] = data.experiences.filter((experience) =>
      getExperienceCapabilityIds(experience).includes(capability.id)
    );

    return groups;
  }, {});
}

export function experiencesByPrinciple(data: MosaicData): Record<string, Experience[]> {
  return data.principles.reduce<Record<string, Experience[]>>((groups, principle) => {
    groups[principle.id] = data.experiences.filter((experience) =>
      getExperiencePrincipleIds(experience).includes(principle.id)
    );

    return groups;
  }, {});
}

export function revealedPatternsByExperience(experience: Experience): string[] {
  return experience.revealedPatterns ?? [];
}

export function getCapabilityCategory(
  capabilities: Capability[],
  capabilityId: string
): string | undefined {
  return capabilities.find((capability) => capability.id === capabilityId)?.category;
}

export function getDominantCapabilityCategory(
  capabilities: Capability[],
  experience: Experience
): string | undefined {
  const capabilityIds = getExperienceCapabilityIds(experience);

  if (capabilityIds.length === 0) {
    return undefined;
  }

  return getCapabilityCategory(capabilities, capabilityIds[0]);
}

export function experienceMatchesFilters(
  experience: Experience,
  filters: ExperienceFilters
): boolean {
  const matchesCapability =
    !filters.capabilityId || getExperienceCapabilityIds(experience).includes(filters.capabilityId);
  const matchesPrinciple =
    !filters.principleId || getExperiencePrincipleIds(experience).includes(filters.principleId);

  return matchesCapability && matchesPrinciple;
}

export function experienceMatchesCapability(
  experience: Experience,
  selectedCapabilityId: string | null
): boolean {
  return experienceMatchesFilters(experience, { capabilityId: selectedCapabilityId });
}

export function sortExperiencesByStart(experiences: Experience[]): Experience[] {
  return [...experiences].sort((a, b) => Number(a.period.start) - Number(b.period.start));
}
