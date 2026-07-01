#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const filePath = process.argv[2] ?? 'public/data/mosaic.sample.json';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertString(value, path) {
  assert(typeof value === 'string' && value.trim().length > 0, `${path} must be a non-empty string`);
}

function assertStringArray(value, path) {
  assert(Array.isArray(value), `${path} must be an array`);
  value.forEach((item, index) => assertString(item, `${path}[${index}]`));
}

function assertOptionalString(value, path) {
  if (value !== undefined) {
    assertString(value, path);
  }
}

function assertOptionalStringArray(value, path) {
  if (value !== undefined) {
    assertStringArray(value, path);
  }
}

function uniqueIds(items, path) {
  const seen = new Set();

  items.forEach((item, index) => {
    assertString(item.id, `${path}[${index}].id`);
    assert(!seen.has(item.id), `${path} contains duplicate id: ${item.id}`);
    seen.add(item.id);
  });

  return seen;
}

function validateProfile(profile) {
  assert(profile && typeof profile === 'object', 'profile must be an object');
  assertString(profile.name, 'profile.name');
  assertString(profile.title, 'profile.title');
  assertString(profile.tagline, 'profile.tagline');
  assertString(profile.summary, 'profile.summary');
}

function validateCapabilities(capabilities) {
  assert(Array.isArray(capabilities), 'capabilities must be an array');
  assert(capabilities.length > 0, 'capabilities must contain at least one item');

  capabilities.forEach((capability, index) => {
    assertString(capability.label, `capabilities[${index}].label`);
    assertString(capability.category, `capabilities[${index}].category`);
    assertString(capability.description, `capabilities[${index}].description`);
  });

  return uniqueIds(capabilities, 'capabilities');
}

function validatePrinciples(principles) {
  assert(Array.isArray(principles), 'principles must be an array');

  principles.forEach((principle, index) => {
    assertString(principle.label, `principles[${index}].label`);
    assertString(principle.description, `principles[${index}].description`);
  });

  return uniqueIds(principles, 'principles');
}

function validateExperiences(experiences, capabilityIds, principleIds) {
  assert(Array.isArray(experiences), 'experiences must be an array');
  assert(experiences.length > 0, 'experiences must contain at least one item');

  const experienceIds = uniqueIds(experiences, 'experiences');

  experiences.forEach((experience, index) => {
    const path = `experiences[${index}]`;
    assertString(experience.title, `${path}.title`);
    assertString(experience.type, `${path}.type`);
    assert(experience.period && typeof experience.period === 'object', `${path}.period must be an object`);
    assertString(experience.period.start, `${path}.period.start`);
    assertString(experience.period.label, `${path}.period.label`);
    assertString(experience.summary, `${path}.summary`);
    assertString(experience.rawNarrative, `${path}.rawNarrative`);
    assertOptionalString(experience.publicNarrative, `${path}.publicNarrative`);
    assertOptionalString(experience.privateNotes, `${path}.privateNotes`);
    assertStringArray(experience.strengthenedCapabilities, `${path}.strengthenedCapabilities`);
    assertOptionalStringArray(experience.skills, `${path}.skills`);
    assertStringArray(experience.revealedPatterns, `${path}.revealedPatterns`);
    assertStringArray(experience.tools, `${path}.tools`);
    assertStringArray(experience.principles, `${path}.principles`);
    assertOptionalStringArray(experience.tone, `${path}.tone`);
    assert(['public', 'private', 'draft'].includes(experience.visibility), `${path}.visibility must be public, private, or draft`);

    if (experience.evidence !== undefined) {
      assert(Array.isArray(experience.evidence), `${path}.evidence must be an array`);

      experience.evidence.forEach((evidence, evidenceIndex) => {
        const evidencePath = `${path}.evidence[${evidenceIndex}]`;
        assert(evidence && typeof evidence === 'object', `${evidencePath} must be an object`);
        assertString(evidence.label, `${evidencePath}.label`);
        assertString(evidence.url, `${evidencePath}.url`);
        assert(
          /^https?:\/\/\S+$/u.test(evidence.url),
          `${evidencePath}.url must be an http(s) URL`
        );
      });
    }

    experience.strengthenedCapabilities.forEach((capabilityId) => {
      assert(capabilityIds.has(capabilityId), `${path}.strengthenedCapabilities references unknown capability id: ${capabilityId}`);
    });

    experience.principles.forEach((principleId) => {
      assert(principleIds.has(principleId), `${path}.principles references unknown principle id: ${principleId}`);
    });
  });

  return experienceIds;
}

async function main() {
  const raw = await readFile(filePath, 'utf8');
  const data = JSON.parse(raw);

  validateProfile(data.profile);
  const capabilityIds = validateCapabilities(data.capabilities);
  const principleIds = validatePrinciples(data.principles);
  const experienceIds = validateExperiences(data.experiences, capabilityIds, principleIds);

  console.log(`Validated ${filePath}`);
  console.log(`- ${capabilityIds.size} capabilities`);
  console.log(`- ${principleIds.size} principles`);
  console.log(`- ${experienceIds.size} experiences`);
}

main().catch((error) => {
  console.error('Mosaic data validation failed.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
