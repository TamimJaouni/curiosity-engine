'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const fallbackConcepts = [
  {
    id:'hysteresis', name:'Hysteresis', field:'Economics',
    short:'Temporary shocks can leave persistent effects even after the original shock disappears.',
    example:'A recession keeps workers unemployed long enough that some lose skills and remain unemployed even after demand recovers.',
    why:'It changes how we think about recessions, labor markets, and whether temporary policy support can prevent permanent damage.',
    deep:'Hysteresis describes systems whose present state depends partly on their history. In economics, temporary disturbances can alter the later path of employment, investment, skills, and expectations.',
    alternate:'Think of hysteresis as a dent rather than a bounce. Some shocks leave structural traces after the initial pressure is gone.'
  },
  {
    id:'moral-luck', name:'Moral Luck', field:'Philosophy',
    short:'We often judge people differently because of outcomes or circumstances they did not fully control.',
    example:'Two equally reckless drivers behave the same way, but only one happens to cause a fatal accident.',
    why:'It exposes a tension between moral responsibility and the role of luck.',
    deep:'Moral luck asks why praise and blame often depend on factors outside a person’s control.',
    alternate:'We want responsibility to track control, yet our actual moral judgments often track consequences too.'
  },
  {
    id:'allostasis', name:'Allostasis', field:'Neuroscience · Psychology',
    short:'The body regulates itself partly by anticipating future demands rather than merely correcting deviations after they occur.',
    example:'Your heart rate can rise before a stressful presentation, preparing you before physical demand arrives.',
    why:'It connects prediction, stress, physiology, and adaptation.',
    deep:'Allostasis means regulation through change. The body anticipates demands and adjusts before the challenge fully arrives.',
    alternate:'Homeostasis looks like a thermostat correcting errors. Allostasis adds prediction.'
  }
];

const fallbackEssays = [
  { id:'predictive-processing', title:'Predictive Processing', field:'Neuroscience · Philosophy', minutes:20, teaser:'How brains may use prediction and prediction error to construct perception and guide action.' },
  { id:'moral-luck', title:'Moral Luck', field:'Philosophy', minutes:16, teaser:'Why responsibility becomes difficult when outcomes depend on luck.' }
];

const news = [
  {
    id:'rates',
    title:'Central banks are balancing inflation control against weaker growth',
    tag:'Economics',
    happened:'A cluster of recent policy decisions has kept attention on how quickly major central banks can normalize interest rates without reigniting inflation or worsening a slowdown.',
    matters:'Interest-rate decisions affect borrowing costs, currencies, housing, investment, government finances, and expectations. The important issue is not a single rate move but the changing policy regime.',
    larger:'This connects to inflation expectations, central-bank credibility, the business cycle, and the political tension between price stability and employment.',
    watch:'Watch incoming inflation, wage, labor-market, and growth data, and whether central-bank communication shifts before actual policy does.'
  },
  {
    id:'industrial-policy',
    title:'Industrial policy is becoming a larger part of economic strategy',
    tag:'Politics · Economics',
    happened:'Governments are increasingly using subsidies, procurement rules, trade restrictions, and strategic investment to shape sectors considered important for resilience, technology, energy, or security.',
    matters:'This marks a partial shift away from a policy style that treated sectoral allocation as something governments should influence only sparingly.',
    larger:'The larger issue is the changing boundary between markets and states: efficiency versus resilience, national security, supply-chain dependence, and geopolitical competition.',
    watch:'Watch whether these policies create durable productive capacity, trigger retaliation, or mainly redistribute rents toward politically favored industries.'
  }
];

const fields = ['Mind & Behavior','Philosophy & Ideas','Economics','Politics & Institutions','Science & Technology','Society & Culture'];

function Pill({ children }) {
  return <span className="pill">{children}</span>;
}

function SectionTitle({ eyebrow, title, copy }) {
  return <div className="section-title"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{copy && <p>{copy}</p>}</div>;
}

function AppButton({ children, variant='primary', onClick, disabled=false, type='button' }) {
  return <button type={type} disabled={disabled} onClick={onClick} className={'btn ' + variant}>{children}</button>;
}

export default function Home() {
  const [screen,setScreen] = useState('home');
  const [worldTab,setWorldTab] = useState('brief');
  const [selectedConcept,setSelectedConcept] = useState(null);
  const [deepMode,setDeepMode] = useState('deep');
  const [essay,setEssay] = useState(null);
  const [year,setYear] = useState('100');
  const [field,setField] = useState('Mind & Behavior');
  const [arcTopic,setArcTopic] = useState(null);

  const [conceptLibrary,setConceptLibrary] = useState(fallbackConcepts);
  const [essayLibrary,setEssayLibrary] = useState(fallbackEssays);
  const [arcLibrary,setArcLibrary] = useState([]);
  const [graphCounts,setGraphCounts] = useState({nodes:0,edges:0});
  const [catalogLoading,setCatalogLoading] = useState(true);

  const [session,setSession] = useState(null);
  const [authOpen,setAuthOpen] = useState(false);
  const [authMode,setAuthMode] = useState('login');
  const [authEmail,setAuthEmail] = useState('');
  const [authPassword,setAuthPassword] = useState('');
  const [authBusy,setAuthBusy] = useState(false);
  const [authMessage,setAuthMessage] = useState('');

  const [progress,setProgress] = useState({explored:[],generated:[],recall:{}});
  const [flashcards,setFlashcards] = useState([]);
  const [flashIndex,setFlashIndex] = useState(0);
  const [flashRevealed,setFlashRevealed] = useState(false);

  useEffect(() => {
    loadCatalog();

    supabase.auth.getSession().then(({data}) => {
      const s = data?.session || null;
      setSession(s);
      if (s?.user) loadUserState(s.user.id);
    });

    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) loadUserState(nextSession.user.id);
      else {
        setProgress({explored:[],generated:[],recall:{}});
        setFlashcards([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadCatalog() {
    setCatalogLoading(true);

    const [conceptResult,essayResult,arcResult,nodeResult,edgeResult] = await Promise.all([
      supabase.from('concepts').select('*').order('created_at',{ascending:true}),
      supabase.from('essay_topics').select('*').order('created_at',{ascending:true}),
      supabase.from('long_arc_topics').select('*').order('historical_band',{ascending:true}).order('anchor_year',{ascending:true}),
      supabase.from('knowledge_nodes').select('*',{count:'exact',head:true}),
      supabase.from('knowledge_edges').select('*',{count:'exact',head:true})
    ]);

    if (conceptResult.data?.length) {
      setConceptLibrary(conceptResult.data.map(c => ({
        id:c.id,
        name:c.name,
        field:[c.primary_field,...(c.secondary_fields || [])].join(' · '),
        short:c.short_description,
        example:c.example,
        why:c.why_it_matters,
        deep:c.deep_explanation || c.short_description,
        alternate:c.alternate_explanation || c.why_it_matters,
        related:c.related_concepts || []
      })));
    }

    if (essayResult.data?.length) {
      setEssayLibrary(essayResult.data.map(e => ({
        id:e.id,
        title:e.title,
        field:[e.primary_field,...(e.secondary_fields || [])].join(' · '),
        minutes:e.target_minutes,
        teaser:e.teaser
      })));
    }

    if (arcResult.data) setArcLibrary(arcResult.data);
    setGraphCounts({nodes:nodeResult.count || 0,edges:edgeResult.count || 0});
    setCatalogLoading(false);
  }

  async function loadUserState(userId) {
    const [progressResult,cardsResult] = await Promise.all([
      supabase.from('user_progress').select('*').eq('user_id',userId),
      supabase.from('flashcards')
        .select('id,concept_id,state,interval_days,next_review_at,last_reviewed_at,times_reviewed,times_got_it,concept:concepts(id,name,primary_field,secondary_fields,short_description,example)')
        .eq('user_id',userId)
        .order('next_review_at',{ascending:true})
    ]);

    const rows = progressResult.data || [];
    const explored = rows.filter(r => r.item_type === 'concept' && ['explored','completed','saved'].includes(r.status)).map(r => r.item_id);
    const generated = rows.filter(r => r.item_type === 'essay').map(r => r.item_id);
    const recall = {};

    for (const card of cardsResult.data || []) {
      if (card.state !== 'new') recall[card.concept_id] = card.state;
    }

    setProgress({explored:[...new Set(explored)],generated:[...new Set(generated)],recall});
    setFlashcards(cardsResult.data || []);
    setFlashIndex(0);
  }

  async function saveProgress(itemType,itemId,status,progressPercent=0) {
    if (!session?.user) return;
    await supabase.from('user_progress').upsert({
      user_id:session.user.id,
      item_type:itemType,
      item_id:itemId,
      status,
      progress_percent:progressPercent,
      last_opened_at:new Date().toISOString(),
      completed_at:status === 'completed' ? new Date().toISOString() : null
    },{onConflict:'user_id,item_type,item_id'});
  }

  async function ensureFlashcard(conceptId) {
    if (!session?.user) return;
    await supabase.from('flashcards').upsert({
      user_id:session.user.id,
      concept_id:conceptId
    },{onConflict:'user_id,concept_id',ignoreDuplicates:true});
  }

  const dailyIds = ['hysteresis','moral-luck','allostasis'];
  const dailyConcepts = useMemo(() => {
    const preferred = dailyIds.map(id => conceptLibrary.find(c => c.id === id)).filter(Boolean);
    return preferred.length === 3 ? preferred : conceptLibrary.slice(0,3);
  },[conceptLibrary]);

  const activeArc = useMemo(
    () => arcLibrary.filter(t => String(t.historical_band) === year && t.primary_field === field),
    [arcLibrary,year,field]
  );

  const dueFlashcards = useMemo(
    () => flashcards.filter(f => new Date(f.next_review_at) <= new Date()),
    [flashcards]
  );

  const currentFlashcard = dueFlashcards.length ? dueFlashcards[flashIndex % dueFlashcards.length] : null;
  const reviewConcept = currentFlashcard?.concept ? {
    id:currentFlashcard.concept.id,
    name:currentFlashcard.concept.name,
    field:[currentFlashcard.concept.primary_field,...(currentFlashcard.concept.secondary_fields || [])].join(' · '),
    short:currentFlashcard.concept.short_description,
    example:currentFlashcard.concept.example
  } : null;

  async function openConcept(c) {
    setSelectedConcept(c);
    setDeepMode('deep');
    setProgress(p => ({...p,explored:p.explored.includes(c.id) ? p.explored : [...p.explored,c.id]}));
    await saveProgress('concept',c.id,'explored');
    if (session?.user) {
      await ensureFlashcard(c.id);
      await loadUserState(session.user.id);
    }
  }

  async function generateEssay(item) {
    setEssay(item);
    setProgress(p => ({...p,generated:p.generated.includes(item.id) ? p.generated : [...p.generated,item.id]}));
    await saveProgress('essay',item.id,'started');
    setScreen('essay-reader');
  }

  async function rateFlashcard(rating) {
    if (!currentFlashcard || !session?.user) return;

    const old = currentFlashcard.interval_days || 0;
    let nextInterval = 1;
    if (rating === 'fuzzy') nextInterval = old <= 3 ? 3 : Math.max(3,Math.round(old * .6));
    if (rating === 'got_it') {
      if (old < 14) nextInterval = 14;
      else if (old < 30) nextInterval = 30;
      else if (old < 90) nextInterval = 90;
      else nextInterval = 180;
    }

    const next = new Date();
    next.setDate(next.getDate() + nextInterval);

    await supabase.from('flashcards').update({
      state:rating,
      interval_days:nextInterval,
      next_review_at:next.toISOString(),
      last_reviewed_at:new Date().toISOString(),
      times_reviewed:(currentFlashcard.times_reviewed || 0) + 1,
      times_got_it:(currentFlashcard.times_got_it || 0) + (rating === 'got_it' ? 1 : 0)
    }).eq('id',currentFlashcard.id);

    await supabase.from('review_history').insert({
      user_id:session.user.id,
      flashcard_id:currentFlashcard.id,
      rating
    });

    setProgress(p => ({...p,recall:{...p.recall,[currentFlashcard.concept_id]:rating}}));
    setFlashRevealed(false);
    await loadUserState(session.user.id);
  }

  async function submitAuth(e) {
    e.preventDefault();
    setAuthBusy(true);
    setAuthMessage('');

    let result;
    if (authMode === 'signup') {
      result = await supabase.auth.signUp({
        email:authEmail,
        password:authPassword,
        options:{emailRedirectTo:window.location.origin}
      });
    } else {
      result = await supabase.auth.signInWithPassword({email:authEmail,password:authPassword});
    }

    if (result.error) {
      setAuthMessage(result.error.message);
    } else if (result.data?.session) {
      setAuthMessage('Synced.');
      setAuthOpen(false);
      setAuthPassword('');
    } else {
      setAuthMessage('Account created. Check your email if confirmation is required, then sign in.');
      setAuthMode('login');
    }

    setAuthBusy(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setAuthOpen(false);
  }

  const nav = [
    ['home','Home'],
    ['essays','Essays'],
    ['concepts','3 Concepts'],
    ['world','World'],
    ['review','Review']
  ];

  return <main>
    <header className="topbar">
      <button className="wordmark" onClick={() => setScreen('home')}><span>IO</span><strong>Intellectual OS</strong></button>
      <div className="top-meta">
        {session?.user ? <>
          <span>Synced</span>
          <button className="sync-button" onClick={signOut}>Sign out</button>
        </> : <button className="sync-button" onClick={() => setAuthOpen(true)}>Sign in to sync</button>}
      </div>
    </header>

    <div className="app-shell">
      <aside className="sidebar">
        <div className="side-label">LEARN</div>
        {nav.map(([id,label]) => <button key={id} className={screen===id?'active':''} onClick={() => setScreen(id)}>{label}</button>)}
        <div className="side-note"><b>Long game</b><span>{session?.user ? 'Your progress is synced.' : 'Sign in once to carry progress across devices.'}</span></div>
      </aside>

      <section className="content">
        {screen==='home' && <div className="home-sanctuary">
          <section className="home-hero">
            <div className="home-kicker"><span className="pulse-dot"></span> DAILY PRACTICE</div>
            <h1>Your mind is a long project.</h1>
            <p className="home-manifesto">You do not need to know everything today. You need to keep returning to difficult ideas until the world becomes more legible, your judgments become sharper, and your curiosity becomes harder to exhaust.</p>
            <div className="home-credo">Build a mind that can hold complexity without losing clarity.</div>
          </section>

          <section className="home-principles">
            <article><span>01</span><h3>Go deeper than the headline.</h3><p>Prefer mechanisms, history, evidence, and competing explanations over the comfort of a quick opinion.</p></article>
            <article><span>02</span><h3>Collect models, not trivia.</h3><p>A useful concept should change what you notice elsewhere. The point is connection, not accumulation.</p></article>
            <article><span>03</span><h3>Return until it becomes yours.</h3><p>Ideas become part of your thinking through repeated encounters, not through one impressive reading session.</p></article>
          </section>

          <section className="home-progress">
            <div className="progress-copy">
              <small>YOUR LONG GAME</small>
              <h2>Compounding quietly.</h2>
              <p>No feed to clear. No streak to defend. The only aim is to leave each month with a richer map of the world than you had before.</p>
            </div>
            <div className="progress-stats">
              <div><b>{progress.explored.length}</b><span>ideas explored</span></div>
              <div><b>{progress.generated.length}</b><span>deep dives saved</span></div>
              <div><b>{Object.keys(progress.recall).length}</b><span>ideas revisited</span></div>
            </div>
          </section>

          <div className="home-closing"><span className="home-rule"></span><p>{session?.user ? 'Progress is now stored in Supabase and follows your account.' : 'Sign in to make this progress follow you across iPhone, iPad, and desktop.'}</p></div>
        </div>}

        {screen==='essays' && <>
          <SectionTitle eyebrow="PART I · DEEP ESSAYS" title="Understand something properly." copy="The curriculum now comes from the database. Full API generation is the next phase." />
          <div className="list-grid">
            {essayLibrary.map(e => <article key={e.id} className="topic-row">
              <div><Pill>{e.field}</Pill><h3>{e.title}</h3><p>{e.teaser}</p><small>≈ {e.minutes} min</small></div>
              <AppButton onClick={() => generateEssay(e)}>Generate Full Essay</AppButton>
            </article>)}
          </div>
        </>}

        {screen==='concepts' && <>
          <SectionTitle eyebrow="PART II · DISCOVER" title="Three concepts of the day." copy={catalogLoading ? 'Loading the curated concept library…' : 'These cards are now coming from Supabase rather than hard-coded page data.'} />
          <div className="concept-grid">
            {dailyConcepts.map(c => <article key={c.id} className="concept">
              <Pill>{c.field}</Pill><h2>{c.name}</h2><p className="concept-short">{c.short}</p>
              <div className="example"><small>EXAMPLE</small><p>{c.example}</p></div>
              <div className="whyline"><small>WHY IT MATTERS</small><p>{c.why}</p></div>
              <div className="actions">
                <AppButton onClick={() => openConcept(c)}>Explore Deeply</AppButton>
                <AppButton variant="secondary" onClick={() => generateEssay({id:c.id,title:c.name,field:c.field,teaser:c.short,minutes:20})}>Generate Full Essay</AppButton>
              </div>
            </article>)}
          </div>
          {selectedConcept && <div className="drawer-backdrop" onClick={() => setSelectedConcept(null)}>
            <article className="drawer" onClick={e => e.stopPropagation()}>
              <div className="drawer-head"><div><Pill>{selectedConcept.field}</Pill><h2>{selectedConcept.name}</h2></div><button onClick={() => setSelectedConcept(null)}>×</button></div>
              <p className="deep-copy">{deepMode==='deep' ? selectedConcept.deep : selectedConcept.alternate}</p>
              <div className="actions">
                <AppButton variant="secondary" onClick={() => setDeepMode(deepMode==='deep'?'alternate':'deep')}>Generate Another Explanation</AppButton>
                <AppButton onClick={() => generateEssay({id:selectedConcept.id,title:selectedConcept.name,field:selectedConcept.field,teaser:selectedConcept.short,minutes:20})}>Generate Full Essay</AppButton>
              </div>
              <div className="evidence"><small>EVIDENCE LAYER · PREVIEW</small><div><Pill>Core idea: curated</Pill><Pill>Source layer arrives with research mode</Pill></div></div>
            </article>
          </div>}
        </>}

        {screen==='world' && <>
          <SectionTitle eyebrow="PART III · WORLD & CHANGE" title="Understand the present and the forces behind it." />
          <div className="tabs"><button className={worldTab==='brief'?'active':''} onClick={() => setWorldTab('brief')}>Daily Brief</button><button className={worldTab==='arc'?'active':''} onClick={() => setWorldTab('arc')}>Long Arc</button></div>

          {worldTab==='brief' && <div className="news-list">
            {news.map(n => <article className="news-card" key={n.id}>
              <Pill>{n.tag}</Pill><h2>{n.title}</h2>
              <div className="qa"><b>What happened?</b><p>{n.happened}</p></div>
              <div className="qa"><b>Why does it matter?</b><p>{n.matters}</p></div>
              <div className="qa"><b>What larger issue does it connect to?</b><p>{n.larger}</p></div>
              <div className="qa"><b>What should you watch next?</b><p>{n.watch}</p></div>
              <div className="actions"><AppButton variant="secondary">Explain More</AppButton><AppButton variant="secondary">Why Does This Matter Historically?</AppButton><AppButton>Full Deep Dive</AppButton></div>
            </article>)}
          </div>}

          {worldTab==='arc' && <div className="arc">
            <div className="yearbar">{['10','20','50','100','200','300','500'].map(y => <button key={y} className={year===y?'active':''} onClick={() => {setYear(y);setArcTopic(null)}}>{y}<span>years</span></button>)}</div>
            <div className="branch">
              <div className="branch-left"><small>CHOOSE FIELD</small>{fields.map(f => <button key={f} className={field===f?'active':''} onClick={() => {setField(f);setArcTopic(null)}}>{f}</button>)}</div>
              <div className="branch-right">
                <div className="branch-title"><small>{year} YEAR BAND</small><h2>{field}</h2></div>
                {activeArc.length ? activeArc.map(t => <button className="arc-topic" key={t.id} onClick={() => setArcTopic(t)}><span>{t.period_label}</span><h3>{t.title}</h3><p>{t.summary}</p><b>Open topic →</b></button>) : <div className="empty"><h3>Not populated yet.</h3><p>The branch exists in the database; we will expand the curriculum after the system is working end to end.</p></div>}
              </div>
            </div>
            {arcTopic && <div className="drawer-backdrop" onClick={() => setArcTopic(null)}><article className="drawer" onClick={e=>e.stopPropagation()}>
              <div className="drawer-head"><div><Pill>{field} · {arcTopic.period_label}</Pill><h2>{arcTopic.title}</h2></div><button onClick={() => setArcTopic(null)}>×</button></div>
              <p className="deep-copy">{arcTopic.summary}{arcTopic.why_it_matters ? '\n\nWhy it matters: ' + arcTopic.why_it_matters : ''}</p>
              <div className="actions"><AppButton onClick={() => saveProgress('long_arc',arcTopic.id,'explored')}>Understand the Shift</AppButton><AppButton variant="secondary">What Came Before?</AppButton><AppButton variant="secondary">What Did This Lead To?</AppButton><AppButton variant="secondary">Full Historical Deep Dive</AppButton></div>
            </article></div>}
          </div>}
        </>}

        {screen==='review' && <>
          <SectionTitle eyebrow="PART IV · REVIEW & MEMORY" title="Recall without homework." copy={session?.user ? 'Your review queue is now stored in the database.' : 'Sign in, then explore concepts. They will automatically enter your review queue.'} />
          <div className="review-layout">
            <article className="flashcard">
              {reviewConcept ? <>
                <small>FLASHCARD {flashIndex+1} / {dueFlashcards.length}</small>
                <Pill>{reviewConcept.field}</Pill>
                <h2>{reviewConcept.name}</h2>
                {!flashRevealed ? <><p>Do you remember what this means?</p><AppButton onClick={() => setFlashRevealed(true)}>Reveal</AppButton></> :
                <><p className="answer">{reviewConcept.short}</p><div className="example"><small>EXAMPLE</small><p>{reviewConcept.example}</p></div>
                <div className="recall-buttons">
                  <button onClick={() => rateFlashcard('forgot')}>Forgot</button>
                  <button onClick={() => rateFlashcard('fuzzy')}>Fuzzy</button>
                  <button onClick={() => rateFlashcard('got_it')}>Got it</button>
                </div></>}
              </> : <>
                <small>REVIEW QUEUE</small>
                <h2>{session?.user ? 'Nothing due.' : 'Sign in to sync.'}</h2>
                <p>{session?.user ? 'Explore a concept to add it automatically, or return when the next review becomes due.' : 'Your flashcards, intervals, and review history will follow your account across devices.'}</p>
                {!session?.user && <AppButton onClick={() => setAuthOpen(true)}>Sign in</AppButton>}
              </>}
            </article>

            <article className="month-card">
              <small>MONTHLY INTELLECTUAL REVIEW · LIVE METRICS</small><h2>September</h2>
              <div className="metric-grid">
                <div><b>{progress.explored.length}</b><span>concepts explored</span></div>
                <div><b>{progress.generated.length}</b><span>deep dives opened</span></div>
                <div><b>{Object.keys(progress.recall).length}</b><span>concepts reviewed</span></div>
              </div>
              <p>The monthly AI synthesis comes later. The underlying activity data is now structured and ready for it.</p>
            </article>
          </div>

          <article className="graph-preview">
            <small>KNOWLEDGE GRAPH · DATABASE</small>
            <h2>{graphCounts.nodes} nodes · {graphCounts.edges} curated connections</h2>
            <div className="graph-row"><span>Hysteresis</span><i>related to</i><span>Path Dependence</span><i>applied to</i><span>Unemployment</span></div>
            <p>The graph now exists in Supabase with canonical nodes and typed edges. We will make it interactive later.</p>
          </article>
        </>}

        {screen==='essay-reader' && essay && <>
          <button className="back-link" onClick={() => setScreen('essays')}>← Deep Essays</button>
          <article className="reader">
            <Pill>{essay.field}</Pill><h1>{essay.title}</h1><p className="lede">{essay.teaser}</p>
            <div className="reader-meta"><span>≈ {essay.minutes} min</span><span>{session?.user ? 'Opening saved to your account' : 'Sign in to save progress'}</span><span>Source layer planned</span></div>
            <h2>The central problem</h2><p>This is still the prototype reader. The topic and your reading state are now part of the real data model. In the next phase, this screen will stream the full generated essay and cache it in the generated_content table.</p>
            <h2>What is now real</h2><p>The curriculum lives in Supabase, the app can authenticate you, explored concepts create flashcards automatically, review intervals are stored, and progress can sync across devices under the same account.</p>
            <div className="source-box"><small>EVIDENCE & SOURCES</small><p><b>Research synthesis</b> · systematic reviews and major review papers</p><p><b>Primary material</b> · original studies, data, legislation, speeches, or historical documents</p><p><b>Interpretation</b> · clearly separated from empirical evidence</p></div>
          </article>
        </>}
      </section>
    </div>

    <nav className="bottom-nav">{nav.map(([id,label]) => <button key={id} className={screen===id?'active':''} onClick={() => setScreen(id)}><span>{label==='3 Concepts'?'Concepts':label}</span></button>)}</nav>

    {authOpen && <div className="auth-backdrop" onClick={() => setAuthOpen(false)}>
      <form className="auth-card" onSubmit={submitAuth} onClick={e => e.stopPropagation()}>
        <button className="auth-close" type="button" onClick={() => setAuthOpen(false)}>×</button>
        <small>PRIVATE SYNC</small>
        <h2>{authMode === 'login' ? 'Sign in.' : 'Create your account.'}</h2>
        <p>Use the same account on iPhone, iPad, and desktop and your learning state follows you.</p>
        <label>Email<input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} autoComplete="email" /></label>
        <label>Password<input type="password" required minLength="6" value={authPassword} onChange={e => setAuthPassword(e.target.value)} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} /></label>
        {authMessage && <div className="auth-message">{authMessage}</div>}
        <AppButton type="submit" disabled={authBusy}>{authBusy ? 'Working…' : authMode === 'login' ? 'Sign in' : 'Create account'}</AppButton>
        <button className="auth-switch" type="button" onClick={() => {setAuthMode(authMode === 'login' ? 'signup' : 'login');setAuthMessage('')}}>{authMode === 'login' ? 'Need an account? Create one' : 'Already have an account? Sign in'}</button>
      </form>
    </div>}
  </main>;
}
