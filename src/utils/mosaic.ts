import type { Capability, Experience, MosaicData, Principle } from '../types';

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

export function capabilityUsage(data: MosaicData): Record<string, number> {
  return data.experiences.reduce<Record<string, number>>((usage, experience) => {
    getExperienceCapabilityIds(experience).forEach((capabilityId) => {
      usage[capabilityId] = (usage[capabilityId] ?? 0) + 1;
    });

    return usage;
  }, {});
}

export function experienceMatchesCapability(
  experience: Experience,
  selectedCapabilityId: string | null
): boolean {
  return !selectedCapabilityId || getExperienceCapabilityIds(experience).includes(selectedCapabilityId);
}

export function sortExperiencesByStart(experiences: Experience[]): Experience[] {
  return [...experiences].sort((a, b) => Number(a.period.start) - Number(b.period.start));
}
