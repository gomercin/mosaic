import { readFile, writeFile, mkdir, chmod } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

export function projectDesignProfile(atlas, selection) {
  if (!selection.name || !Array.isArray(selection.cases) || !selection.cases.length) throw new Error('A local identity and selected experiences are required.');
  const cases = selection.cases.map(choice => {
    const experience = atlas.experiences.find(item => item.id === choice.experienceId);
    if (!experience?.record) throw new Error(`Selected experience is unavailable: ${choice.experienceId}`);
    const editorial = atlas.portfolio?.evidence.find(item => item.experienceId === choice.experienceId);
    const record = experience.record;
    const story = atlas.brochure?.stories.find(item => item.experienceId === choice.experienceId);
    const limit = choice.limit || editorial?.limit || story?.limit;
    if (!limit) throw new Error(`Select an explicit material limit: ${choice.experienceId}`);
    return {
      id: experience.id, title: choice.title || editorial?.label || record.title,
      kicker: choice.kicker, organization: record.context.organization,
      period: choice.period || record.period.label, category: choice.category, visual: choice.visual,
      summary: choice.summary || editorial?.summary || record.summary,
      contribution: choice.contribution || story?.personal || editorial?.role || record.myContribution.join(' '),
      outcome: choice.outcome || story?.outcome || editorial?.outcome || record.outcomes.join(' '),
      limit, tools: choice.tools || record.tools || [],
      details: choice.details || (story ? [story.context, story.problem, story.action, story.others].filter(Boolean) : [record.problem.join(' '), record.approachAndDecisions.join(' '), record.teamOrExistingContribution.join(' ')]),
      sourceLabel: 'Retrospective personal account · local editorial selection',
    };
  });
  return {
    private: true, name: selection.name, role: selection.role,
    headline: selection.headline, intro: selection.intro, context: selection.context,
    strengths: selection.strengths, cases,
    technologies: selection.technologies || [],
    ...(selection.contact ? { contact: selection.contact } : {}),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [atlasPath, selectionPath, ...extra] = process.argv.slice(2);
  if (!atlasPath || !selectionPath || extra.length) throw new Error('Usage: npm run design:profile -- <local-atlas.json> <local-selection.json>');
  const [atlasBytes, selectionBytes] = await Promise.all([readFile(resolve(atlasPath)), readFile(resolve(selectionPath))]);
  const profile = projectDesignProfile(JSON.parse(atlasBytes), JSON.parse(selectionBytes));
  profile.sourceDigests = [atlasBytes, selectionBytes].map(bytes => createHash('sha256').update(bytes).digest('hex'));
  const output = resolve('.private-evidence/design-examples/profile.json');
  await mkdir(dirname(output), { recursive: true, mode: 0o700 });
  await writeFile(output, `${JSON.stringify(profile, null, 2)}\n`, { mode: 0o600 });
  await chmod(output, 0o600);
  console.log(`Local design profile generated (${profile.cases.length} selected accounts).`);
}
