import test from 'node:test';
import assert from 'node:assert/strict';
import { projectDesignProfile } from './build-design-profile.mjs';
const atlas = { experiences: [{ id: 'sample', record: { title: 'Example', context: { organization: 'Fictional' }, period: { label: '2020' }, summary: 'Summary', myContribution: ['Personal work'], outcomes: ['Outcome'], tools: [], problem: ['Problem'], approachAndDecisions: ['Approach'], teamOrExistingContribution: ['Team work'] } }] };
const selection = { name: 'Example Person', cases: [{ experienceId: 'sample', title: 'Selected', category: 'build', visual: 'structure', limit: 'Limited historical account.' }] };
test('local projection preserves personal, team, outcome and limit distinctions', () => {
  const value = projectDesignProfile(atlas, selection);
  assert.equal(value.private, true);
  assert.equal(value.cases[0].contribution, 'Personal work');
  assert.equal(value.cases[0].outcome, 'Outcome');
  assert.deepEqual(value.cases[0].details, ['Problem', 'Approach', 'Team work']);
  assert.equal(value.cases[0].limit, 'Limited historical account.');
});
test('unavailable sources and unqualified selections fail closed', () => {
  assert.throws(() => projectDesignProfile(atlas, { ...selection, cases: [{ experienceId: 'missing' }] }));
  assert.throws(() => projectDesignProfile(atlas, { ...selection, cases: [{ experienceId: 'sample' }] }));
});
