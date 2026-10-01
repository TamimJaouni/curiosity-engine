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
  'Future & Civilization': { icon:'✦', desc:'Realistic near- and long-term possibilities for technology, humanity, civilization and life beyond Earth.' },
  'Conspiracies, Secret Societies & Hidden Power': { icon:'◈', desc:'Documented conspiracies, secret societies, covert power, unresolved claims, elite networks and evidence-based investigation.' }
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

  const [simpleContent,setSimpleContent] = useState({});
  const [simpleLoading,setSimpleLoading] = useState('');
  const [simpleErrors,setSimpleErrors] = useState({});

  const [deepDives,setDeepDives] = useState({});
  const [deepLoading,setDeepLoading] = useState(null);
  const [deepErrors,setDeepErrors] = useState({});
  const [fullEssays,setFullEssays] = useState({});
  const [essayLoading,setEssayLoading] = useState(null);
  const [essayErrors,setEssayErrors] = useState({});
  const [comparisons,setComparisons] = useState({});
  const [compareLoading,setCompareLoading] = useState(false);
  const [compareError,setCompareError] = useState('');
  const [compareTargetId,setCompareTargetId] = useState(null);
  const [compareQuery,setCompareQuery] = useState('');

  const [socraticByNode,setSocraticByNode] = useState({});
  const [socraticAnswers,setSocraticAnswers] = useState({});
  const [socraticLoading,setSocraticLoading] = useState(null);
  const [socraticErrors,setSocraticErrors] = useState({});
  const [socraticHints,setSocraticHints] = useState({});

  const [bookmarks,setBookmarks] = useState([]);
  const [reviewItems,setReviewItems] = useState([]);
  const [learningProgress,setLearningProgress] = useState([]);
  const [reviewReveal,setReviewReveal] = useState(false);
  const [reviewBusy,setReviewBusy] = useState(false);
  const [monthlyReview,setMonthlyReview] = useState(null);
  const [monthlyLoading,setMonthlyLoading] = useState(false);

  const [dailyBrief,setDailyBrief] = useState([]);
  const [longArc,setLongArc] = useState([]);

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

  useEffect(() => {
    if (session?.user?.id) loadUserData();
    else {
      setBookmarks([]);
      setReviewItems([]);
      setLearningProgress([]);
      setMonthlyReview(null);
    }
  },[session?.user?.id]);

  async function loadCatalog() {
    setCatalogLoading(true);
    const [nodes,questions,kNodes,edges,links,conceptResult,briefResult,longArcResult] = await Promise.all([
      fetchAllRows('essay_nodes','sort_order'),
      fetchAllRows('essay_questions','sort_order'),
      fetchAllRows('knowledge_nodes','created_at'),
      fetchAllRows('knowledge_edges','created_at'),
      fetchAllRows('essay_node_knowledge_links','created_at'),
      supabase.from('concepts').select('*').order('created_at',{ascending:true}).limit(100),
      supabase.from('daily_brief').select('*').order('brief_date',{ascending:false}).order('created_at',{ascending:false}).limit(12),
      supabase.from('long_arc_topics').select('*').order('historical_band',{ascending:true}).order('anchor_year',{ascending:true}).limit(40)
    ]);

    setEssayNodes(nodes.data || []);
    setEssayQuestions(questions.data || []);
    setKnowledgeNodes(kNodes.data || []);
    setKnowledgeEdges(edges.data || []);
    setEssayLinks(links.data || []);

    if (conceptResult.data?.length) {
      setConcepts(conceptResult.data.map(c => ({
        id:c.id,
        name:c.name,
        field:c.primary_field,
        short:c.short_description,
        example:c.example,
        why:c.why_it_matters
      })));
    }
    setDailyBrief(briefResult.data || []);
    setLongArc(longArcResult.data || []);

    const roots=(nodes.data || []).filter(n => !n.parent_id);
    if (roots[0]) setSelectedFieldId(roots[0].id);
    setExpanded(roots.map(r => r.id));
    setCatalogLoading(false);
  }

  async function loadUserData() {
    if (!session?.user?.id) return;
    const month=new Date();
    const monthKey=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth(),1)).toISOString().slice(0,10);
    const [bookmarkResult,reviewResult,progressResult,monthResult]=await Promise.all([
      supabase.from('bookmarks').select('*').order('created_at',{ascending:false}),
      supabase.from('review_items').select('*').order('next_review_at',{ascending:true}),
      supabase.from('user_progress').select('*').order('last_opened_at',{ascending:false}).limit(80),
      supabase.from('monthly_reviews').select('*').eq('month',monthKey).maybeSingle()
    ]);
    setBookmarks(bookmarkResult.data || []);
    setReviewItems(reviewResult.data || []);
    setLearningProgress(progressResult.data || []);
    if (monthResult.data?.synthesis) {
      try { setMonthlyReview(JSON.parse(monthResult.data.synthesis)); }
      catch { setMonthlyReview({summary:monthResult.data.synthesis}); }
    } else setMonthlyReview(null);
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

  const dailyConcepts = useMemo(() => {
    if (!concepts.length) return [];
    const day=Math.floor(Date.now()/86400000);
    const picks=[];
    for (let i=0;i<Math.min(3,concepts.length);i++) picks.push(concepts[(day*3+i)%concepts.length]);
    return picks;
  },[concepts]);

  const dueReviewItems = useMemo(() => {
    const now=Date.now();
    return reviewItems.filter(item => new Date(item.next_review_at).getTime() <= now);
  },[reviewItems]);

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
    setCompareTargetId(null);
    setCompareQuery('');
    setCompareError('');
    setScreen('topic');
    setSearch('');
    setSearchFocused(false);
    markProgress(node);
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

  async function generateSimpleExplanation(node,mode) {
    if (!node || simpleLoading) return;
    const key=node.id+'::'+mode;
    setTopicTab(mode);
    setSimpleErrors(all => ({...all,[key]:null}));
    if (simpleContent[key]) return;

    setSimpleLoading(key);
    try {
      const response=await fetch('/api/simple-learn',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          mode,
          title:node.title,
          field:node.primary_field || 'General',
          path:pathFor(node).map(x => x.title),
          context:generationContext(node)
        })
      });
      const result=await response.json();
      if (!response.ok) throw new Error(result?.message || 'Could not generate the explanation.');
      setSimpleContent(all => ({...all,[key]:result.content}));
    } catch(error) {
      setSimpleErrors(all => ({...all,[key]:error.message}));
    } finally {
      setSimpleLoading('');
    }
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
        .eq('prompt_version','explain_v3')
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
          path:pathFor(node).map(x => x.title),
          context:generationContext(node)
        })
      });
      const result=await response.json();
      if (!response.ok) {
        throw new Error(result?.error === 'AI_NOT_CONFIGURED'
          ? 'Explain is ready, but the server still needs DEEPSEEK_API_KEY.'
          : result?.message || 'Could not generate this explanation.');
      }

      setExplanations(x => ({...x,[node.id]:result}));
      await updateProgress(node,'started',25);

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

  async function cachedGeneration(itemType,itemId,generationType,promptVersion='learn_v2') {
    if (!session?.user) return null;
    const {data}=await supabase
      .from('generated_content')
      .select('content,model,prompt_version,source_metadata,created_at')
      .eq('item_type',itemType)
      .eq('item_id',itemId)
      .eq('generation_type',generationType)
      .eq('prompt_version',promptVersion)
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if (!data?.content) return null;
    try { return {result:JSON.parse(data.content),model:data.model,cached:true}; }
    catch { return null; }
  }

  async function saveGeneration(itemType,itemId,generationType,result) {
    if (!session?.user) return;
    await supabase.from('generated_content').insert({
      user_id:session.user.id,
      item_type:itemType,
      item_id:itemId,
      generation_type:generationType,
      content:JSON.stringify(result.result),
      model:result.model || null,
      prompt_version:result.prompt_version || 'learn_v1',
      source_metadata:[]
    });
  }

  function generationContext(node) {
    return {
      description:node.description || null,
      subtopics:(childrenByParent[node.id] || []).slice(0,12).map(x => x.title),
      curated_questions:(questionsByNode[node.id] || []).slice(0,10).map(x => x.question),
      graph_connections:connectionsFor(node).slice(0,8).map(x => ({title:x.title,relation:x.relation,field:x.field})),
      metadata:node.metadata || {}
    };
  }

  async function deepDiveTopic(node) {
    if (!node || deepLoading) return;
    setTopicTab('deeper');
    setDeepErrors(x => ({...x,[node.id]:null}));
    const cached=await cachedGeneration('essay_node',node.id,'deep_dive');
    if (cached) {
      setDeepDives(x => ({...x,[node.id]:cached}));
      return;
    }
    setDeepLoading(node.id);
    try {
      const response=await fetch('/api/learn',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          mode:'deep_dive',
          title:node.title,
          field:node.primary_field || 'General',
          path:pathFor(node).map(x => x.title),
          context:generationContext(node)
        })
      });
      const result=await response.json();
      if (!response.ok) throw new Error(result?.message || 'Could not generate the deep dive.');
      setDeepDives(x => ({...x,[node.id]:result}));
      await saveGeneration('essay_node',node.id,'deep_dive',result);
      await updateProgress(node,'started',45);
    } catch(error) {
      setDeepErrors(x => ({...x,[node.id]:error.message}));
    } finally {
      setDeepLoading(null);
    }
  }

  async function fullEssayTopic(node) {
    if (!node || essayLoading) return;
    setTopicTab('essay');
    setEssayErrors(x => ({...x,[node.id]:null}));
    const cached=await cachedGeneration('essay_node',node.id,'full_essay');
    if (cached) {
      setFullEssays(x => ({...x,[node.id]:cached}));
      return;
    }
    setEssayLoading(node.id);
    try {
      const response=await fetch('/api/learn',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          mode:'full_essay',
          title:node.title,
          field:node.primary_field || 'General',
          path:pathFor(node).map(x => x.title),
          context:generationContext(node)
        })
      });
      const result=await response.json();
      if (!response.ok) throw new Error(result?.message || 'Could not generate the essay.');
      setFullEssays(x => ({...x,[node.id]:result}));
      await saveGeneration('essay_node',node.id,'full_essay',result);
      await updateProgress(node,'completed',100);
    } catch(error) {
      setEssayErrors(x => ({...x,[node.id]:error.message}));
    } finally {
      setEssayLoading(null);
    }
  }

  async function compareTopics(node,target) {
    if (!node || !target || compareLoading) return;
    setCompareError('');
    const itemId=node.id+'::'+target.id;
    const cached=await cachedGeneration('comparison',itemId,'compare');
    if (cached) {
      setComparisons(x => ({...x,[itemId]:cached}));
      return;
    }
    setCompareLoading(true);
    try {
      const response=await fetch('/api/learn',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          mode:'compare',
          title:node.title,
          field:node.primary_field || 'General',
          path:pathFor(node).map(x => x.title),
          context:generationContext(node),
          other:{
            title:target.title,
            field:target.primary_field || 'General',
            path:pathFor(target).map(x => x.title)
          }
        })
      });
      const result=await response.json();
      if (!response.ok) throw new Error(result?.message || 'Could not generate the comparison.');
      setComparisons(x => ({...x,[itemId]:result}));
      await saveGeneration('comparison',itemId,'compare',result);
    } catch(error) {
      setCompareError(error.message);
    } finally {
      setCompareLoading(false);
    }
  }

  async function markProgress(node) {
    if (!session?.user || !node) return;
    const existing=learningProgress.find(x => x.item_type === 'essay_node' && x.item_id === node.id);
    const row={
      user_id:session.user.id,
      item_type:'essay_node',
      item_id:node.id,
      status:existing?.status === 'completed' ? 'completed' : 'explored',
      progress_percent:Math.max(existing?.progress_percent || 0,10),
      last_opened_at:new Date().toISOString()
    };
    const {data}=await supabase.from('user_progress').upsert(row,{onConflict:'user_id,item_type,item_id'}).select().single();
    if (data) setLearningProgress(items => [data,...items.filter(x => x.id !== data.id)]);
  }

  async function updateProgress(node,status,progressPercent) {
    if (!session?.user || !node) return;
    const existing=learningProgress.find(x => x.item_type === 'essay_node' && x.item_id === node.id);
    const keepCompleted=existing?.status === 'completed' && status !== 'completed';
    const row={
      user_id:session.user.id,
      item_type:'essay_node',
      item_id:node.id,
      status:keepCompleted ? 'completed' : status,
      progress_percent:Math.max(existing?.progress_percent || 0,progressPercent),
      last_opened_at:new Date().toISOString(),
      completed_at:keepCompleted ? existing.completed_at : status === 'completed' ? new Date().toISOString() : null
    };
    const {data}=await supabase.from('user_progress').upsert(row,{onConflict:'user_id,item_type,item_id'}).select().single();
    if (data) setLearningProgress(items => [data,...items.filter(x => x.id !== data.id)]);
  }

  async function toggleBookmark(node) {
    if (!session?.user) {
      setAuthOpen(true);
      return;
    }
    const existing=bookmarks.find(x => x.item_type === 'essay_node' && x.item_id === node.id);
    if (existing) {
      await supabase.from('bookmarks').delete().eq('id',existing.id);
      setBookmarks(items => items.filter(x => x.id !== existing.id));
    } else {
      const {data}=await supabase.from('bookmarks').insert({
        user_id:session.user.id,
        item_type:'essay_node',
        item_id:node.id,
        title:node.title,
        primary_field:node.primary_field
      }).select().single();
      if (data) setBookmarks(items => [data,...items]);
    }
  }

  async function addToReview(node) {
    if (!session?.user) {
      setAuthOpen(true);
      return;
    }
    const existing=reviewItems.find(x => x.item_type === 'essay_node' && x.item_id === node.id);
    if (existing) {
      setScreen('learning');
      return;
    }
    setReviewBusy(true);
    try {
      const response=await fetch('/api/learn',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          mode:'flashcard',
          title:node.title,
          field:node.primary_field || 'General',
          path:pathFor(node).map(x => x.title),
          context:generationContext(node)
        })
      });
      const generated=await response.json();
      const card=generated?.result || {
        prompt:'Explain '+node.title+' in your own words. What is the central mechanism or distinction?',
        answer:node.description || 'Define the idea, explain how it works, and state why it matters.'
      };
      const {data,error}=await supabase.from('review_items').insert({
        user_id:session.user.id,
        item_type:'essay_node',
        item_id:node.id,
        title:node.title,
        primary_field:node.primary_field,
        prompt:card.prompt,
        answer:card.answer
      }).select().single();
      if (error) throw error;
      if (data) setReviewItems(items => [...items,data]);
    } finally {
      setReviewBusy(false);
    }
  }

  async function rateReview(item,rating) {
    if (!session?.user || !item) return;
    const current=item.interval_days || 0;
    const interval=rating === 'forgot' ? 1 : rating === 'fuzzy' ? (current ? Math.max(2,Math.ceil(current*1.5)) : 3) : (current ? Math.min(180,Math.ceil(current*2)) : 7);
    const next=new Date(Date.now()+interval*86400000).toISOString();
    const updated={
      state:rating,
      interval_days:interval,
      next_review_at:next,
      last_reviewed_at:new Date().toISOString(),
      times_reviewed:(item.times_reviewed || 0)+1,
      times_got_it:(item.times_got_it || 0)+(rating === 'got_it' ? 1 : 0)
    };
    await Promise.all([
      supabase.from('review_items').update(updated).eq('id',item.id),
      supabase.from('review_item_history').insert({user_id:session.user.id,review_item_id:item.id,rating})
    ]);
    setReviewItems(items => items.map(x => x.id === item.id ? {...x,...updated} : x));
    setReviewReveal(false);
  }

  function monthlyMetrics() {
    const now=new Date();
    const start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).getTime();
    const progress=learningProgress.filter(x => new Date(x.last_opened_at).getTime() >= start);
    const saved=bookmarks.filter(x => new Date(x.created_at).getTime() >= start);
    const reviewed=reviewItems.filter(x => x.last_reviewed_at && new Date(x.last_reviewed_at).getTime() >= start);
    const topics=progress.map(x => nodeById[x.item_id]).filter(Boolean);
    const fields=[...new Set(topics.map(x => x.primary_field).filter(Boolean))];
    return {
      topics_explored:topics.length,
      topics_completed:progress.filter(x => x.status === 'completed').length,
      bookmarks_added:saved.length,
      review_items_reviewed:reviewed.length,
      fields,
      recent_topics:topics.slice(0,20).map(x => x.title),
      review_performance:reviewed.slice(0,30).map(item => ({
        title:item.title,
        field:item.primary_field,
        state:item.state,
        times_reviewed:item.times_reviewed,
        times_got_it:item.times_got_it,
        interval_days:item.interval_days
      }))
    };
  }

  async function generateMonthlyReview() {
    if (!session?.user) {
      setAuthOpen(true);
      return;
    }
    setMonthlyLoading(true);
    try {
      const metrics=monthlyMetrics();
      const response=await fetch('/api/learn',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({mode:'monthly_review',context:metrics})
      });
      const result=await response.json();
      if (!response.ok) throw new Error(result?.message || 'Could not generate monthly review.');
      setMonthlyReview(result.result);
      const now=new Date();
      const monthKey=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).toISOString().slice(0,10);
      await supabase.from('monthly_reviews').upsert({
        user_id:session.user.id,
        month:monthKey,
        metrics,
        synthesis:JSON.stringify(result.result)
      },{onConflict:'user_id,month'});
    } finally {
      setMonthlyLoading(false);
    }
  }

  async function loadSavedSocratic(node) {
    if (!session?.user || !node) return null;
    const {data:sessionRow}=await supabase
      .from('socratic_sessions')
      .select('*')
      .eq('essay_node_id',node.id)
      .eq('status','active')
      .order('updated_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if (!sessionRow) return null;

    const {data:turnRows}=await supabase
      .from('socratic_turns')
      .select('*')
      .eq('session_id',sessionRow.id)
      .order('turn_index',{ascending:true});

    const turns=(turnRows || []).map(row => ({
      id:row.id,
      question:row.question,
      answer:row.user_answer || '',
      feedback:row.feedback || '',
      hint:row.hint || '',
      stage:row.stage || 'orient',
      mastery_signal:row.mastery_signal || sessionRow.mastery_signal || 'developing'
    }));
    if (!turns.length) return null;

    const saved={sessionId:sessionRow.id,turns,mastery:sessionRow.mastery_signal || 'developing'};
    setSocraticByNode(all => ({...all,[node.id]:saved}));
    return saved;
  }

  async function startSocratic(node,force=false) {
    if (!node || socraticLoading) return;
    setTopicTab('socratic');
    setSocraticErrors(x => ({...x,[node.id]:null}));
    if (!force && socraticByNode[node.id]?.turns?.length) return;

    const saved=force ? null : await loadSavedSocratic(node);
    if (saved) return;

    setSocraticLoading(node.id);
    try {
      let sessionId=null;
      if (session?.user) {
        const {data,error}=await supabase.from('socratic_sessions').insert({
          user_id:session.user.id,
          essay_node_id:node.id,
          title:node.title,
          primary_field:node.primary_field,
          status:'active',
          mastery_signal:'developing'
        }).select().single();
        if (error) throw error;
        sessionId=data?.id || null;
      }

      const response=await fetch('/api/socratic',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          title:node.title,
          field:node.primary_field || 'General',
          path:pathFor(node).map(x => x.title),
          context:generationContext(node),
          history:[],
          answer:''
        })
      });
      const generated=await response.json();
      if (!response.ok) throw new Error(generated?.message || 'Could not start Socratic mode.');

      const first={
        question:generated.result.question,
        answer:'',
        feedback:'',
        hint:generated.result.hint || '',
        stage:generated.result.stage || 'orient',
        mastery_signal:generated.result.mastery_signal || 'developing'
      };

      if (session?.user && sessionId) {
        const {data:turn}=await supabase.from('socratic_turns').insert({
          session_id:sessionId,
          user_id:session.user.id,
          turn_index:0,
          question:first.question,
          hint:first.hint,
          stage:first.stage,
          mastery_signal:first.mastery_signal
        }).select().single();
        if (turn) first.id=turn.id;
      }

      setSocraticByNode(all => ({...all,[node.id]:{
        sessionId,
        turns:[first],
        mastery:first.mastery_signal
      }}));
      await updateProgress(node,'started',35);
    } catch(error) {
      setSocraticErrors(x => ({...x,[node.id]:error.message}));
    } finally {
      setSocraticLoading(null);
    }
  }

  async function answerSocratic(node) {
    const state=socraticByNode[node.id];
    const answer=String(socraticAnswers[node.id] || '').trim();
    if (!state?.turns?.length || !answer || socraticLoading) return;

    setSocraticLoading(node.id);
    setSocraticErrors(x => ({...x,[node.id]:null}));
    try {
      const response=await fetch('/api/socratic',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          title:node.title,
          field:node.primary_field || 'General',
          path:pathFor(node).map(x => x.title),
          context:generationContext(node),
          history:state.turns.map(t => ({
            question:t.question,
            answer:t.answer,
            feedback:t.feedback,
            stage:t.stage
          })),
          answer
        })
      });
      const generated=await response.json();
      if (!response.ok) throw new Error(generated?.message || 'Could not continue Socratic mode.');

      const current=state.turns[state.turns.length-1];
      const completed={...current,answer,feedback:generated.result.feedback || ''};
      const next={
        question:generated.result.question,
        answer:'',
        feedback:'',
        hint:generated.result.hint || '',
        stage:generated.result.stage || 'orient',
        mastery_signal:generated.result.mastery_signal || 'developing'
      };

      if (session?.user && state.sessionId) {
        if (current.id) {
          await supabase.from('socratic_turns').update({
            user_answer:answer,
            feedback:generated.result.feedback || ''
          }).eq('id',current.id);
        }
        const {data:nextRow}=await supabase.from('socratic_turns').insert({
          session_id:state.sessionId,
          user_id:session.user.id,
          turn_index:state.turns.length,
          question:next.question,
          hint:next.hint,
          stage:next.stage,
          mastery_signal:next.mastery_signal
        }).select().single();
        if (nextRow) next.id=nextRow.id;

        await supabase.from('socratic_sessions').update({
          mastery_signal:next.mastery_signal,
          updated_at:new Date().toISOString()
        }).eq('id',state.sessionId);
      }

      setSocraticByNode(all => ({...all,[node.id]:{
        ...state,
        turns:[...state.turns.slice(0,-1),completed,next],
        mastery:next.mastery_signal
      }}));
      setSocraticAnswers(x => ({...x,[node.id]:''}));
      setSocraticHints(x => ({...x,[node.id]:false}));
      await updateProgress(node,'started',next.mastery_signal === 'strong' ? 75 : next.mastery_signal === 'solid' ? 60 : 45);
    } catch(error) {
      setSocraticErrors(x => ({...x,[node.id]:error.message}));
    } finally {
      setSocraticLoading(null);
    }
  }

  async function finishSocratic(node) {
    const state=socraticByNode[node.id];
    if (session?.user && state?.sessionId) {
      await supabase.from('socratic_sessions').update({
        status:'completed',
        updated_at:new Date().toISOString()
      }).eq('id',state.sessionId);
    }
    await updateProgress(node,'started',state?.mastery === 'strong' ? 80 : 65);
    setTopicTab('overview');
  }

  async function restartSocratic(node) {
    const state=socraticByNode[node.id];
    if (session?.user && state?.sessionId) {
      await supabase.from('socratic_sessions').update({
        status:'completed',
        updated_at:new Date().toISOString()
      }).eq('id',state.sessionId);
    }
    setSocraticByNode(all => {
      const next={...all};
      delete next[node.id];
      return next;
    });
    setSocraticAnswers(x => ({...x,[node.id]:''}));
    setSocraticHints(x => ({...x,[node.id]:false}));
    await startSocratic(node,true);
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
          <p>{node.description || 'Choose a short explanation for the essentials or an exhaustive explanation for the full picture.'}</p>
          <div className="topic-actions simple-topic-actions">
            <button className="gold-button" onClick={() => generateSimpleExplanation(node,'short')}>{simpleLoading === node.id+'::short' ? 'Explaining…' : 'Short Explanation'}</button>
            <button onClick={() => generateSimpleExplanation(node,'exhaustive')}>{simpleLoading === node.id+'::exhaustive' ? 'Building…' : 'Exhaustive Explanation'}</button>
          </div>
        </div>
      </section>

      <nav className="topic-tabs simple-topic-tabs">
        {[
          ['overview','Overview'],
          ['short','Short Explanation'],
          ['exhaustive','Exhaustive Explanation']
        ].map(([id,label]) => <button key={id} className={topicTab === id ? 'active' : ''} onClick={() => {
          setTopicTab(id);
          if ((id === 'short' || id === 'exhaustive') && !simpleContent[node.id+'::'+id]) generateSimpleExplanation(node,id);
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
          {node.metadata?.evidence_mode && <div><small>EVIDENCE MODE</small><strong>{String(node.metadata.evidence_mode).replaceAll('_',' ')}</strong></div>}
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

  function SimpleExplanationView({node,mode}) {
    const key=node.id+'::'+mode;
    const content=simpleContent[key];
    const error=simpleErrors[key];
    const loading=simpleLoading === key;
    const label=mode === 'short' ? 'SHORT EXPLANATION' : 'EXHAUSTIVE EXPLANATION';

    if (loading) return <div className="loading-panel"><div className="loader-ring"></div><h3>{mode === 'short' ? 'Building the short explanation…' : 'Building the exhaustive explanation…'}</h3><p>{mode === 'short' ? 'Focusing on the core mental model.' : 'Going through the subject from foundations to debate and uncertainty.'}</p></div>;

    if (error) return <div className="panel empty-panel"><span>{label}</span><h3>Generation failed.</h3><p>{error}</p><button className="gold-button" onClick={() => generateSimpleExplanation(node,mode)}>Try Again</button></div>;

    if (!content) return <div className="panel empty-panel"><span>{label}</span><h3>{mode === 'short' ? 'Understand the essentials.' : 'Build the full picture.'}</h3><p>{mode === 'short' ? 'A compact explanation of the core idea, intuition, mechanism, importance and boundaries.' : 'A deep explanation covering foundations, mechanisms, evidence, alternatives, limitations and uncertainty.'}</p><button className="gold-button" onClick={() => generateSimpleExplanation(node,mode)}>Generate</button></div>;

    return <article className={'simple-explanation '+(mode === 'exhaustive' ? 'exhaustive' : 'short')}>
      <header><small>{label}</small><h2>{node.title}</h2></header>
      <div className="simple-explanation-copy">{content}</div>
    </article>;
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

  function DeepDiveView({node}) {
    const result=deepDives[node.id];
    const d=result?.result;
    if (deepLoading === node.id) return <div className="loading-panel"><div className="loader-ring"></div><h3>Going deeper…</h3><p>Building a structured analysis from this topic's curriculum context.</p></div>;
    if (deepErrors[node.id]) return <div className="panel empty-panel"><span>EXPLORE DEEPER</span><h3>Generation failed.</h3><p>{deepErrors[node.id]}</p><button className="gold-button" onClick={() => deepDiveTopic(node)}>Try Again</button></div>;
    if (!d) return <div className="panel empty-panel"><span>EXPLORE DEEPER</span><h3>Move from understanding to analysis.</h3><p>Mechanisms, evidence, competing explanations, limitations, uncertainty and next questions.</p><button className="gold-button" onClick={() => deepDiveTopic(node)}>Generate Deep Dive</button></div>;
    const sections=[
      ['Central Question',d.central_question],
      ['Core Mechanism / Argument',d.core_mechanism],
      ['Why It Happens',d.why_it_happens],
      ['Evidence / Reasons',d.evidence_and_reasons],
      ['Competing Explanations',d.competing_explanations],
      ['Criticisms & Limitations',d.criticisms_and_limits],
      ['Development',d.development],
      ['Established vs Uncertain',d.established_vs_uncertain],
      ['Connections',d.connections]
    ];
    return <article className="deep-reader">
      <div className="reader-heading"><small>EXPLORE DEEPER</small><h2>{node.title}</h2><p>{result?.cached ? 'Saved deep dive' : 'Generated from the curriculum, questions and knowledge graph.'}</p></div>
      {sections.filter(([,copy]) => copy).map(([title,copy],i) => <section key={title} className="panel reader-section"><small>{String(i+1).padStart(2,'0')}</small><h3>{title}</h3><p>{copy}</p></section>)}
      {Array.isArray(d.next_questions) && d.next_questions.length > 0 && <section className="panel reader-section"><small>NEXT</small><h3>Questions Worth Exploring</h3><div className="next-question-list">{d.next_questions.map((x,i) => <p key={i}>{x}</p>)}</div></section>}
    </article>;
  }

  function FullEssayView({node}) {
    const result=fullEssays[node.id];
    const e=result?.result;
    if (essayLoading === node.id) return <div className="loading-panel"><div className="loader-ring"></div><h3>Writing the full essay…</h3><p>This is the long-form layer and can take longer than Explain.</p></div>;
    if (essayErrors[node.id]) return <div className="panel empty-panel"><span>FULL ESSAY</span><h3>Generation failed.</h3><p>{essayErrors[node.id]}</p><button className="gold-button" onClick={() => fullEssayTopic(node)}>Try Again</button></div>;
    if (!e) return <div className="panel empty-panel"><span>FULL ESSAY</span><h3>Build the long-form treatment.</h3><p>A serious essay with argument, mechanisms, evidence, competing views, unresolved questions and implications.</p><button className="gold-button" onClick={() => fullEssayTopic(node)}>Generate Full Essay</button></div>;
    return <article className="essay-reader">
      <header><small>FULL ESSAY</small><h1>{e.title || node.title}</h1>{e.thesis && <p className="essay-thesis">{e.thesis}</p>}</header>
      {(e.sections || []).map((section,i) => <section key={i}><small>{String(i+1).padStart(2,'0')}</small><h2>{section.heading}</h2><p>{section.body}</p></section>)}
      {e.established_vs_uncertain && <section><h2>Established vs Uncertain</h2><p>{e.established_vs_uncertain}</p></section>}
      {Array.isArray(e.takeaways) && <section><h2>Takeaways</h2><div className="essay-list">{e.takeaways.map((x,i)=><p key={i}>{x}</p>)}</div></section>}
      {Array.isArray(e.hard_questions) && <section><h2>Hard Questions</h2><div className="essay-list">{e.hard_questions.map((x,i)=><p key={i}>{x}</p>)}</div></section>}
      {e.further_reading_guidance && <section><h2>Further Reading Guidance</h2><p>{e.further_reading_guidance}</p></section>}
    </article>;
  }

  function SocraticView({node}) {
    const state=socraticByNode[node.id];
    const turns=state?.turns || [];
    const current=turns[turns.length-1];

    if (socraticLoading === node.id && !turns.length) return <div className="loading-panel"><div className="loader-ring"></div><h3>Starting Socratic mode…</h3><p>Finding the first question that reveals how you currently understand the idea.</p></div>;

    if (socraticErrors[node.id] && !turns.length) return <div className="panel empty-panel"><span>SOCRATIC MODE</span><h3>Could not start the session.</h3><p>{socraticErrors[node.id]}</p><button className="gold-button" onClick={() => startSocratic(node)}>Try Again</button></div>;

    if (!current) return <div className="panel empty-panel"><span>SOCRATIC MODE</span><h3>Construct the idea yourself.</h3><p>One diagnostic question at a time. The system adapts to your answer instead of immediately lecturing.</p><button className="gold-button" onClick={() => startSocratic(node)}>Start Socratic Session</button></div>;

    return <section className="socratic-page">
      <div className="socratic-heading">
        <div><small>SOCRATIC MODE · {String(current.stage || 'orient').toUpperCase()}</small><h2>{node.title}</h2><p>Answer in your own words. Precision matters more than length.</p></div>
        <div className={'mastery-pill mastery-'+(state?.mastery || 'developing')}>{state?.mastery || 'developing'}</div>
      </div>

      <div className="socratic-thread">
        {turns.slice(0,-1).map((turn,i) => <article className="socratic-exchange" key={turn.id || i}>
          <div className="socratic-question"><small>QUESTION {i+1}</small><p>{turn.question}</p></div>
          {turn.answer && <div className="socratic-answer"><small>YOUR ANSWER</small><p>{turn.answer}</p></div>}
          {turn.feedback && <div className="socratic-feedback"><small>COACHING NOTE</small><p>{turn.feedback}</p></div>}
        </article>)}
      </div>

      <div className="panel socratic-current">
        <small>QUESTION {turns.length} · {String(current.stage || 'orient').toUpperCase()}</small>
        <h3>{current.question}</h3>
        {current.hint && <div className="socratic-hint">
          {socraticHints[node.id] ? <p>{current.hint}</p> : <button onClick={() => setSocraticHints(x => ({...x,[node.id]:true}))}>Show a small hint</button>}
        </div>}
        <textarea
          value={socraticAnswers[node.id] || ''}
          onChange={e => setSocraticAnswers(x => ({...x,[node.id]:e.target.value}))}
          placeholder="Reason it out in your own words…"
          rows={6}
        />
        {socraticErrors[node.id] && <p className="socratic-error">{socraticErrors[node.id]}</p>}
        <div className="socratic-actions">
          <button className="gold-button" disabled={socraticLoading === node.id || !(socraticAnswers[node.id] || '').trim()} onClick={() => answerSocratic(node)}>{socraticLoading === node.id ? 'Thinking…' : 'Submit Answer'}</button>
          <button onClick={() => finishSocratic(node)}>Finish Session</button>
          <button onClick={() => restartSocratic(node)}>Start Over</button>
        </div>
      </div>
    </section>;
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
    const fallbackId=connections[0]?.targetEssayId || null;
    const target=nodeById[compareTargetId || fallbackId] || null;
    const term=compareQuery.trim().toLowerCase();
    const matches=term.length >= 2 ? essayNodes.filter(x => x.id !== node.id && x.title.toLowerCase().includes(term)).slice(0,8) : [];
    const key=target ? node.id+'::'+target.id : '';
    const result=comparisons[key]?.result;

    return <section className="compare-page">
      <div className="subpage-heading"><small>COMPARE CONCEPTS</small><h2>Understand the difference, not just the definitions.</h2><p>Compare assumptions, mechanisms, similarities, limits and where each idea applies.</p></div>
      <div className="compare-selectors panel">
        <div><small>CONCEPT A</small><button>{node.title}</button></div>
        <div className="compare-switch">⇄</div>
        <div className="compare-picker">
          <small>CONCEPT B</small>
          <input value={compareQuery} onChange={e => setCompareQuery(e.target.value)} placeholder={target?.title || 'Search another concept…'} />
          {matches.length > 0 && <div className="compare-results">{matches.map(x => <button key={x.id} onClick={() => {setCompareTargetId(x.id);setCompareQuery('')}}><strong>{x.title}</strong><small>{x.primary_field}</small></button>)}</div>}
        </div>
      </div>
      {target && <div className="compare-target-line"><span>{node.title}</span><b>vs</b><span>{target.title}</span><button className="gold-button" onClick={() => compareTopics(node,target)} disabled={compareLoading}>{compareLoading ? 'Comparing…' : result ? 'Regenerate' : 'Generate Comparison'}</button></div>}
      {compareError && <div className="panel empty-panel"><p>{compareError}</p></div>}
      {result && <div className="comparison-grid">
        {[
          ['Framing',result.framing],
          ['Shared Territory',result.shared_territory],
          ['Core Difference',result.core_difference],
          ['Similarities',result.similarities],
          ['Differences',result.differences],
          ['Assumptions',result.assumptions],
          ['Mechanisms',result.mechanisms],
          ['Strengths & Limits',result.strengths_and_limits],
          ['Common Confusions',result.common_confusions],
          ['When Each Applies',result.when_each_applies],
          ['Synthesis',result.synthesis]
        ].filter(([,copy]) => copy).map(([title,copy]) => <section className="panel" key={title}><small>{title.toUpperCase()}</small><p>{copy}</p></section>)}
      </div>}
      {!target && <div className="panel empty-panel"><h3>Choose a second concept.</h3><p>Search for any curriculum node to begin.</p></div>}
    </section>;
  }

  const nav=[
    ['home','⌂','Home'],
    ['explore','⌕','Explore']
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
          {topicTab === 'short' && <SimpleExplanationView node={selectedTopic} mode="short"/>}
          {topicTab === 'exhaustive' && <SimpleExplanationView node={selectedTopic} mode="exhaustive"/>}
        </div>}

        {screen === 'world' && <div className="simple-page world-page">
          <div className="subpage-heading"><small>WORLD & CHANGE</small><h2>See today's movement and the longer arc.</h2><p>Daily developments belong beside the historical processes that make them intelligible.</p></div>
          <div className="world-columns">
            <section>
              <div className="panel-title"><span>Daily Brief</span><small>SOURCED CURRENT EVENTS</small></div>
              {dailyBrief.length ? <div className="brief-stack">{dailyBrief.map(item => <article className="panel brief-card" key={item.id}>
                <small>{item.brief_date} · {item.category}</small><h3>{item.title}</h3><h4>What happened</h4><p>{item.what_happened}</p><h4>Why it matters</h4><p>{item.why_it_matters}</p><h4>Watch next</h4><p>{item.watch_next}</p>
                {Array.isArray(item.source_metadata) && item.source_metadata.length > 0 && <div className="brief-sources">{item.source_metadata.map((source,i) => <a key={i} href={source.url} target="_blank" rel="noreferrer">{source.publisher || source.title || 'Source'} ↗</a>)}</div>}
              </article>)}</div> : <div className="panel empty-panel"><h3>The Daily Brief pipeline is ready.</h3><p>No sourced brief has been published to the database yet. The system will not invent current events without verified sources.</p></div>}
            </section>
            <section>
              <div className="panel-title"><span>Long Arc</span><small>STRUCTURAL CHANGE</small></div>
              <div className="long-arc-stack">{longArc.map(item => <article className="panel long-arc-card" key={item.id}><small>{item.period_label} · {item.primary_field}</small><h3>{item.title}</h3><p>{item.summary}</p>{item.why_it_matters && <p className="muted-copy">{item.why_it_matters}</p>}</article>)}</div>
            </section>
          </div>
        </div>}

        {screen === 'learning' && <div className="simple-page">
          <div className="subpage-heading"><small>MY LEARNING</small><h2>Turn exploration into durable memory.</h2><p>Concepts of the day, spaced review, recent learning and a monthly intellectual synthesis.</p></div>

          <section className="learning-section">
            <div className="panel-title"><span>Three Concepts of the Day</span><small>DAILY DISCOVERY</small></div>
            <div className="learning-grid">{dailyConcepts.map((c,i) => <article key={c.id} className="learning-card"><span>{String(i+1).padStart(2,'0')}</span><small>{c.field}</small><h3>{c.name}</h3><p>{c.short}</p></article>)}</div>
          </section>

          <section className="learning-section">
            <div className="panel-title"><span>Review Queue</span><small>{dueReviewItems.length} DUE</small></div>
            {!session?.user ? <div className="panel empty-panel"><h3>Sign in to build your review queue.</h3><button className="gold-button" onClick={() => setAuthOpen(true)}>Sign in</button></div>
            : dueReviewItems.length ? (() => { const item=dueReviewItems[0]; return <div className="panel review-card">
                <small>{item.primary_field || 'REVIEW'}</small><h3>{item.prompt}</h3>
                {reviewReveal ? <div className="review-answer"><p>{item.answer}</p><div className="review-ratings"><button onClick={() => rateReview(item,'forgot')}>Forgot</button><button onClick={() => rateReview(item,'fuzzy')}>Fuzzy</button><button className="gold-button" onClick={() => rateReview(item,'got_it')}>Got it</button></div></div>
                : <button className="gold-button" onClick={() => setReviewReveal(true)}>Reveal Answer</button>}
              </div>; })()
            : <div className="panel empty-panel"><h3>Nothing due right now.</h3><p>Add topics to Review from any topic page. Future cards will return automatically when due.</p></div>}
          </section>

          <section className="learning-section">
            <div className="panel-title"><span>Recent Learning</span><small>YOUR TRAIL</small></div>
            <div className="recent-learning-grid">
              {learningProgress.slice(0,12).map(item => { const node=nodeById[item.item_id]; return node ? <button key={item.id} className="panel recent-learning-card" onClick={() => openTopic(node.id)}><small>{node.primary_field}</small><h3>{node.title}</h3><span>{item.status} · {item.progress_percent}%</span></button> : null; })}
              {session?.user && !learningProgress.length && <div className="panel empty-panel"><p>Open curriculum topics and your learning trail will appear here.</p></div>}
            </div>
          </section>

          <section className="learning-section">
            <div className="panel-title"><span>Monthly Intellectual Review</span><small>SYNTHESIS</small></div>
            <div className="panel monthly-review-card">
              <div className="monthly-metrics">{Object.entries(monthlyMetrics()).filter(([k]) => !['fields','recent_topics','review_performance'].includes(k)).map(([k,v]) => <div key={k}><small>{k.replaceAll('_',' ')}</small><strong>{v}</strong></div>)}</div>
              {monthlyReview ? <div className="monthly-copy">
                <h3>This month's synthesis</h3><p>{monthlyReview.summary}</p>
                {['strongest_threads','connections','gaps','sticking','needs_another_pass','next_month'].map(key => Array.isArray(monthlyReview[key]) && <div key={key}><small>{key.replaceAll('_',' ').toUpperCase()}</small>{monthlyReview[key].map((x,i)=><p key={i}>{x}</p>)}</div>)}
              </div> : <button className="gold-button" disabled={monthlyLoading} onClick={generateMonthlyReview}>{monthlyLoading ? 'Synthesizing…' : 'Generate Monthly Review'}</button>}
            </div>
          </section>
        </div>}

        {screen === 'bookmarks' && <div className="simple-page">
          <div className="subpage-heading"><small>BOOKMARKS</small><h2>Your private reading shelf.</h2><p>Save topics you want to revisit without putting all of them into spaced review.</p></div>
          {!session?.user ? <div className="panel empty-panel"><h3>Sign in to sync bookmarks.</h3><button className="gold-button" onClick={() => setAuthOpen(true)}>Sign in</button></div>
          : bookmarks.length ? <div className="bookmark-grid">{bookmarks.map(item => <article className="panel bookmark-card" key={item.id}><small>{item.primary_field}</small><h3>{item.title}</h3><div><button onClick={() => openTopic(item.item_id)}>Open</button><button onClick={() => toggleBookmark(nodeById[item.item_id])}>Remove</button></div></article>)}</div>
          : <div className="panel empty-panel"><h3>Nothing saved yet.</h3><p>Use Bookmark on any topic page to build your reading shelf.</p></div>}
        </div>}

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
