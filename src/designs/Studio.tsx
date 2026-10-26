import { useEffect, useRef, useState } from 'react';
import type { Audience, DesignCase, DesignProps } from './types';
import './studio.css';

const audienceLabels: { id: Audience; label: string }[] = [
  { id: 'explore', label: 'Explore' },
  { id: 'client', label: 'For your team' },
  { id: 'technical', label: 'Technical profile' },
  { id: 'sales', label: 'For sales' },
];

function DeviceExhibit({ item }: { item?: DesignCase }) {
  const [layer, setLayer] = useState(0);
  const visual = item?.visual ?? 'device';
  const exhibit = visual === 'structure' ? {
    label: 'STRUCTURE', screen: 'INTENT', middle: 'SHARED DEFINITIONS', base: 'IMPLEMENTATION',
    titles: ['Stable intent', 'A shared definition', 'A changing implementation'],
    controls: ['Intent', 'Definitions', 'Implementation'],
    callouts: ['Express what should happen.', 'Separate shared definitions.', 'Keep details behind a boundary.'],
    verbs: ['translate', 'adapt', 'execute'],
  } : visual === 'workflow' ? {
    label: 'PRACTICE', screen: 'CONCRETE WORK', middle: 'WORKED EXAMPLE', base: 'SHARED PRACTICE',
    titles: ['An individual attempt', 'An example to work with', 'A practice others can use'],
    controls: ['Attempt', 'Example', 'Practice'],
    callouts: ['Start with concrete work.', 'Make an approach tangible.', 'Leave room for ownership.'],
    verbs: ['demonstrate', 'discuss', 'repeat'],
  } : {
    label: 'INTERFACE', screen: 'THE SYSTEM', middle: 'INTERFACE', base: 'CONTROL LAYER',
    titles: ['What is visible', 'Look below the surface', 'A useful point of connection'],
    controls: ['Surface', 'Underneath', 'Connection'],
    callouts: ['Observe the system.', 'Find the interface.', 'Make a connection.'],
    verbs: ['connect', 'observe', 'interact'],
  };
  return <div className={`studio-exhibit studio-exhibit--${layer} studio-exhibit--${visual}`}>
    <div className="studio-exhibit__label"><span className="studio-status" /> Illustrative exhibit <span>EXHIBIT / {exhibit.label}</span></div>
    <div className="studio-scene" role="img" aria-label={`Illustrative ${visual === 'device' ? 'system reconstruction' : 'schematic'}. ${exhibit.titles[layer]}. ${exhibit.callouts[layer]}`}>
      <div className="studio-orbit-label studio-orbit-label--top">{exhibit.titles[layer]}</div>
      <div className="studio-device-stack">
        <div className="studio-control-plane">
          <div className="studio-control-plane__header"><span>{exhibit.base}</span><span>↗</span></div>
          <div className="studio-code">{exhibit.verbs.map((verb) => <span key={verb}>{verb}</span>)}</div>
          <div className="studio-interface-port" />
        </div>
        <div className="studio-interface-plane"><span>{exhibit.middle}</span><div /><div /><div /></div>
        <div className="studio-device">
          <div className="studio-device__camera" />
          <div className="studio-device__screen">
            <div className="studio-screen-header"><span>{exhibit.screen}</span><span>◉</span></div>
            {visual === 'device' ? <svg className="studio-map" viewBox="0 0 480 280" aria-hidden="true">
              <g className="studio-map__blocks"><path d="M0 15H120V75H0ZM145 15H300V75H145ZM325 15H480V75H325ZM0 103H75V195H0ZM102 103H220V195H102ZM247 103H340V195H247ZM367 103H480V195H367ZM0 225H175V280H0ZM202 225H330V280H202ZM357 225H480V280H357Z" /></g>
              <path className="studio-map__water" d="M-10 270C85 210 105 160 180 150S275 185 325 145S385 40 490 20" />
              <path className="studio-map__route" d="M88 250V210H232V88H353V45" />
              <circle className="studio-map__destination" cx="353" cy="45" r="7" />
              <path className="studio-map__position" d="m88 232 13 24-13-6-13 6Z" />
            </svg> : visual === 'structure' ? <div className="studio-syntax" aria-hidden="true"><span>SHARED DEFINITION</span><p><i>intent</i> / what should happen</p><p><i>interface</i> / how it is expressed</p><p><i>target</i> / where it runs</p><div className="studio-syntax__rule" /><small>Change a detail. Preserve the intent.</small></div> : <div className="studio-document" aria-hidden="true"><span>REVIEW / WORKFLOW</span><div className="studio-document__title" /><div /><div /><div /><p><b>✓</b> Read. Decide. Record.</p></div>}
            <div className="studio-screen-footer"><span><b>↗</b> A path through</span><span>ILLUSTRATION</span></div>
          </div>
          <div className="studio-device__edge"><i /><i /><i /><i /></div>
        </div>
      </div>
      <div className="studio-stage-shadow" />
      <div className="studio-exhibit__callout"><span>{String(layer + 1).padStart(2, '0')}</span><p>{exhibit.callouts[layer]}</p></div>
    </div>
    <div className="studio-exhibit__controls" aria-label="Explore the illustrative system">
      {exhibit.controls.map((label, index) => <button key={label} type="button" aria-pressed={layer === index} onClick={() => setLayer(index)}><span>{String(index + 1).padStart(2, '0')}</span>{label}</button>)}
    </div>
    <p className="studio-exhibit__caption">Illustrative {visual === 'device' ? 'reconstruction' : 'schematic'} · explore the idea, then read the account.</p>
  </div>;
}

export function Studio({ profile, audience, onAudience, onCase }: DesignProps) {
  const [selected, setSelected] = useState(0);
  const readShortlist = () => [...new Set((new URLSearchParams(window.location.search).get('shortlist') ?? '').split(','))]
    .filter((id) => profile.cases.some((work) => work.id === id));
  const [salesSelection, setSalesSelection] = useState<string[]>(readShortlist);
  const [copyStatus, setCopyStatus] = useState('');
  const workRef = useRef<HTMLElement>(null);
  const item = profile.cases[selected] ?? profile.cases[0];
  const browseWork = () => workRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  useEffect(() => {
    const restoreShortlist = () => { setSalesSelection(readShortlist()); setCopyStatus(''); };
    window.addEventListener('popstate', restoreShortlist);
    return () => window.removeEventListener('popstate', restoreShortlist);
  }, [profile.cases]);
  const toggleSalesCase = (id: string) => {
    const next = salesSelection.includes(id) ? salesSelection.filter((value) => value !== id) : [...salesSelection, id];
    setSalesSelection(next);
    setCopyStatus('');
    const url = new URL(window.location.href);
    if (next.length) url.searchParams.set('shortlist', next.join(','));
    else url.searchParams.delete('shortlist');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  };
  const salesCases = profile.cases.filter((work) => salesSelection.includes(work.id));
  const copyIntroduction = async () => {
    const introduction = [profile.name, profile.role, profile.intro, ...salesCases.map((work) =>
      `${work.kicker}\n${work.organization} · ${work.period}\nMy contribution: ${work.contribution}\nReported outcome: ${work.outcome}\nScope and limits: ${work.limit}`)].join('\n\n');
    try {
      await navigator.clipboard.writeText(introduction);
      setCopyStatus('Introduction copied, including contribution, outcome and scope.');
    } catch {
      setCopyStatus('Copy is unavailable in this browser. The introduction remains readable here.');
    }
  };

  return <div className={`studio-design studio-design--${audience}`}>
    <header className="studio-header">
      <button type="button" className="studio-wordmark" onClick={() => onAudience('explore')} aria-label={`${profile.name}, explore the work`}><span className="studio-wordmark__symbol" aria-hidden="true">↗</span><span>{profile.name}<small>{profile.role}</small></span></button>
      <nav aria-label="Visitor perspective">{audienceLabels.map(({ id, label }) => <button key={id} type="button" aria-current={audience === id ? 'page' : undefined} onClick={() => onAudience(id)}>{label}</button>)}</nav>
    </header>
    <main>
    {audience === 'explore' && <>
      <section className="studio-hero" aria-labelledby="studio-title">
        <div className="studio-hero__copy">
          <p className="studio-eyebrow"><span /> Independent thinking. Practical work.</p>
          <h1 id="studio-title">{profile.headline[0]}<br /><em>{profile.headline[1]}</em></h1>
          <p className="studio-hero__intro">{profile.intro}</p>
          <button type="button" className="studio-primary" onClick={browseWork}>Step inside the work <span aria-hidden="true">↗</span></button>
          <div className="studio-hero__context"><span className="studio-rule" /><p>{profile.context}</p></div>
        </div>
        <DeviceExhibit item={item} />
      </section>
      {item && <section className="studio-feature" aria-label="Featured work">
        <div className="studio-feature__index"><span>SELECTED WORK</span><p>{String(selected + 1).padStart(2, '0')} <small>/ {String(profile.cases.length).padStart(2, '0')}</small></p></div>
        <div className="studio-feature__copy"><p className="studio-eyebrow">{item.organization} <span className="studio-separator">/</span> {item.period}</p><h2>{item.title}</h2><p>{item.summary}</p><button type="button" className="studio-text-button" onClick={() => onCase(item.id)}>Open the account <span>↗</span></button></div>
        <div className="studio-feature__switch" aria-label="Choose featured work">{profile.cases.slice(0, 4).map((work, index) => <button key={work.id} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}><span>{String(index + 1).padStart(2, '0')}</span>{work.kicker}</button>)}</div>
      </section>}
      <section className="studio-practice" aria-label="A practice across disciplines"><p className="studio-eyebrow">A practice across disciplines</p><div>{profile.strengths.map((strength, index) => <p key={strength}><span>{String(index + 1).padStart(2, '0')}</span>{strength}</p>)}</div></section>
    </>}

    {audience === 'client' && <>
      <section className="studio-audience-intro"><p className="studio-eyebrow">For your team</p><h1>Find a useful<br /><em>way forward.</em></h1><p>{profile.intro}</p></section>
      <section className="studio-client-cases" aria-label="Where this work could be relevant">{profile.cases.slice(0, 3).map((work, index) => <article key={work.id}><span className="studio-client-cases__number">{String(index + 1).padStart(2, '0')}</span><div><p className="studio-eyebrow">{work.category === 'investigate' ? 'When the cause is unclear' : work.category === 'build' ? 'When the existing approach gets in the way' : 'When the team needs to carry it forward'}</p><h2>{work.title}</h2><p>{work.summary}</p><dl><div><dt>The contribution</dt><dd>{work.contribution}</dd></div><div><dt>What changed</dt><dd>{work.outcome}</dd></div></dl><button className="studio-text-button" type="button" onClick={() => onCase(work.id)}>See the work and its scope <span>↗</span></button></div></article>)}</section>
      <section className="studio-team-close"><p className="studio-eyebrow">A conversation starts with your situation</p><h2>What is difficult<br />to move forward?</h2><button type="button" className="studio-primary" onClick={() => onAudience('technical')}>Check technical experience <span>↗</span></button>{profile.contact && <a className="studio-text-button" href={profile.contact.href}>{profile.contact.label}<span>↗</span></a>}</section>
    </>}

    {audience === 'technical' && <>
      <section className="studio-audience-intro"><p className="studio-eyebrow">Technical profile</p><h1>The tools.<br /><em>The work.</em></h1><p>Technical experience in context: how it was used, and the contribution behind it.</p></section>
      <section className="studio-technical" aria-label="Technology and experience"><div className="studio-technical__head"><span>Technology / approach</span><span>Context of use</span><span>Related work</span></div>{profile.technologies.map((technology) => <article key={technology.name}><h2>{technology.name}</h2><p>{technology.context}</p><div>{technology.caseIds.map((id) => { const work = profile.cases.find((entry) => entry.id === id); return work ? <button type="button" key={id} onClick={() => onCase(id)}>{work.kicker}<span>↗</span></button> : null; })}</div></article>)}</section>
      <p className="studio-technical-note">Dated project experience describes the work involved. Current role requirements can be discussed against that context.</p>
    </>}

    {audience === 'sales' && <>
      <section className="studio-audience-intro"><p className="studio-eyebrow">For sales</p><h1>A specific need.<br /><em>A relevant example.</em></h1><p>Select the work relevant to an opportunity. The shortlist keeps the contribution, outcome and scope together.</p></section>
      <div className="studio-sales-layout"><section className="studio-sales-picker" aria-label="Choose examples for the introduction">{profile.cases.map((work) => <label key={work.id}><input type="checkbox" checked={salesSelection.includes(work.id)} onChange={() => toggleSalesCase(work.id)} /><span><small>{work.organization} · {work.period}</small><strong>{work.kicker}</strong><span>{work.summary}</span></span></label>)}</section><section className="studio-sales-summary" aria-label="Selected introduction"><p className="studio-eyebrow">Introduction</p><h2>{profile.name}</h2><p>{profile.role}</p><p>{profile.intro}</p>{salesCases.length ? salesCases.map((work) => <article key={work.id}><h3>{work.kicker}</h3><p>{work.contribution}</p><p><strong>Reported outcome:</strong> {work.outcome}</p><p className="studio-sales-summary__limit">{work.limit}</p><button className="studio-text-button" type="button" onClick={() => onCase(work.id)}>Full account <span>↗</span></button></article>) : <p className="studio-sales-summary__empty">Choose an example to build the introduction.</p>}<button className="studio-primary studio-copy-introduction" type="button" onClick={copyIntroduction} disabled={!salesCases.length}>Copy introduction <span aria-hidden="true">↗</span></button><p className="studio-copy-status" role="status">{copyStatus}</p></section></div>
    </>}

    {audience === 'explore' && <section className="studio-work" ref={workRef} aria-labelledby="studio-work-title"><div className="studio-work__heading"><p className="studio-eyebrow">A few ways into the work</p><h2 id="studio-work-title">Different situations.<br /><em>A consistent curiosity.</em></h2></div>{profile.cases.map((work, index) => <button type="button" className="studio-work-row" key={work.id} onClick={() => onCase(work.id)}><span className="studio-work-row__number">{String(index + 1).padStart(2, '0')}</span><span><small>{work.organization} · {work.period}</small><strong>{work.title}</strong><span>{work.summary}</span></span><span className="studio-work-row__arrow" aria-hidden="true">↗</span></button>)}</section>}

    </main>
    <footer className="studio-footer"><div><p className="studio-eyebrow">Keep exploring</p><h2>What would you<br /><em>like to understand?</em></h2></div><div><button type="button" onClick={() => onAudience(audience === 'client' ? 'explore' : 'client')}>{audience === 'client' ? 'Explore the work' : 'Find a fit for your team'}<span>↗</span></button><button type="button" onClick={() => onAudience(audience === 'technical' ? 'sales' : 'technical')}>{audience === 'technical' ? 'Select relevant examples' : 'See technical experience'}<span>↗</span></button>{profile.contact && <a href={profile.contact.href}>{profile.contact.label}<span>↗</span></a>}</div><p className="studio-footer__signature">{profile.name}<span>{profile.private ? 'Local design study · private experience' : 'Design study · fictional sample content'}</span></p></footer>
  </div>;
}
