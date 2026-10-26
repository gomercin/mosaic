// Browser and CLI share this strict, dependency-free publication contract.
const text = { type: 'string', minLength: 1 };
const strings = { type: 'array', items: text, uniqueItems: true };
const id = { ...text, pattern: '^[a-zA-Z0-9][a-zA-Z0-9:_-]*$' };
const object = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: false });
const records = (item, minItems = 0) => ({ type: 'array', items: item, minItems });
const profile = object({ name: text, title: text, tagline: text, summary: text, location: text }, ['name', 'title', 'tagline', 'summary']);
const capability = object({ id, label: text, category: text, description: text });
const principle = object({ id, label: text, description: text });
const period = object({ start: text, end: text, label: text }, ['start', 'label']);
const experience = object({ id, title: text, type: text, company: text, period, summary: text, publicNarrative: text, challenge: text, approach: text, impact: text, strengthenedCapabilities: strings, revealedPatterns: strings, tools: strings, principles: strings, tone: strings }, ['id', 'title', 'type', 'period', 'summary', 'publicNarrative', 'challenge', 'approach', 'impact', 'strengthenedCapabilities', 'revealedPatterns', 'tools', 'principles']);
const episode = object({ id, experienceId: id, summary: text, myContribution: text, teamContribution: text, aiContribution: text, result: text, limitation: text, outcomeStatus: { enum: ['delivered', 'stopped', 'idea'] } });
const link = object({ id, capabilityId: id, experienceId: id, episodeId: id, explanation: text, signalType: { enum: ['strengthened', 'demonstrated', 'candidate'] }, confidence: { enum: ['high', 'medium', 'low'] }, confirmedByUser: { type: 'boolean' } });
const publication = object({ status: { const: 'approved' }, reviewer: text, revision: text });

export const publicContractSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://gomercin.github.io/mosaic/schemas/public-mosaic.v1.schema.json',
  title: 'Mosaic approved public dataset v1',
  ...object({ schemaVersion: { const: '1.0' }, datasetKind: { enum: ['synthetic', 'curated'] }, publication, profile, capabilities: records(capability, 1), principles: records(principle), experiences: records(experience, 1), evidenceEpisodes: records(episode, 1), evidenceLinks: records(link, 1) }),
};

export function validateAgainstSchema(value, schema, path = '$') {
  const errors = [];
  const visit = (current, rule, at) => {
    if (rule.anyOf) {
      if (!rule.anyOf.some((alternative) => validateAgainstSchema(current, alternative, at).length === 0)) errors.push(`${at} does not match any supported shape`);
      return;
    }
    if (rule.const !== undefined && current !== rule.const) errors.push(`${at} must equal ${JSON.stringify(rule.const)}`);
    if (rule.enum && !rule.enum.includes(current)) errors.push(`${at} must be one of ${rule.enum.join(', ')}`);
    if (rule.type === 'object') {
      if (!current || typeof current !== 'object' || Array.isArray(current)) { errors.push(`${at} must be an object`); return; }
      for (const key of rule.required ?? []) if (!Object.hasOwn(current, key)) errors.push(`${at}.${key} is required`);
      for (const key of Object.keys(current)) {
        if (!Object.hasOwn(rule.properties ?? {}, key)) {
          if (rule.additionalProperties === false) errors.push(`${at}.${key} is not allowed`);
        } else visit(current[key], rule.properties[key], `${at}.${key}`);
      }
    } else if (rule.type === 'array') {
      if (!Array.isArray(current)) { errors.push(`${at} must be an array`); return; }
      if (rule.minItems !== undefined && current.length < rule.minItems) errors.push(`${at} requires at least ${rule.minItems} item(s)`);
      if (rule.uniqueItems && new Set(current.map((item) => JSON.stringify(item))).size !== current.length) errors.push(`${at} contains duplicate items`);
      current.forEach((item, index) => visit(item, rule.items, `${at}[${index}]`));
    } else if (rule.type === 'string') {
      if (typeof current !== 'string' || current.trim().length < (rule.minLength ?? 0)) errors.push(`${at} must be a non-empty string`);
      else if (rule.pattern && !new RegExp(rule.pattern, 'u').test(current)) errors.push(`${at} has an invalid identifier`);
    } else if (rule.type === 'boolean' && typeof current !== 'boolean') errors.push(`${at} must be a boolean`);
  };
  visit(value, schema, path);
  return errors;
}

export function validatePublicMosaicData(data) {
  const errors = validateAgainstSchema(data, publicContractSchema);
  // Semantic reference checks run only after shape validation so malformed input cannot throw.
  if (errors.length) return errors;
  const collections = ['capabilities', 'principles', 'experiences', 'evidenceEpisodes', 'evidenceLinks'];
  const indexes = {};
  for (const collection of collections) {
    indexes[collection] = new Map();
    data[collection].forEach((record, index) => {
      if (indexes[collection].has(record.id)) errors.push(`$.${collection}[${index}].id duplicates ${record.id}`);
      indexes[collection].set(record.id, record);
    });
  }
  const reference = (collection, value, path) => {
    if (!indexes[collection].has(value)) errors.push(`${path} references unknown ${collection} id: ${value}`);
  };
  data.experiences.forEach((record, index) => {
    record.strengthenedCapabilities.forEach((value) => reference('capabilities', value, `$.experiences[${index}].strengthenedCapabilities`));
    record.principles.forEach((value) => reference('principles', value, `$.experiences[${index}].principles`));
  });
  data.evidenceEpisodes.forEach((record, index) => reference('experiences', record.experienceId, `$.evidenceEpisodes[${index}].experienceId`));
  const linkedEvidenceUnits = new Set();
  data.evidenceLinks.forEach((record, index) => {
    const evidenceUnit = JSON.stringify([record.capabilityId, record.experienceId, record.episodeId]);
    if (linkedEvidenceUnits.has(evidenceUnit)) errors.push(`$.evidenceLinks[${index}] duplicates an existing capability/experience/episode evidence unit`);
    linkedEvidenceUnits.add(evidenceUnit);
    const path = `$.evidenceLinks[${index}]`;
    reference('capabilities', record.capabilityId, `${path}.capabilityId`);
    reference('experiences', record.experienceId, `${path}.experienceId`);
    reference('evidenceEpisodes', record.episodeId, `${path}.episodeId`);
    if (indexes.evidenceEpisodes.has(record.episodeId) && indexes.evidenceEpisodes.get(record.episodeId).experienceId !== record.experienceId) errors.push(`${path}.episodeId belongs to a different experience`);
    if (indexes.experiences.has(record.experienceId) && !indexes.experiences.get(record.experienceId).strengthenedCapabilities.includes(record.capabilityId)) errors.push(`${path}.capabilityId is absent from the experience capability references`);
  });
  data.experiences.forEach((record, index) => record.strengthenedCapabilities.forEach((capabilityId) => {
    if (!data.evidenceLinks.some((link) => link.experienceId === record.id && link.capabilityId === capabilityId)) errors.push(`$.experiences[${index}].strengthenedCapabilities has no evidence link for ${capabilityId}`);
  }));
  data.capabilities.forEach((record, index) => {
    if (!data.evidenceLinks.some((link) => link.capabilityId === record.id)) errors.push(`$.capabilities[${index}] has no evidence link`);
  });
  data.evidenceEpisodes.forEach((record, index) => {
    if (!data.evidenceLinks.some((link) => link.episodeId === record.id)) errors.push(`$.evidenceEpisodes[${index}] has no evidence link`);
  });
  return errors;
}

export function assertPublicMosaicData(data) {
  const errors = validatePublicMosaicData(data);
  if (errors.length) throw new Error(`Public Mosaic validation failed:\n${errors.join('\n')}`);
  return data;
}
