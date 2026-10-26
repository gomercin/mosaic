import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Monograph } from './Monograph';
import { Studio } from './Studio';
import { demoProfile } from './demo';
import type { Audience, DesignKind, DesignProfile } from './types';
import './shell.css';

const audiences: Audience[] = ['explore', 'client', 'technical', 'sales'];
function locationState() {
  const query = new URLSearchParams(location.search);
  return {
    design: query.get('design') === 'studio' ? 'studio' as const : 'monograph' as const,
    audience: audiences.includes(query.get('view') as Audience) ? query.get('view') as Audience : 'explore' as const,
    caseId: query.get('case'),
  };
}

function DesignExamples() {
  const [route, setRoute] = useState(locationState);
  const [profile, setProfile] = useState<DesignProfile | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const selected = profile?.cases.find(item => item.id === route.caseId);

  useEffect(() => {
    const update = () => setRoute(locationState());
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);

  useEffect(() => {
    let active = true;
    if (new URLSearchParams(location.search).get('dataset') !== 'private') { setProfile(demoProfile); return; }
    if (!import.meta.env.DEV || location.hostname !== '127.0.0.1') {
      setError('This profile is available only in the enabled local preview.'); return;
    }
    fetch('/__mosaic_design_profile', { cache: 'no-store', credentials: 'same-origin' })
      .then(async response => {
        if (!response.ok) throw new Error('The local profile is unavailable. Start the private design preview with its local profile file.');
        const value: DesignProfile = await response.json();
        if (value.private !== true || !value.name || !Array.isArray(value.cases) || !value.cases.length) throw new Error('Unexpected profile data.');
        if (active) setProfile(value);
      }).catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    document.title = profile ? `${profile.name} — ${route.design === 'monograph' ? 'Monograph' : 'Studio'}` : 'Portfolio — design studies';
  }, [profile, route.design]);

  useEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal();
    if (!selected && dialog.current?.open) dialog.current?.close();
  }, [selected]);

  function navigate(next: Partial<typeof route>, scroll = false) {
    const value = { ...route, ...next };
    const url = new URL(location.href);
    url.searchParams.set('design', value.design);
    url.searchParams.set('view', value.audience);
    if (value.caseId) url.searchParams.set('case', value.caseId); else url.searchParams.delete('case');
    history.pushState(null, '', url);
    setRoute(value);
    if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function openCase(id: string) {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    navigate({ caseId: id });
  }
  function closeCase() {
    navigate({ caseId: null });
    requestAnimationFrame(() => opener.current?.isConnected && opener.current.focus());
  }
  function setAudience(audience: Audience) { navigate({ audience, caseId: null }, true); }
  async function share() {
    try { await navigator.clipboard.writeText(location.href); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
    catch { setCopied(false); window.prompt('Copy this view’s link', location.href); }
  }
  return <div className={`design-study design-study--${route.design}`}>
    <div className="study-bar" aria-label="Design comparison">
      <span className="study-label">Design studies <span aria-hidden="true">/</span> <span>{profile?.private ? 'Local profile' : 'Fictional sample content'}</span></span>
      <div className="study-variants" aria-label="Choose design">
        {(['monograph', 'studio'] as DesignKind[]).map(design => <button type="button" key={design} aria-pressed={route.design === design} onClick={() => navigate({ design, caseId: null }, true)}>{design === 'monograph' ? 'Monograph' : 'Studio'}<span aria-hidden="true">↗</span></button>)}
      </div>
      <button type="button" className="study-share" onClick={share}>{copied ? 'Link copied' : 'Copy view link'}</button>
    </div>
    {error ? <main className="study-error"><h1>Local profile unavailable</h1><p>{error}</p><a href="?design=monograph">Open the fictional design example</a></main>
      : !profile ? <main className="study-error"><h1>Opening the studio…</h1></main>
      : route.design === 'monograph' ? <Monograph profile={profile} audience={route.audience} onAudience={setAudience} onCase={openCase} />
      : <Studio profile={profile} audience={route.audience} onAudience={setAudience} onCase={openCase} />}
    <dialog className="study-case" ref={dialog} aria-labelledby="study-case-title" onCancel={event => { event.preventDefault(); closeCase(); }} onClick={event => { if (event.target === event.currentTarget) closeCase(); }}>
      {selected && <article>
        <header><span>{selected.sourceLabel}</span><button type="button" onClick={closeCase} aria-label="Close case">Close ×</button></header>
        <p className="study-case-meta">{selected.organization} · {selected.period}</p>
        <h1 id="study-case-title">{selected.title}</h1><p className="study-case-summary">{selected.summary}</p>
        <div className="study-case-columns"><div><h2>The situation and approach</h2>{selected.details.map((text, index) => <p key={index}>{text}</p>)}</div>
          <aside><h2>My contribution</h2><p>{selected.contribution}</p><h2>What changed</h2><p>{selected.outcome}</p></aside></div>
        <section className="study-case-limit"><h2>Scope of the account</h2><p>{selected.limit}</p></section>
        <footer><div>{selected.tools.map(tool => <span key={tool}>{tool}</span>)}</div><button type="button" onClick={() => setAudience('technical')}>See technical context ↗</button></footer>
      </article>}
    </dialog>
    <div aria-live="polite" className="study-sr-only">{copied ? 'View link copied.' : ''}</div>
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><DesignExamples /></React.StrictMode>);
