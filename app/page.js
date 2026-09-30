'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const FIELD_META = {
  'History & Politics': { icon:'♜', desc:'Power, institutions, conflict, states and historical change.' },
  'Economics': { icon:'◫', desc:'Markets, incentives, money, growth and political economy.' },
  'Philosophy & Ideas': { icon:'◇', desc:'Reason, knowledge, ethics, mind, meaning and major traditions.' },
  'Mind & Behavior': { icon:'⌁', desc:'Psychology, cognition, neuroscience, learning and human behavior.' },
  'Society & Culture': { icon:'◉', desc:'Social structure, culture, identity, institutions and collective life.' },
  'Physics': { icon:'◎', desc:'Relativity, quantum physics, spacetime and the foundations of nature.' },
  'Future & Civilization': { icon:'✦', desc:'Realistic near- and long-term possibilities for technology, humanity, civilization and life beyond Earth.' }
};

const FALLBACK_CONCEPTS = [
  {id:'hysteresis',name:'Hysteresis',field:'Economics',short:'Temporary shocks can leave persistent effects even after the original shock disappears.'},
  {id:'moral-luck',name:'Moral Luck',field:'Philosophy & Ideas',short:'We often judge people differently because of outcomes or circumstances they did not fully control.'},
  {id:'allostasis',name:'Allostasis',field:'Mind & Behavior',short:'The body regulates itself partly by anticipating future demands rather than only correcting deviations.'}
];

async function fetchAllRows(table, orderColumn='sort_order') {
  const pageSize = 1000;
  let from = 0;
  let all = [];
  while (true) {
    const {data,error} = await supabase.from(table).select('*').order(orderColumn,{ascending:true}).range(from,from+pageSize-1);
    if (error) return {data:all,error};
    all = all.concat(data || []);
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return {data:all,error:null};
}

function fieldMeta(title) {
  return FIELD_META[title] || {icon:'◌',desc:'A connected territory in the knowledge map.'};
}

function MiniIcon({children}) {
  return <span className="mini-icon">{children}</span>;
}

export default function Home() {
  const [screen,setScreen] = useState('home');
  const [essayNodes,setEssayNodes] = useState([]);
  const [essayQuestions,setEssayQuestions] = useState([]);
  const [knowledgeNodes,setKnowledgeNodes] = useState([]);
  const [knowledgeEdges,setKnowledgeEdges] = useState([]);
  const [essayLinks,setEssayLinks] = useState([]);
  const [concepts,setConcepts] = useState(FALLBACK_CONCEPTS);
  const [catalogLoading,setCatalogLoading] = useState(true);

  const [selectedFieldId,setSelectedFieldId] = useState(null);
  const [expanded,setExpanded] = useState([]);
  const [selectedTopicId,setSelectedTopicId] = useState(null);
  const [topicTab,setTopicTab] = useState('overview');

  const [search,setSearch] = useState('');
  const [searchFocused,setSearchFocused] = useState(false);

  const [explanations,setExplanations] = useState({});
  const [explainLoading,setExplainLoading] = useState(null);
  const [explainErrors,setExplainErrors] = useState({});

  const [session,setSession] = useState(null);
  const [authOpen,setAuthOpen] = useState(false);
  const [authMode,setAuthMode] = useState('login');
  const [authEmail,setAuthEmail] = useState('');
  const [authPassword,setAuthPassword] = useState('');
  const [authMessage,setAuthMessage] = useState('');
  const [authBusy,setAuthBusy] = useState(false);

  useEffect(() => {
    loadCatalog();
    supabase.auth.getSession().then(({data}) => setSession(data?.session || null));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,nextSession) => setSession(nextSession));
    return () => subscription.unsubscribe();
  },[]);

  async function loadCatalog() {
    setCatalogLoading(true);
    const [nodes,questions,kNodes,edges,links,conceptResult] = await Promise.all([
      fetchAllRows('essay_nodes','sort_order'),
      fetchAllRows('essay_questions','sort_order'),
      fetchAllRows('knowledge_nodes','created_at'),
      fetchAllRows('knowledge_edges','created_at'),
      fetchAllRows('essay_node_knowledge_links','created_at'),
      supabase.from('concepts').select('*').order('created_at',{ascending:true}).limit(24)
    ]);

    setEssayNodes(nodes.data || []);
    setEssayQuestions(questions.data || []);
    setKnowledgeNodes(kNodes.data || []);
    setKnowledgeEdges(edges.data || []);
    setEssayLinks(links.data || []);

    if (conceptResult.data?.length) {
      setConcepts(conceptResult.data.slice(0,3).map(c => ({
        id:c.id,
        name:c.name,
        field:c.primary_field,
        short:c.short_description
      })));
    }

    const roots=(nodes.data || []).filter(n => !n.parent_id);
    if (roots[0]) setSelectedFieldId(roots[0].id);
    setExpanded(roots.map(r => r.id));
    setCatalogLoading(false);
  }

  const childrenByParent = useMemo(() => {
    const map={};
    for (const node of essayNodes) {
      const key=node.parent_id || 'root';
      if (!map[key]) map[key]=[];
      map[key].push(node);
    }
    return map;
  },[essayNodes]);

  const nodeById = useMemo(() => {
    const map={};
    for (const node of essayNodes) map[node.id]=node;
    return map;
  },[essayNodes]);

  const questionsByNode = useMemo(() => {
    const map={};
    for (const q of essayQuestions) {
      if (!map[q.node_id]) map[q.node_id]=[];
      map[q.node_id].push(q);
    }
    return map;
  },[essayQuestions]);

  const knowledgeById = useMemo(() => {
    const map={};
    for (const node of knowledgeNodes) map[node.id]=node;
    return map;
  },[knowledgeNodes]);

  const knowledgeIdsByEssay = useMemo(() => {
    const map={};
    for (const link of essayLinks) {
      if (!map[link.essay_node_id]) map[link.essay_node_id]=[];
      map[link.essay_node_id].push(link.knowledge_node_id);
    }
    return map;
  },[essayLinks]);

  const essayIdsByKnowledge = useMemo(() => {
    const map={};
    for (const link of essayLinks) {
      if (!map[link.knowledge_node_id]) map[link.knowledge_node_id]=[];
      map[link.knowledge_node_id].push(link.essay_node_id);
    }
    return map;
  },[essayLinks]);

  const edgesByKnowledge = useMemo(() => {
    const map={};
    for (const edge of knowledgeEdges) {
      if (edge.status === 'rejected') continue;
      if (!map[edge.source_id]) map[edge.source_id]=[];
      if (!map[edge.target_id]) map[edge.target_id]=[];
      map[edge.source_id].push({edge,direction:'out'});
      map[edge.target_id].push({edge,direction:'in'});
    }
    return map;
  },[knowledgeEdges]);

  const rootNodes = childrenByParent.root || [];
  const selectedField = nodeById[selectedFieldId] || rootNodes[0] || null;
  const selectedTopic = nodeById[selectedTopicId] || null;
  const approvedEdgeCount = knowledgeEdges.filter(e => e.status !== 'rejected').length;

  const searchResults = useMemo(() => {
    const term=search.trim().toLowerCase();
    if (term.length < 2) return [];
    return essayNodes
      .filter(n => n.title.toLowerCase().includes(term))
      .sort((a,b) => {
        const ax=a.title.toLowerCase().startsWith(term) ? 0 : 1;
        const bx=b.title.toLowerCase().startsWith(term) ? 0 : 1;
        return ax-bx || a.title.localeCompare(b.title);
      })
      .slice(0,8);
  },[search,essayNodes]);

  function relationLabel(type,direction) {
    const out={
      related_to:'RELATED TO',contrasts_with:'CONTRASTS WITH',prerequisite_for:'PREREQUISITE FOR',
      part_of:'PART OF',application_of:'APPLICATION OF',explains:'EXPLAINS',
      contributes_to:'CONTRIBUTES TO',influences:'INFLUENCES',
      historical_precursor_of:'PRECURSOR OF',instance_of:'INSTANCE OF'
    };
    const incoming={
      related_to:'RELATED TO',contrasts_with:'CONTRASTS WITH',prerequisite_for:'REQUIRES',
      part_of:'HAS PART',application_of:'HAS APPLICATION',explains:'EXPLAINED BY',
      contributes_to:'SHAPED BY',influences:'INFLUENCED BY',
      historical_precursor_of:'PRECEDED BY',instance_of:'HAS INSTANCE'
    };
    return (direction === 'out' ? out[type] : incoming[type]) || String(type || '').replaceAll('_',' ').toUpperCase();
  }

  function connectionsFor(node) {
    if (!node) return [];
    const currentKnowledge=knowledgeIdsByEssay[node.id] || [];
    const best=new Map();

    for (const knowledgeId of currentKnowledge) {
      for (const item of edgesByKnowledge[knowledgeId] || []) {
        const otherId=item.direction === 'out' ? item.edge.target_id : item.edge.source_id;
        if (currentKnowledge.includes(otherId)) continue;

        const candidateEssayIds=(essayIdsByKnowledge[otherId] || [])
          .filter(id => id !== node.id)
          .sort((a,b) => {
            const aCross=nodeById[a]?.primary_field !== node.primary_field ? 0 : 1;
            const bCross=nodeById[b]?.primary_field !== node.primary_field ? 0 : 1;
            return aCross-bCross;
          });

        const targetEssayId=candidateEssayIds[0];
        if (!targetEssayId || !nodeById[targetEssayId] || !knowledgeById[otherId]) continue;

        const candidate={
          id:otherId,
          title:knowledgeById[otherId].label,
          relation:relationLabel(item.edge.relation_type,item.direction),
          strength:item.edge.strength || 3,
          targetEssayId,
          field:nodeById[targetEssayId].primary_field
        };
        const previous=best.get(otherId);
        if (!previous || candidate.strength > previous.strength) best.set(otherId,candidate);
      }
    }

    return [...best.values()].sort((a,b) => b.strength-a.strength || a.title.localeCompare(b.title)).slice(0,8);
  }

  function pathFor(node) {
    const path=[];
    let current=node;
    while (current) {
      path.unshift(current);
      current=current.parent_id ? nodeById[current.parent_id] : null;
    }
    return path;
  }

  function openTopic(id,tab='overview') {
    const node=nodeById[id];
    if (!node) return;
    setSelectedTopicId(id);
    setSelectedFieldId(pathFor(node)[0]?.id || selectedFieldId);
    setTopicTab(tab);
    setScreen('topic');
    setSearch('');
    setSearchFocused(false);
  }

  function openField(id) {
    setSelectedFieldId(id);
    setExpanded(open => [...new Set([...open,id])]);
    setScreen('explore');
  }

  function toggle(id) {
    setExpanded(open => open.includes(id) ? open.filter(x => x !== id) : [...open,id]);
  }

  function renderExplorerNode(node,depth=0) {
    const children=childrenByParent[node.id] || [];
    const open=expanded.includes(node.id);
    return <div className="explorer-node" key={node.id}>
      <div className={'explorer-row ' + (selectedTopicId === node.id ? 'selected' : '')} style={{'--depth':depth}}>
        <button className="tree-toggle" onClick={() => children.length && toggle(node.id)}>
          {children.length ? (open ? '⌄' : '›') : '·'}
        </button>
        <button className="tree-title" onClick={() => openTopic(node.id)}>
          <MiniIcon>{depth === 0 ? fieldMeta(node.primary_field || node.title).icon : '▣'}</MiniIcon>
          <span>{node.title}</span>
        </button>
        <span className="tree-type">{String(node.node_type || '').replaceAll('_',' ')}</span>
      </div>
      {open && children.map(child => renderExplorerNode(child,depth+1))}
    </div>;
  }

  async function explainTopic(node) {
    if (!node || explainLoading) return;
    setTopicTab('explain');
    setExplainErrors(e => ({...e,[node.id]:null}));

    if (session?.user) {
      const {data:cached}=await supabase
        .from('generated_content')
        .select('content,model,prompt_version,source_metadata,created_at')
        .eq('item_type','essay_node')
        .eq('item_id',node.id)
        .eq('generation_type','explain')
        .order('created_at',{ascending:false})
        .limit(1)
        .maybeSingle();

      if (cached?.content) {
        try {
          setExplanations(x => ({...x,[node.id]:{
            explanation:JSON.parse(cached.content),
            sources:Array.isArray(cached.source_metadata) ? cached.source_metadata : [],
            model:cached.model,
            cached:true
          }}));
          return;
        } catch {}
      }
    }

    setExplainLoading(node.id);
    try {
      const response=await fetch('/api/explain',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          title:node.title,
          field:node.primary_field || 'General',
          path:pathFor(node).map(x => x.title)
        })
      });
      const result=await response.json();
      if (!response.ok) {
        throw new Error(result?.error === 'AI_NOT_CONFIGURED'
          ? 'Explain is ready, but the server still needs OPENAI_API_KEY.'
          : result?.message || 'Could not generate this explanation.');
      }

      setExplanations(x => ({...x,[node.id]:result}));

      if (session?.user) {
        await supabase.from('generated_content').insert({
          user_id:session.user.id,
          item_type:'essay_node',
          item_id:node.id,
          generation_type:'explain',
          content:JSON.stringify(result.explanation),
          model:result.model || null,
          prompt_version:result.prompt_version || 'explain_v1',
          source_metadata:result.sources || []
        });
      }
    } catch (error) {
      setExplainErrors(e => ({...e,[node.id]:error.message}));
    } finally {
      setExplainLoading(null);
    }
  }

  async function submitAuth(e) {
    e.preventDefault();
    setAuthBusy(true);
    setAuthMessage('');
    const result=authMode === 'signup'
      ? await supabase.auth.signUp({email:authEmail,password:authPassword,options:{emailRedirectTo:window.location.origin}})
      : await supabase.auth.signInWithPassword({email:authEmail,password:authPassword});

    if (result.error) setAuthMessage(result.error.message);
    else if (result.data?.session) {
      setAuthOpen(false);
      setAuthPassword('');
    } else {
      setAuthMessage('Account created. Check your email if confirmation is required, then sign in.');
      setAuthMode('login');
    }
    setAuthBusy(false);
  }

  function TopicVisual({node,large=false}) {
    const meta=fieldMeta(node?.primary_field);
    return <div className={'topic-visual ' + (large ? 'large' : '') + ' field-visual-' + ((rootNodes.findIndex(r => r.title === node?.primary_field)+6)%6)}>
      <div className="orb"></div>
      <div className="well-grid"></div>
      <span>{meta.icon}</span>
    </div>;
  }

  function TopicHeader({node}) {
    const path=pathFor(node);
    return <>
      <div className="breadcrumbs">
        {path.map((item,i) => <span key={item.id}>
          {i > 0 && <b>›</b>}
          <button onClick={() => i === path.length-1 ? null : openTopic(item.id)}>{item.title}</button>
        </span>)}
      </div>

      <section className="topic-hero">
        <TopicVisual node={node} large />
        <div className="topic-hero-copy">
          <span className="topic-kicker">{node.primary_field} · {String(node.node_type || 'topic').replaceAll('_',' ')}</span>
          <h1>{node.title}</h1>
          <p>{node.description || 'Explore this idea through its place in the curriculum, its deeper questions and its connections to the wider knowledge map.'}</p>
          <div className="topic-actions">
            <button className="gold-button" onClick={() => explainTopic(node)}>{explainLoading === node.id ? 'Explaining…' : 'Explain'}</button>
            <button onClick={() => setTopicTab('questions')}>Explore Deeper</button>
            <button onClick={() => setTopicTab('compare')}>Compare</button>
            <button disabled>Full Essay</button>
          </div>
        </div>
      </section>

      <nav className="topic-tabs">
        {[
          ['overview','Overview'],
          ['explain','Explain'],
          ['graph','Knowledge Graph'],
          ['questions','Questions'],
          ['related','Related Concepts'],
          ['compare','Compare']
        ].map(([id,label]) => <button key={id} className={topicTab === id ? 'active' : ''} onClick={() => {
          setTopicTab(id);
          if (id === 'explain' && !explanations[node.id]) explainTopic(node);
        }}>{label}</button>)}
      </nav>
    </>;
  }

  function TopicOverview({node}) {
    const path=pathFor(node);
    const questions=questionsByNode[node.id] || [];
    const connections=connectionsFor(node);
    return <div className="topic-overview">
      <section className="panel quick-facts">
        <div className="panel-title"><span>Quick Facts</span><small>CURRICULUM CONTEXT</small></div>
        <div className="facts-grid">
          <div><small>FIELD</small><strong>{node.primary_field}</strong></div>
          <div><small>TYPE</small><strong>{String(node.node_type || 'topic').replaceAll('_',' ')}</strong></div>
          <div><small>DEPTH</small><strong>Level {Math.max(0,path.length-1)}</strong></div>
          <div><small>SUBTOPICS</small><strong>{(childrenByParent[node.id] || []).length}</strong></div>
          <div><small>ESSAY QUESTIONS</small><strong>{questions.length}</strong></div>
          <div><small>GRAPH LINKS</small><strong>{connections.length}</strong></div>
          {node.metadata?.horizon && <div><small>TIME HORIZON</small><strong>{String(node.metadata.horizon).replaceAll('-',' ')}</strong></div>}
          {node.metadata?.plausibility && <div><small>PLAUSIBILITY</small><strong>{String(node.metadata.plausibility).replaceAll('-',' ')}</strong></div>}
        </div>
      </section>

      <div className="overview-grid">
        <section className="panel path-panel">
          <div className="panel-title"><span>Where it sits</span><small>KNOWLEDGE PATH</small></div>
          <div className="path-stack">
            {path.map((item,i) => <button key={item.id} onClick={() => openTopic(item.id)}>
              <span>{String(i+1).padStart(2,'0')}</span><b>{item.title}</b>
            </button>)}
          </div>
        </section>
        <section className="panel next-panel">
          <div className="panel-title"><span>Go deeper</span><small>NEXT MOVES</small></div>
          {(childrenByParent[node.id] || []).slice(0,5).map(child => <button key={child.id} onClick={() => openTopic(child.id)}>
            <MiniIcon>▣</MiniIcon><span>{child.title}</span><b>→</b>
          </button>)}
          {(childrenByParent[node.id] || []).length === 0 && <p>This is a focused node. Use Explain, Questions or Related Concepts to continue.</p>}
        </section>
      </div>
    </div>;
  }

  function ExplainView({node}) {
    const result=explanations[node.id];
    const ex=result?.explanation;
    const sections=ex ? [
      ['core','Core Idea',ex.core_idea],
      ['intuition','Intuition',ex.intuition],
      ['mechanism','How It Works',ex.how_it_works],
      ['matter','Why It Matters',ex.why_it_matters],
      ['boundaries','Boundaries',ex.boundaries]
    ] : [];

    if (explainLoading === node.id) return <div className="loading-panel"><div className="loader-ring"></div><h3>Building the explanation…</h3><p>Using the exact curriculum path for context.</p></div>;

    if (explainErrors[node.id]) return <div className="panel empty-panel"><span>EXPLAIN</span><h3>Generation is not active yet.</h3><p>{explainErrors[node.id]}</p><button className="gold-button" onClick={() => explainTopic(node)}>Try Again</button></div>;

    if (!ex) return <div className="panel empty-panel"><span>EXPLAIN</span><h3>Turn this node into a five-minute understanding.</h3><p>Core idea, intuition, mechanism, why it matters, and the boundaries that prevent common misunderstandings.</p><button className="gold-button" onClick={() => explainTopic(node)}>Generate Explanation</button></div>;

    return <div className="explain-layout">
      <aside className="explain-nav">
        <span>{node.title.toUpperCase()}</span>
        {sections.map(([id,title]) => <button key={id} onClick={() => document.getElementById('explain-'+id)?.scrollIntoView({behavior:'smooth',block:'center'})}>{title}</button>)}
        <button onClick={() => setTopicTab('related')}>Related Concepts</button>
      </aside>
      <article className="explain-copy">
        <div className="explain-banner">
          <div><small>GUIDED EXPLANATION</small><h2>{node.title}</h2></div>
          <span>{result?.cached ? 'Saved explanation' : 'Generated for this curriculum context'}</span>
        </div>
        {sections.map(([id,title,copy],i) => <section id={'explain-'+id} key={id} className={i === 0 ? 'featured' : ''}>
          <small>{String(i+1).padStart(2,'0')}</small>
          <h3>{title}</h3>
          <p>{copy}</p>
        </section>)}
        {result?.sources?.length > 0 && <section className="source-section">
          <small>VERIFICATION SOURCES</small>
          <div>{result.sources.map(s => <a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.title || s.url}</a>)}</div>
        </section>}
      </article>
    </div>;
  }

  function QuestionsView({node}) {
    const questions=questionsByNode[node.id] || [];
    return <section className="questions-page">
      <div className="subpage-heading"><small>THINK DEEPER</small><h2>Questions to Deepen Your Understanding</h2><p>Use these questions to test what you understand and expose what still feels fuzzy.</p></div>
      <div className="question-cards">
        {questions.length ? questions.map((q,i) => <details key={q.id}>
          <summary><span>{i+1}</span><strong>{q.question}</strong><b>⌄</b></summary>
          <p>This question is intentionally left open. It is designed as an essay prompt for deeper reasoning rather than a quick-answer card.</p>
        </details>) : <div className="panel empty-panel"><h3>No curated questions on this exact node yet.</h3><p>Move one level up or down the curriculum to find nearby essay questions.</p></div>}
      </div>
    </section>;
  }

  function RelatedView({node}) {
    const connections=connectionsFor(node);
    return <section className="related-page">
      <div className="subpage-heading"><small>KNOWLEDGE GRAPH</small><h2>Related Concepts</h2><p>Explore connected ideas to go deeper without losing the thread.</p></div>
      <div className="related-grid">
        {connections.length ? connections.map((c,i) => <button key={c.id} className="related-card" onClick={() => openTopic(c.targetEssayId)}>
          <span className={'related-icon ri-'+(i%4)}>{fieldMeta(c.field).icon}</span>
          <small>{c.relation}</small>
          <h3>{c.title}</h3>
          <p>{c.field}</p>
          <b>View →</b>
        </button>) : <div className="panel empty-panel"><h3>No graph connections surfaced here yet.</h3><p>The curriculum still works normally; this node simply has no approved graph edge with a navigable destination.</p></div>}
      </div>
    </section>;
  }

  function GraphView({node}) {
    const connections=connectionsFor(node).slice(0,6);
    const positions=[
      {x:50,y:12},{x:82,y:28},{x:86,y:70},{x:55,y:86},{x:18,y:72},{x:15,y:30}
    ];
    return <section className="graph-page panel">
      <div className="panel-title"><div><span>Knowledge Graph</span><small>How {node.title} connects to other ideas</small></div><div className="graph-legend"><i></i> approved connection</div></div>
      <div className="graph-canvas">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {connections.map((c,i) => <line key={c.id} x1="50" y1="50" x2={positions[i].x} y2={positions[i].y} />)}
        </svg>
        <button className="graph-node center">{node.title}</button>
        {connections.map((c,i) => <button
          key={c.id}
          className="graph-node satellite"
          style={{left:positions[i].x+'%',top:positions[i].y+'%'}}
          onClick={() => openTopic(c.targetEssayId)}
        >
          <small>{c.relation}</small>{c.title}
        </button>)}
        {!connections.length && <div className="graph-empty">No approved graph connections for this node yet.</div>}
      </div>
    </section>;
  }

  function CompareView({node}) {
    const connections=connectionsFor(node);
    return <section className="compare-page">
      <div className="subpage-heading"><small>COMPARE CONCEPTS</small><h2>See two ideas side by side.</h2><p>The comparison engine comes next. The interface is already in place.</p></div>
      <div className="compare-selectors panel">
        <div><small>CONCEPT A</small><button>{node.title}<span>⌄</span></button></div>
        <div className="compare-switch">⇄</div>
        <div><small>CONCEPT B</small><button>{connections[0]?.title || 'Select related concept'}<span>⌄</span></button></div>
      </div>
      <div className="compare-coming"><span>COMING SOON</span><p>The comparison feature will help you understand assumptions, similarities, differences and common confusions between concepts.</p></div>
    </section>;
  }

  const nav=[
    ['home','⌂','Home'],
    ['explore','⌕','Explore'],
    ['learning','▱','My Learning'],
    ['bookmarks','▮','Bookmarks'],
    ['settings','⚙','Settings']
  ];

  return <main className="ios-app">
    <header className="global-header">
      <button className="brand" onClick={() => setScreen('home')}>Intellectual OS</button>
      <div className="global-search">
        <span>⌕</span>
        <input
          value={search}
          onFocus={() => setSearchFocused(true)}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search any concept..."
        />
        {searchFocused && searchResults.length > 0 && <div className="search-menu">
          {searchResults.map(node => <button key={node.id} onMouseDown={() => openTopic(node.id)}>
            <span>{fieldMeta(node.primary_field).icon}</span>
            <div><strong>{node.title}</strong><small>{node.primary_field}</small></div>
          </button>)}
        </div>}
      </div>
      <button className="profile-button" onClick={() => session?.user ? null : setAuthOpen(true)}>{session?.user ? '✓' : '◉'}</button>
    </header>

    <div className="workspace">
      <aside className="main-sidebar">
        {nav.map(([id,icon,label]) => <button key={id} className={screen === id ? 'active' : ''} onClick={() => setScreen(id)}>
          <span>{icon}</span><b>{label}</b>
        </button>)}
      </aside>

      <section className="workspace-content">
        {screen === 'home' && <div className="home-page">
          <section className="home-hero">
            <span className="gold-kicker">YOUR MAP OF IDEAS</span>
            <h1>A complete map<br/>of human knowledge.</h1>
            <p>Explore. Understand. Connect. Think deeper.</p>
            <div className="stat-cards">
              <div><i>◈</i><strong>{rootNodes.length}</strong><span>Knowledge Fields</span></div>
              <div><i>▣</i><strong>{essayNodes.length.toLocaleString()}+</strong><span>Curriculum Nodes</span></div>
              <div><i>⌘</i><strong>{approvedEdgeCount}</strong><span>Rich Connections</span></div>
              <div><i>✦</i><strong>AI</strong><span>Powered Explanations</span></div>
            </div>
          </section>

          <section className="start-exploring">
            <div className="section-row"><div><small>START EXPLORING</small><h2>Choose a field</h2></div><button onClick={() => setScreen('explore')}>View full curriculum →</button></div>
            <div className="field-cards">
              {rootNodes.map((root,i) => <button key={root.id} className={'field-card fc-'+(i%6)} onClick={() => openField(root.id)}>
                <div className="field-card-art"><span>{fieldMeta(root.title).icon}</span><div className="field-orb"></div></div>
                <div><small>{String(i+1).padStart(2,'0')}</small><h3>{root.title}</h3><p>{fieldMeta(root.title).desc}</p></div>
              </button>)}
            </div>
          </section>
        </div>}

        {screen === 'explore' && <div className="explore-page">
          <aside className="field-rail">
            <h3>All Fields</h3>
            {rootNodes.map(root => <button key={root.id} className={selectedField?.id === root.id ? 'active' : ''} onClick={() => openField(root.id)}>
              <MiniIcon>{fieldMeta(root.title).icon}</MiniIcon><span>{root.title}</span>
            </button>)}
          </aside>
          <section className="curriculum-panel">
            {selectedField ? <>
              <div className="curriculum-heading">
                <div><small>{fieldMeta(selectedField.title).icon} KNOWLEDGE FIELD</small><h1>{selectedField.title}</h1><p>{fieldMeta(selectedField.title).desc}</p></div>
                <span>{countDescendants(selectedField.id,childrenByParent)} nodes</span>
              </div>
              <div className="curriculum-tree">
                {(childrenByParent[selectedField.id] || []).map(node => renderExplorerNode(node,0))}
              </div>
            </> : <div className="loading-state">Loading curriculum…</div>}
          </section>
        </div>}

        {screen === 'topic' && selectedTopic && <div className="topic-page">
          <TopicHeader node={selectedTopic}/>
          {topicTab === 'overview' && <TopicOverview node={selectedTopic}/>}
          {topicTab === 'explain' && <ExplainView node={selectedTopic}/>}
          {topicTab === 'questions' && <QuestionsView node={selectedTopic}/>}
          {topicTab === 'related' && <RelatedView node={selectedTopic}/>}
          {topicTab === 'graph' && <GraphView node={selectedTopic}/>}
          {topicTab === 'compare' && <CompareView node={selectedTopic}/>}
        </div>}

        {screen === 'learning' && <div className="simple-page">
          <div className="subpage-heading"><small>MY LEARNING</small><h2>Keep the ideas that changed how you think.</h2><p>Review, revisit and eventually build a durable memory of the concepts you explore.</p></div>
          <div className="learning-grid">
            {concepts.map((c,i) => <article key={c.id} className="learning-card">
              <span>{String(i+1).padStart(2,'0')}</span><small>{c.field}</small><h3>{c.name}</h3><p>{c.short}</p>
            </article>)}
          </div>
        </div>}

        {screen === 'bookmarks' && <div className="simple-page"><div className="subpage-heading"><small>BOOKMARKS</small><h2>Your private reading shelf.</h2><p>Saved ideas and essays will live here once bookmarking is connected.</p></div><div className="panel empty-panel"><h3>Nothing saved yet.</h3><p>Bookmarking is the next small utility layer after the core learning actions.</p></div></div>}

        {screen === 'settings' && <div className="simple-page"><div className="subpage-heading"><small>SETTINGS</small><h2>Keep the system quiet and personal.</h2><p>Account sync and preference controls live here.</p></div><div className="settings-panel panel"><div><span>Account</span><b>{session?.user ? 'Signed in' : 'Not signed in'}</b></div><button className="gold-button" onClick={() => session?.user ? supabase.auth.signOut() : setAuthOpen(true)}>{session?.user ? 'Sign out' : 'Sign in'}</button></div></div>}
      </section>
    </div>

    {authOpen && <div className="auth-backdrop" onClick={() => setAuthOpen(false)}>
      <form className="auth-card" onSubmit={submitAuth} onClick={e => e.stopPropagation()}>
        <button type="button" className="auth-close" onClick={() => setAuthOpen(false)}>×</button>
        <small>PRIVATE SYNC</small>
        <h2>{authMode === 'login' ? 'Sign in.' : 'Create your account.'}</h2>
        <p>Keep explanations and learning state attached to your account.</p>
        <label>Email<input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} /></label>
        <label>Password<input type="password" required minLength="6" value={authPassword} onChange={e => setAuthPassword(e.target.value)} /></label>
        {authMessage && <div className="auth-message">{authMessage}</div>}
        <button className="gold-button auth-submit" type="submit" disabled={authBusy}>{authBusy ? 'Working…' : authMode === 'login' ? 'Sign in' : 'Create account'}</button>
        <button className="auth-switch" type="button" onClick={() => {setAuthMode(authMode === 'login' ? 'signup' : 'login');setAuthMessage('')}}>{authMode === 'login' ? 'Need an account? Create one' : 'Already have an account? Sign in'}</button>
      </form>
    </div>}
  </main>;
}

function countDescendants(id,childrenByParent) {
  let count=0;
  const stack=[...(childrenByParent[id] || [])];
  while (stack.length) {
    const node=stack.pop();
    count+=1;
    stack.push(...(childrenByParent[node.id] || []));
  }
  return count;
}
