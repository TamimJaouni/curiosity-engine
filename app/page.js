'use client';

import { useEffect, useMemo, useState } from 'react';

const concepts = [
  {
    id: 'hysteresis',
    name: 'Hysteresis',
    field: 'Economics',
    short: 'Temporary shocks can leave persistent effects even after the original shock disappears.',
    example: 'A recession keeps workers unemployed long enough that some lose skills and remain unemployed even after demand recovers.',
    why: 'It changes how we think about recessions, labor markets, and whether temporary policy support can prevent permanent damage.',
    deep: 'Hysteresis describes systems whose present state depends partly on their history. In economics, it is most often used to explain why a temporary disturbance can change the path of an economy for years. A severe recession may reduce investment, break employer–worker matches, push people out of the labor force, and weaken skills. When demand later returns, the economy may not simply snap back to its previous trajectory.\n\nThe important idea is that the economy has memory. That distinguishes hysteresis from a model in which shocks are temporary deviations around a stable equilibrium. It also matters for policy: if downturns can cause lasting damage, then preventing a deep recession may have benefits that continue long after emergency support ends.\n\nA useful connection is path dependence. Both concepts emphasize history, but path dependence is broader: earlier events shape which future states are reachable. Hysteresis focuses more specifically on persistence after a disturbance. The empirical strength of hysteresis varies by country, period, and labor market, so it should not be treated as a universal law.',
    alternate: 'Think of hysteresis as a dent rather than a bounce. If you press a rubber ball, it returns to shape; if you dent thin metal, removing your hand does not undo the change. Some economic shocks look more like the metal. A downturn can close firms, interrupt careers, reduce capital formation, and alter expectations. Even after the original cause disappears, those secondary effects remain.\n\nThis matters because two economies exposed to the same current conditions may behave differently if their recent histories differ. It also complicates the idea of a single “normal” unemployment rate. A long period of weak demand may itself change what normal looks like.\n\nThe concept connects economics with neuroscience and psychology, where repeated experience can also alter later responses. The analogy is not exact, but the common structure is useful: systems can be changed by what happens to them.'
  },
  {
    id: 'moral-luck',
    name: 'Moral Luck',
    field: 'Philosophy',
    short: 'We often judge people differently because of outcomes or circumstances they did not fully control.',
    example: 'Two equally reckless drunk drivers behave the same way, but only one happens to hit a pedestrian. We usually judge that driver more harshly.',
    why: 'It exposes a tension between our belief that responsibility should track control and our actual moral judgments.',
    deep: 'Moral luck is the problem that moral judgment often depends on factors outside an agent’s control. If two people make the same reckless choice but only one causes harm because of chance, our judgments typically diverge. Yet many theories of responsibility say people should be judged only for what they control.\n\nThe problem expands beyond outcomes. We do not choose our genes, family, early environment, historical moment, or many of the pressures that shape our character. Once taken seriously, this raises a difficult question: how much of what we praise or blame is genuinely attributable to the person rather than to luck?\n\nThe point is not that responsibility disappears. Rather, moral luck forces us to distinguish intention, character, action, consequence, and circumstance. Legal systems already do this imperfectly by separating attempt from completed harm while still treating outcomes as relevant. The concept connects directly to free will, criminal responsibility, inequality, and political debates about desert.',
    alternate: 'Moral luck begins with an uncomfortable observation: we want morality to be fair, but luck keeps entering the picture. Imagine two negligent builders who make the same mistake. In one building nobody is hurt; in the other, an unlikely chain of events causes a death. Their negligence was identical, yet our response to them may not be.\n\nThis shows that moral judgment serves several functions at once. It evaluates intention, expresses social condemnation, responds to actual harm, and helps communities assign responsibility. Those functions do not always point in the same direction.\n\nThe concept also connects with economics and politics. Debates about merit, inheritance, poverty, and punishment often depend on hidden assumptions about how much people control the conditions that shape their outcomes.'
  },
  {
    id: 'allostasis',
    name: 'Allostasis',
    field: 'Neuroscience · Psychology',
    short: 'The body regulates itself partly by anticipating future demands rather than merely correcting deviations after they occur.',
    example: 'Your heart rate can rise before a stressful presentation, preparing your body before any physical threat has happened.',
    why: 'It reframes regulation as predictive and helps connect stress, physiology, emotion, and adaptation.',
    deep: 'Allostasis is regulation through change. Instead of imagining the body as maintaining one fixed internal state, the concept emphasizes anticipatory adjustment. Your physiology shifts depending on what the brain expects you will need: heart rate, hormone levels, energy use, attention, and immune activity can all be altered in advance of demand.\n\nThis is useful for understanding stress. A stress response is not simply a malfunction; it is often an adaptive prediction that resources will soon be required. Problems arise when costly responses are repeatedly activated or poorly matched to actual conditions. Researchers sometimes discuss the cumulative burden of repeated adaptation as allostatic load.\n\nAllostasis connects naturally to predictive processing and interoception. The brain must estimate both the state of the body and what the body will soon require. The framework is influential, but specific claims about how broadly it explains disease or behavior need to be evaluated separately rather than treating allostasis as a catch-all explanation.',
    alternate: 'Homeostasis is often pictured as a thermostat: temperature drifts, the system notices, and then corrects it. Allostasis adds prediction. A good organism does not wait until resources are depleted; it changes physiology before the demand arrives.\n\nThat means the “right” internal state depends on context. A lower heart rate may be appropriate while resting, while a higher one is useful before exertion. Regulation is therefore dynamic rather than fixed.\n\nThe concept becomes especially powerful when thinking about chronic stress. If the organism repeatedly predicts danger, it may repeatedly mobilize energy and cardiovascular resources. Even adaptive short-term responses can become costly when maintained too often or too long.'
  }
];

const essays = [
  { id: 'predictive-processing', title: 'Predictive Processing', field: 'Neuroscience · Philosophy', minutes: 20, teaser: 'How brains may use prediction and prediction error to construct perception and guide action.' },
  { id: 'loss-aversion', title: 'Loss Aversion', field: 'Psychology · Economics', minutes: 18, teaser: 'Why losses can loom larger than comparable gains, and where the idea is stronger or weaker than popular accounts suggest.' },
  { id: 'moral-luck', title: 'Moral Luck', field: 'Philosophy', minutes: 16, teaser: 'Why responsibility becomes difficult when outcomes depend on luck.' },
  { id: 'polycentric-governance', title: 'Polycentric Governance', field: 'Political Science · Economics', minutes: 20, teaser: 'How multiple centers of decision-making can coordinate without a single controlling authority.' }
];

const news = [
  {
    id: 'rates',
    title: 'Central banks are balancing inflation control against weaker growth',
    tag: 'Economics',
    happened: 'A cluster of recent policy decisions has kept attention on how quickly major central banks can normalize interest rates without reigniting inflation or worsening a slowdown.',
    matters: 'Interest-rate decisions affect borrowing costs, currencies, housing, investment, government finances, and expectations. The important issue is not a single rate move but the changing policy regime.',
    larger: 'This connects to inflation expectations, central-bank credibility, the business cycle, and the political tension between price stability and employment.',
    watch: 'Watch incoming inflation, wage, labor-market, and growth data, and whether central-bank communication shifts before actual policy does.'
  },
  {
    id: 'industrial-policy',
    title: 'Industrial policy is becoming a larger part of economic strategy',
    tag: 'Politics · Economics',
    happened: 'Governments are increasingly using subsidies, procurement rules, trade restrictions, and strategic investment to shape sectors considered important for resilience, technology, energy, or security.',
    matters: 'This marks a partial shift away from a policy style that treated sectoral allocation as something governments should influence only sparingly.',
    larger: 'The larger issue is the changing boundary between markets and states: efficiency versus resilience, national security, supply-chain dependence, and geopolitical competition.',
    watch: 'Watch whether these policies create durable productive capacity, trigger retaliation, or mainly redistribute rents toward politically favored industries.'
  }
];

const longArc = {
  '20': {
    'Mind & Behavior': [
      { title: 'The Replication Crisis', period: 'c. 2011–2018', summary: 'Large replication efforts exposed weaknesses in parts of experimental psychology and accelerated reforms in research practice.' },
      { title: 'The Mainstreaming of Behavioral Science', period: 'c. 2006–2016', summary: 'Behavioral insights moved from specialist research into policy, business, and public discussion.' }
    ],
    'Politics & Institutions': [
      { title: 'The Platformization of Political Communication', period: 'c. 2008–2016', summary: 'Social platforms became major infrastructures for political messaging, mobilization, and information competition.' }
    ]
  },
  '50': {
    'Economics': [
      { title: 'The Neoliberal Turn', period: 'c. 1979–1995', summary: 'Privatization, deregulation, inflation control, and market-oriented reforms became more influential across many economies.' }
    ],
    'Science & Technology': [
      { title: 'The Personal Computing Revolution', period: 'c. 1977–2000', summary: 'Computing moved from institutions into homes and workplaces, reshaping productivity, communication, and culture.' }
    ]
  },
  '100': {
    'Mind & Behavior': [
      { title: 'The Cognitive Revolution', period: 'c. 1945–1970', summary: 'Psychology increasingly returned to internal processes such as memory, language, attention, and representation.' },
      { title: 'The Rise of Modern Psychopharmacology', period: 'c. 1950–1975', summary: 'New psychiatric drugs transformed treatment and changed theories about the biological basis of mental disorders.' }
    ],
    'Economics': [
      { title: 'The Keynesian Revolution', period: 'c. 1930–1950', summary: 'Macroeconomics was reshaped around aggregate demand, unemployment, and a larger stabilization role for government.' }
    ],
    'Politics & Institutions': [
      { title: 'Decolonization', period: 'c. 1945–1975', summary: 'European empires contracted rapidly as dozens of new states emerged across Asia, Africa, and the Middle East.' }
    ]
  },
  '500': {
    'Philosophy & Ideas': [
      { title: 'The Scientific Revolution', period: 'c. 1540–1700', summary: 'New methods, instruments, institutions, and mathematical approaches transformed natural philosophy into early modern science.' }
    ],
    'Politics & Institutions': [
      { title: 'The Rise of the Fiscal-Military State', period: 'c. 1550–1700', summary: 'European states built stronger taxation, borrowing, and administrative systems to sustain increasingly expensive warfare.' }
    ]
  }
};

const fields = ['Mind & Behavior','Philosophy & Ideas','Economics','Politics & Institutions','Science & Technology','Society & Culture'];

function Pill({ children }) {
  return <span className="pill">{children}</span>;
}

function SectionTitle({ eyebrow, title, copy }) {
  return <div className="section-title"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{copy && <p>{copy}</p>}</div>;
}

function AppButton({ children, variant='primary', onClick, disabled=false }) {
  return <button disabled={disabled} onClick={onClick} className={'btn ' + variant}>{children}</button>;
}

export default function Home() {
  const [screen, setScreen] = useState('home');
  const [worldTab, setWorldTab] = useState('brief');
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [deepMode, setDeepMode] = useState('deep');
  const [essay, setEssay] = useState(null);
  const [year, setYear] = useState('100');
  const [field, setField] = useState('Mind & Behavior');
  const [arcTopic, setArcTopic] = useState(null);
  const [flashIndex, setFlashIndex] = useState(0);
  const [flashRevealed, setFlashRevealed] = useState(false);
  const [progress, setProgress] = useState({ explored: [], generated: [], recall: {} });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ios-progress') || 'null');
      if (saved) setProgress(saved);
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('ios-progress', JSON.stringify(progress)); } catch {}
  }, [progress]);

  const markExplored = (id) => {
    setProgress(p => ({ ...p, explored: p.explored.includes(id) ? p.explored : [...p.explored, id] }));
  };

  const openConcept = (c) => {
    setSelectedConcept(c);
    setDeepMode('deep');
    markExplored(c.id);
  };

  const generateEssay = (item) => {
    setEssay(item);
    setProgress(p => ({ ...p, generated: p.generated.includes(item.id) ? p.generated : [...p.generated, item.id] }));
    setScreen('essay-reader');
  };

  const activeArc = longArc[year]?.[field] || [];

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
      <div className="top-meta"><span>{progress.explored.length} explored</span><span>{progress.generated.length} essays</span></div>
    </header>

    <div className="app-shell">
      <aside className="sidebar">
        <div className="side-label">LEARN</div>
        {nav.map(([id,label]) => <button key={id} className={screen===id?'active':''} onClick={() => setScreen(id)}>{label}</button>)}
        <div className="side-note"><b>Long game</b><span>Read deeply. Connect widely. Return often.</span></div>
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
            <article>
              <span>01</span>
              <h3>Go deeper than the headline.</h3>
              <p>Prefer mechanisms, history, evidence, and competing explanations over the comfort of a quick opinion.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Collect models, not trivia.</h3>
              <p>A useful concept should change what you notice elsewhere. The point is connection, not accumulation.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Return until it becomes yours.</h3>
              <p>Ideas become part of your thinking through repeated encounters, not through one impressive reading session.</p>
            </article>
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

          <div className="home-closing">
            <span className="home-rule"></span>
            <p>Choose a direction when curiosity pulls you. The rest of the app is waiting in the navigation.</p>
          </div>
        </div>}

        {screen==='essays' && <>
          <SectionTitle eyebrow="PART I · DEEP ESSAYS" title="Understand something properly." copy="The final version will generate a 15–20 minute essay on demand and save it permanently." />
          <div className="list-grid">
            {essays.map(e => <article key={e.id} className="topic-row">
              <div><Pill>{e.field}</Pill><h3>{e.title}</h3><p>{e.teaser}</p><small>≈ {e.minutes} min</small></div>
              <AppButton onClick={() => generateEssay(e)}>Generate Full Essay</AppButton>
            </article>)}
          </div>
        </>}

        {screen==='concepts' && <>
          <SectionTitle eyebrow="PART II · DISCOVER" title="Three concepts of the day." copy="Short enough to scan. Deep enough to open a door." />
          <div className="concept-grid">
            {concepts.map(c => <article key={c.id} className="concept">
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
              <div className="evidence"><small>EVIDENCE LAYER · PREVIEW</small><div><Pill>Core idea: established</Pill><Pill>Broader implications: context dependent</Pill></div></div>
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
                {activeArc.length ? activeArc.map(t => <button className="arc-topic" key={t.title} onClick={() => setArcTopic(t)}><span>{t.period}</span><h3>{t.title}</h3><p>{t.summary}</p><b>Open topic →</b></button>) : <div className="empty"><h3>Not populated in prototype v1.</h3><p>The branch works; we will expand the curriculum after the UX is locked.</p></div>}
              </div>
            </div>
            {arcTopic && <div className="drawer-backdrop" onClick={() => setArcTopic(null)}><article className="drawer" onClick={e=>e.stopPropagation()}>
              <div className="drawer-head"><div><Pill>{field} · {arcTopic.period}</Pill><h2>{arcTopic.title}</h2></div><button onClick={() => setArcTopic(null)}>×</button></div>
              <p className="deep-copy">{arcTopic.summary} The full version will explain the transition as <b>before → pressure/change → turning point → consequences</b>, while distinguishing documented facts from historical interpretation.</p>
              <div className="actions"><AppButton>Understand the Shift</AppButton><AppButton variant="secondary">What Came Before?</AppButton><AppButton variant="secondary">What Did This Lead To?</AppButton><AppButton variant="secondary">Full Historical Deep Dive</AppButton></div>
            </article></div>}
          </div>}
        </>}

        {screen==='review' && <>
          <SectionTitle eyebrow="PART IV · REVIEW & MEMORY" title="Recall without homework." copy="Reveal the answer, then tell the system whether it was forgotten, fuzzy, or solid." />
          <div className="review-layout">
            <article className="flashcard">
              <small>FLASHCARD {flashIndex+1} / {concepts.length}</small>
              <Pill>{concepts[flashIndex].field}</Pill>
              <h2>{concepts[flashIndex].name}</h2>
              {!flashRevealed ? <><p>Do you remember what this means?</p><AppButton onClick={() => setFlashRevealed(true)}>Reveal</AppButton></> :
              <><p className="answer">{concepts[flashIndex].short}</p><div className="example"><small>EXAMPLE</small><p>{concepts[flashIndex].example}</p></div>
              <div className="recall-buttons">{['Forgot','Fuzzy','Got it'].map(v => <button key={v} onClick={() => {setProgress(p=>({...p,recall:{...p.recall,[concepts[flashIndex].id]:v}}));setFlashRevealed(false);setFlashIndex((flashIndex+1)%concepts.length)}}>{v}</button>)}</div></>}
            </article>
            <article className="month-card">
              <small>MONTHLY INTELLECTUAL REVIEW · PREVIEW</small><h2>September</h2>
              <div className="metric-grid"><div><b>{progress.explored.length}</b><span>concepts explored</span></div><div><b>{progress.generated.length}</b><span>essays generated</span></div><div><b>{Object.keys(progress.recall).length}</b><span>concepts reviewed</span></div></div>
              <p>Your final monthly synthesis will identify recurring themes, durable concepts, weaker areas, and cross-field connections without pretending to measure “intelligence” with a fake score.</p>
            </article>
          </div>
          <article className="graph-preview"><small>KNOWLEDGE GRAPH · PREVIEW</small><h2>Connections become part of the product.</h2><div className="graph-row"><span>Hysteresis</span><i>related to</i><span>Path Dependence</span><i>applied to</i><span>Unemployment</span></div><p>The final system stores canonical nodes and typed relationships such as influenced, contrasts with, emerged from, led to, prerequisite for, and application of.</p></article>
        </>}

        {screen==='essay-reader' && essay && <>
          <button className="back-link" onClick={() => setScreen('essays')}>← Deep Essays</button>
          <article className="reader">
            <Pill>{essay.field}</Pill><h1>{essay.title}</h1><p className="lede">{essay.teaser}</p>
            <div className="reader-meta"><span>≈ {essay.minutes} min</span><span>Saved after generation</span><span>Source layer available</span></div>
            <h2>The central problem</h2><p>This prototype intentionally does not generate the full essay yet. In the API-connected version, this screen will stream a rigorous long-form essay using the fixed production prompt we designed, then save it so reopening the essay does not trigger another API call.</p>
            <h2>What the finished essay will do</h2><p>It will define the idea precisely, explain mechanisms and intellectual history, examine evidence and competing interpretations, use memorable examples, connect the topic across disciplines, identify unresolved questions, and finish with serious further reading.</p>
            <div className="source-box"><small>EVIDENCE & SOURCES</small><p><b>Research synthesis</b> · systematic reviews and major review papers</p><p><b>Primary material</b> · original studies, data, legislation, speeches, or historical documents</p><p><b>Interpretation</b> · clearly separated from empirical evidence</p></div>
          </article>
        </>}
      </section>
    </div>

    <nav className="bottom-nav">{nav.map(([id,label]) => <button key={id} className={screen===id?'active':''} onClick={() => setScreen(id)}><span>{label==='3 Concepts'?'Concepts':label}</span></button>)}</nav>
  </main>;
}
