import type { MosaicData } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateString(value: unknown, path: string, errors: string[]) {
  if (!isNonEmptyString(value)) {
    errors.push(`${path} must be a non-empty string`);
  }
}

function validateOptionalString(value: unknown, path: string, errors: string[]) {
  if (value !== undefined) {
    validateString(value, path, errors);
  }
}

function validateStringArray(value: unknown, path: string, errors: string[]) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }

  value.forEach((item, index) => validateString(item, `${path}[${index}]`, errors));
}

function validateOptionalStringArray(value: unknown, path: string, errors: string[]) {
  if (value !== undefined) {
    validateStringArray(value, path, errors);
  }
}

function collectIds(items: unknown, path: string, errors: string[]): Set<string> {
  const ids = new Set<string>();

  if (!Array.isArray(items)) {
    errors.push(`${path} must be an array`);
    return ids;
  }

  items.forEach((item, index) => {
    if (!isRecord(item)) {
      errors.push(`${path}[${index}] must be an object`);
      return;
    }

    if (!isNonEmptyString(item.id)) {
      errors.push(`${path}[${index}].id must be a non-empty string`);
      return;
    }

    if (ids.has(item.id)) {
      errors.push(`${path} contains duplicate id: ${item.id}`);
    }

    ids.add(item.id);
  });

  return ids;
}

function validateProfile(profile: unknown, errors: string[]) {
  if (!isRecord(profile)) {
    errors.push('profile must be an object');
    return;
  }

  validateString(profile.name, 'profile.name', errors);
  validateString(profile.title, 'profile.title', errors);
  validateString(profile.tagline, 'profile.tagline', errors);
  validateString(profile.summary, 'profile.summary', errors);
}

function validateCapabilities(capabilities: unknown, errors: string[]): Set<string> {
  const ids = collectIds(capabilities, 'capabilities', errors);

  if (!Array.isArray(capabilities)) {
    return ids;
  }

  if (capabilities.length === 0) {
    errors.push('capabilities must contain at least one item');
  }

  capabilities.forEach((capability, index) => {
    if (!isRecord(capability)) {
      return;
    }

    validateString(capability.label, `capabilities[${index}].label`, errors);
    validateString(capability.category, `capabilities[${index}].category`, errors);
    validateString(capability.description, `capabilities[${index}].description`, errors);
  });

  return ids;
}

function validatePrinciples(principles: unknown, errors: string[]): Set<string> {
  const ids = collectIds(principles, 'principles', errors);

  if (!Array.isArray(principles)) {
    return ids;
  }

  principles.forEach((principle, index) => {
    if (!isRecord(principle)) {
      return;
    }

    validateString(principle.label, `principles[${index}].label`, errors);
    validateString(principle.description, `principles[${index}].description`, errors);
  });

  return ids;
}

function validateEvidence(value: unknown, path: string, errors: string[]) {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }

  value.forEach((evidence, index) => {
    const evidencePath = `${path}[${index}]`;

    if (!isRecord(evidence)) {
      errors.push(`${evidencePath} must be an object`);
      return;
    }

    validateString(evidence.label, `${evidencePath}.label`, errors);
    validateString(evidence.url, `${evidencePath}.url`, errors);

    if (isNonEmptyString(evidence.url)) {
      try {
        const url = new URL(evidence.url);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          errors.push(`${evidencePath}.url must be an http(s) URL`);
        }
      } catch {
        errors.push(`${evidencePath}.url must be a valid URL`);
      }
    }
  });
}

function validateExperiences(
  experiences: unknown,
  capabilityIds: Set<string>,
  principleIds: Set<string>,
  errors: string[]
): Set<string> {
  const ids = collectIds(experiences, 'experiences', errors);

  if (!Array.isArray(experiences)) {
    return ids;
  }

  if (experiences.length === 0) {
    errors.push('experiences must contain at least one item');
  }

  experiences.forEach((experience, index) => {
    const path = `experiences[${index}]`;

    if (!isRecord(experience)) {
      return;
    }

    validateString(experience.title, `${path}.title`, errors);
    validateString(experience.type, `${path}.type`, errors);

    if (!isRecord(experience.period)) {
      errors.push(`${path}.period must be an object`);
    } else {
      validateString(experience.period.start, `${path}.period.start`, errors);
      validateString(experience.period.label, `${path}.period.label`, errors);
    }

    validateString(experience.summary, `${path}.summary`, errors);
    validateString(experience.rawNarrative, `${path}.rawNarrative`, errors);
    validateOptionalString(experience.publicNarrative, `${path}.publicNarrative`, errors);
    validateOptionalString(experience.privateNotes, `${path}.privateNotes`, errors);
    validateStringArray(
      experience.strengthenedCapabilities,
      `${path}.strengthenedCapabilities`,
      errors
    );
    validateOptionalStringArray(experience.skills, `${path}.skills`, errors);
    validateStringArray(experience.revealedPatterns, `${path}.revealedPatterns`, errors);
    validateStringArray(experience.tools, `${path}.tools`, errors);
    validateStringArray(experience.principles, `${path}.principles`, errors);
    validateOptionalStringArray(experience.tone, `${path}.tone`, errors);
    validateEvidence(experience.evidence, `${path}.evidence`, errors);
    validateString(experience.visibility, `${path}.visibility`, errors);

    if (
      isNonEmptyString(experience.visibility) &&
      !['public', 'private', 'draft'].includes(experience.visibility)
    ) {
      errors.push(`${path}.visibility must be public, private, or draft`);
    }

    if (Array.isArray(experience.strengthenedCapabilities)) {
      experience.strengthenedCapabilities.forEach((capabilityId) => {
        if (typeof capabilityId === 'string' && !capabilityIds.has(capabilityId)) {
          errors.push(
            `${path}.strengthenedCapabilities references unknown capability id: ${capabilityId}`
          );
        }
      });
    }

    if (Array.isArray(experience.principles)) {
      experience.principles.forEach((principleId) => {
        if (typeof principleId === 'string' && !principleIds.has(principleId)) {
          errors.push(`${path}.principles references unknown principle id: ${principleId}`);
        }
      });
    }
  });

  return ids;
}

export function validateMosaicData(value: unknown): string[] {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return ['Mosaic data must be an object'];
  }

  validateProfile(value.profile, errors);
  const capabilityIds = validateCapabilities(value.capabilities, errors);
  const principleIds = validatePrinciples(value.principles, errors);
  validateExperiences(value.experiences, capabilityIds, principleIds, errors);

  return errors;
}

export function isMosaicData(value: unknown): value is MosaicData {
  return validateMosaicData(value).length === 0;
}
