import { useId, useRef, useState } from 'react';
import type { Audience, DesignCase, DesignProps } from './types';
import './monograph.css';

const audienceNames: { id: Audience; label: string }[] = [
  { id: 'explore', label: 'Explore' },
  { id: 'client', label: 'For your team' },
  { id: 'technical', label: 'Technical profile' },
  { id: 'sales', label: 'For sales' },
];

function Arrow() {
  return <span className="mono-arrow" aria-hidden="true">↗</span>;
}

function DeviceDrawing({ revealed, title }: { revealed: boolean; title: string }) {
  return <div className={`mono-device ${revealed ? 'is-revealed' : ''}`} aria-label={`${title}. Illustrative device with an inspectable software layer.`} role="img">
    <div className="mono-device__shadow" />
    <div className="mono-device__body">
      <div className="mono-device__screen">
        <svg className="mono-device__map" viewBox="0 0 440 285" aria-hidden="true">
          <path className="mono-road mono-road--wide" d="M-20 210 87 210 153 145 274 145 355 65 460 65" />
          <path className="mono-road" d="M82 -10V67L225 210V300M-10 78H147L357 285M304 -10V88L409 192H460" />
          <path className="mono-road" d="M-10 155H78L194 40H460M315 300V238L440 113" />
          <path className="mono-route" d="M62 210H87L153 145H274L326 93" />
          <circle cx="62" cy="210" r="7" className="mono-route-origin" />
          <circle cx="326" cy="93" r="9" className="mono-route-end" />
        </svg>
        <div className="mono-device__top"><span>INTERFACE</span><span>09:41</span></div>
        <div className="mono-device__direction"><span aria-hidden="true">↗</span><div>Another route<small>to the same destination</small></div></div>
      </div>
      <div className="mono-device__edge"><span /><span /><span /></div>
    </div>
    <div className="mono-device__layer"><span>SOFTWARE LAYER</span><div><i />Connection available</div><code>intent → interface → action</code></div>
  </div>;
}

function StructureDrawing({ revealed }: { revealed: boolean }) {
  return <div className={`mono-structure ${revealed ? 'is-revealed' : ''}`} role="img" aria-label="Illustration of changing details being separated from stable intent">
    <div className="mono-sheet mono-sheet--back"><span>CHANGING DETAILS</span><div /><div /><div /><div /><div /></div>
    <div className="mono-sheet mono-sheet--middle"><span>A USEFUL BOUNDARY</span><div /><div /><div /><div /></div>
    <div className="mono-sheet mono-sheet--front"><span>STABLE INTENT</span><strong>One place.<br />A clearer whole.</strong><div className="mono-sheet__rule" /><small>Structure that people can work with.</small></div>
    <span className="mono-structure__annotation">{revealed ? 'Let the details change.' : 'Find the useful separation.'}</span>
  </div>;
}

function WorkflowDrawing({ revealed }: { revealed: boolean }) {
  return <div className={`mono-workflow ${revealed ? 'is-revealed' : ''}`} role="img" aria-label="Illustration of an individual practice becoming a shared, usable approach">
    <div className="mono-workflow__page mono-workflow__page--back"><span>CONTEXT</span><i /><i /><i /><i /></div>
    <div className="mono-workflow__page mono-workflow__page--main"><span>WORKING TOGETHER</span><strong>Make it<br />tangible.</strong><div className="mono-workflow__steps"><b>Understand</b><span>↓</span><b>Try it together</b><span>↓</span><b>Carry it forward</b></div></div>
    <div className="mono-workflow__note">{revealed ? 'A shared way forward.' : 'An idea becomes useful in practice.'}<span aria-hidden="true">↗</span></div>
  </div>;
}

function Exhibit({ item, index, onOpen }: { item: DesignCase; index: number; onOpen: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const figureId = useId();
  return <figure className={`mono-exhibit mono-exhibit--${item.visual}`}>
    <div className="mono-exhibit__mast"><span>FIELD NOTE / {String(index + 1).padStart(2, '0')}</span><span>{item.category}</span></div>
    <div className="mono-exhibit__art" id={figureId}>
      <span className="mono-exhibit__watermark" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
      {item.visual === 'device' ? <DeviceDrawing revealed={revealed} title={item.title} />
        : item.visual === 'structure' ? <StructureDrawing revealed={revealed} /> : <WorkflowDrawing revealed={revealed} />}
    </div>
    <div className="mono-exhibit__controls"><span>Illustrative reconstruction</span><button type="button" aria-pressed={revealed} aria-controls={figureId} onClick={() => setRevealed(!revealed)}>{revealed ? 'Return to the surface' : 'Look a little closer'}<span aria-hidden="true">{revealed ? '−' : '+'}</span></button></div>
    <figcaption><div><small>{item.organization}</small><strong>{item.kicker}</strong></div><button className="mono-circle-link" type="button" aria-label={`Read ${item.title}`} onClick={onOpen}><Arrow /></button></figcaption>
  </figure>;
}

export function Monograph({ profile, audience, onAudience, onCase }: DesignProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const workRef = useRef<HTMLElement>(null);
  const selectedIndex = Math.max(0, profile.cases.findIndex((item) => item.id === selectedId));
  const selected = profile.cases[selectedIndex];
  const isExplore = audience === 'explore';
  const isClient = audience === 'client';
  const isTechnical = audience === 'technical';
  const isSales = audience === 'sales';
  const headline = isExplore ? profile.headline : isClient ? ['A clearer', 'way forward.']
    : isTechnical ? ['The detail', 'behind the work.'] : ['A useful', 'introduction.'];
  const intro = isExplore || isClient ? profile.intro : isTechnical
    ? 'Technical experience, connected to the situations where it was applied. Select an example to see the contribution and its context.'
    : 'Start with the situation. Bring a relevant example. Keep the contribution specific.';

  function showWork() {
    workRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  return <div className={`monograph monograph--${audience}`}>
    <header className="mono-header">
      <button className="mono-identity" type="button" onClick={() => onAudience('explore')} aria-label={`${profile.name}, explore the portfolio`}><strong>{profile.name}</strong><span>{profile.role}</span></button>
      <nav className="mono-nav" aria-label="Portfolio audience">
        {audienceNames.map((item) => <button type="button" key={item.id} aria-current={audience === item.id ? 'page' : undefined} onClick={() => onAudience(item.id)}>{item.label}</button>)}
      </nav>
    </header>

    <main>
      <section className={`mono-hero${isTechnical || isSales ? ' mono-hero--compact' : ''}`} aria-labelledby="mono-title">
        <div className="mono-hero__copy">
          <p className="mono-eyebrow">{isExplore ? 'Independent thought. Practical work.' : isClient ? 'For teams facing a difficult next step' : isTechnical ? 'The technical profile' : 'For a relevant opportunity'}</p>
          <h1 id="mono-title"><span>{headline[0]}</span><em>{headline[1]}</em></h1>
          <p className="mono-intro">{intro}</p>
          <div className="mono-hero__actions"><button className="mono-primary" type="button" onClick={showWork}>{isTechnical ? 'Explore technical experience' : isSales ? 'Choose a relevant example' : 'Selected work'}<span aria-hidden="true">↓</span></button>
            {isExplore && <button className="mono-text-link" type="button" onClick={() => onAudience('client')}>Where I can help <Arrow /></button>}
            {!isExplore && profile.contact && <a className="mono-text-link" href={profile.contact.href}>{profile.contact.label} <Arrow /></a>}
          </div>
          <p className="mono-context">{profile.context}</p>
        </div>
        {!isTechnical && !isSales && selected && <div className="mono-hero__exhibit"><Exhibit key={selected.id} item={selected} index={selectedIndex} onOpen={() => onCase(selected.id)} />
          <div className="mono-exhibit-picker" aria-label="Choose a featured example">{profile.cases.slice(0, 3).map((item, index) => <button key={item.id} type="button" aria-pressed={item.id === selected.id} onClick={() => setSelectedId(item.id)}><span>{String(index + 1).padStart(2, '0')}</span>{item.category}</button>)}</div>
        </div>}
        {isTechnical && <aside className="mono-margin-note"><p>Tools change.<br />The work gives<br /><em>them meaning.</em></p><small>Historical use is shown in context.<br />No proficiency scores.</small></aside>}
        {isSales && <aside className="mono-introduction"><span className="mono-eyebrow">The short introduction</span><h2>{profile.name}</h2><p>{profile.role}</p><p>{profile.intro}</p><div>{profile.strengths.slice(0, 3).map((strength) => <span key={strength}>{strength}</span>)}</div></aside>}
      </section>

      <section className="mono-work" ref={workRef} aria-labelledby="mono-work-title">
        <div className="mono-section-heading"><p className="mono-eyebrow">{isTechnical ? 'Resources in context' : isSales ? 'A selection for the conversation' : isClient ? 'Recognize the situation' : 'A few ways the work takes shape'}</p><h2 id="mono-work-title">{isTechnical ? 'Applied, not just listed.' : isSales ? 'Bring the right example.' : isClient ? 'Start where you are.' : 'Selected work.'}</h2><span>{isTechnical ? 'CONTEXT / CONTRIBUTION' : 'SITUATION / CONTRIBUTION / CHANGE'}</span></div>

        {isTechnical ? <div className="mono-tech-list">{profile.technologies.map((technology) => <article className="mono-tech-row" key={technology.name}><h3>{technology.name}</h3><p>{technology.context}</p><div>{technology.caseIds.map((id) => { const item = profile.cases.find((candidate) => candidate.id === id); return item ? <button type="button" key={id} onClick={() => onCase(id)}>{item.organization}<Arrow /></button> : null; })}</div></article>)}</div>
          : <div className="mono-case-list">{profile.cases.map((item, index) => <article className="mono-case" key={item.id}>
            <span className="mono-case__index">{String(index + 1).padStart(2, '0')}</span>
            <div className="mono-case__main"><p className="mono-case__meta">{item.organization}<span>{item.period}</span></p><button className="mono-case__title" type="button" onClick={() => onCase(item.id)}><h3>{item.title}</h3><Arrow /></button><p>{isSales ? item.contribution : item.summary}</p><div className="mono-case__tools">{item.tools.slice(0, 4).map((tool) => <span key={tool}>{tool}</span>)}</div></div>
            <div className="mono-case__consequence"><span className="mono-eyebrow">What changed</span><p>{item.outcome}</p><button className="mono-text-link" type="button" onClick={() => onCase(item.id)}>Read the contribution <Arrow /></button></div>
          </article>)}</div>}
      </section>

      {!isTechnical && <section className="mono-strengths" aria-label="Strengths across the work"><div><p className="mono-eyebrow">Across different situations</p><h2>A way of<br /><em>working.</em></h2></div><ol>{profile.strengths.map((strength, index) => <li key={strength}><span>{String(index + 1).padStart(2, '0')}</span>{strength}</li>)}</ol></section>}
      <footer className="mono-footer"><div><p className="mono-eyebrow">A conversation starts with a situation.</p><h2>What are you<br /><em>working through?</em></h2></div><div>{profile.contact ? <a className="mono-primary" href={profile.contact.href}>{profile.contact.label}<Arrow /></a> : <button className="mono-primary" type="button" onClick={() => onAudience(isClient ? 'sales' : 'client')}>{isClient ? 'Prepare an introduction' : 'Find a fit for your team'}<Arrow /></button>}<p>{profile.name}<br />{profile.role}</p></div></footer>
    </main>
  </div>;
}
