import type { DesignProfile } from './types';

// Fictional content lets the design travel without publishing a real person's evidence.
export const demoProfile: DesignProfile = {
  private: false,
  name: 'Alex Morgan',
  role: 'Software engineer & technical consultant',
  headline: ['A way', 'through.'],
  intro: 'I investigate difficult systems, build practical tools, and help people make the work their own.',
  context: 'Engineering · investigation · people',
  strengths: ['Find the useful question', 'Make complexity workable', 'Build across boundaries', 'Help others take ownership'],
  cases: [
    {
      id: 'control-route', title: 'Find another way in.', kicker: 'Investigation → implementation',
      organization: 'Navigation product · fictional example', period: '2022', category: 'investigate', visual: 'device',
      summary: 'A difficult device. An overlooked software interface. A more practical way to work.',
      contribution: 'Investigated the device, identified an accessible control interface, and implemented a small automation framework.',
      outcome: 'The fictional team could exercise the interface through software and contribute their own scenarios.',
      limit: 'Illustrative sample content. The device and interaction are schematic; they are not measurements or a client artifact.',
      tools: ['Browser automation', 'Remote debugging', 'Python'],
      details: ['The team needed a repeatable route through a device whose physical interaction was cumbersome.', 'A small proof of concept established a software control path. The implementation then separated scenario intent from device mechanics.', 'Colleagues contributed scenarios and framework details.'], sourceLabel: 'Fictional design example',
    },
    {
      id: 'shared-boundary', title: 'Change one thing. Keep the intent.', kicker: 'Architecture → practical tooling',
      organization: 'Engineering platform · fictional example', period: '2021', category: 'build', visual: 'structure',
      summary: 'A shared definition gave repeated changes a better place to live.',
      contribution: 'Designed a shared interface layer and implemented the tooling needed to use it.',
      outcome: 'In this fictional example, the team updated shared definitions instead of changing each dependent scenario separately.',
      limit: 'Illustrative sample content. Human checks of meaning and downstream impact remained necessary.',
      tools: ['C#', 'Interface design', 'Integration'],
      details: ['A recurring protocol change affected many scenarios.', 'The team placed changing mechanics behind a shared boundary while keeping scenario intent readable.', 'The improvement depended on people maintaining the definitions and checking what a change meant.'], sourceLabel: 'Fictional design example',
    },
    {
      id: 'receiving-team', title: 'Make it theirs.', kicker: 'Practical coaching → team ownership',
      organization: 'Product team · fictional example', period: '2023', category: 'enable', visual: 'workflow',
      summary: 'Examples, pairing and a usable structure helped a team carry the work forward.',
      contribution: 'Worked with the team on live examples, documented decisions, and helped colleagues maintain the framework.',
      outcome: 'The fictional team began making routine changes themselves.',
      limit: 'Illustrative sample content. Routine maintenance is not evidence of complete independence or long-term adoption.',
      tools: ['Pairing', 'Architecture', 'Developer experience'],
      details: ['An implementation is useful only when people can operate and change it.', 'Pairing used the team’s actual work rather than a separate training exercise.', 'Responsibility moved through examples, feedback and shared decisions.'], sourceLabel: 'Fictional design example',
    },
  ],
  technologies: [
    { name: 'Python', context: 'Personal implementation in the fictional navigation example · 2022', caseIds: ['control-route'] },
    { name: 'C#', context: 'Shared interface tooling in the fictional platform example · 2021', caseIds: ['shared-boundary'] },
    { name: 'Browser automation', context: 'Control-interface investigation and framework implementation · 2022', caseIds: ['control-route'] },
    { name: 'Developer experience', context: 'Pairing, examples and receiving maintenance · 2023', caseIds: ['receiving-team'] },
  ],
};
