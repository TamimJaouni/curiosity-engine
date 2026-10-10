'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const FIELD_META = {
  'History & Politics': { icon:'♜', short:'History, power, institutions, conflict and states.' },
  'Economics': { icon:'◫', short:'Markets, incentives, money, growth and political economy.' },
  'Philosophy & Ideas': { icon:'◇', short:'Reason, knowledge, ethics, mind and major traditions.' },
  'Interesting Snippets': { icon:'✣', short:'Surprising mental models, hidden structures and portable lenses for everyday reality.' },
  'Mind & Behavior': { icon:'⌁', short:'Psychology, cognition, neuroscience and human behavior.' },
  'Society & Culture': { icon:'◉', short:'Social structure, culture, identity and collective life.' },
  'Physics': { icon:'◎', short:'Matter, energy, spacetime and the foundations of nature.' },
  'Future & Civilization': { icon:'✦', short:'Technology, civilization and long-term possibilities.' },
  'Conspiracies, Secret Societies & Hidden Power': { icon:'◈', short:'Covert power, secret networks and evidence-based investigation.' }
};

async function fetchAllRows(table, orderColumn='sort_order') {
  const pageSize=1000;
  let from=0;
  let all=[];

  while (true) {
    let query=supabase
      .from(table)
      .select('*')
      .order(orderColumn,{ascending:true});

    // Pagination must use a deterministic total order. Many curriculum rows
    // share the same sort_order, so ordering only by sort_order can cause the
    // same row to appear on adjacent pages while another row is skipped.
    if (table === 'essay_node_knowledge_links') {
      if (orderColumn !== 'essay_node_id') query=query.order('essay_node_id',{ascending:true});
      query=query
        .order('knowledge_node_id',{ascending:true})
        .order('role',{ascending:true});
    } else if (orderColumn !== 'id') {
      query=query.order('id',{ascending:true});
    }

    const {data,error}=await query.range(from,from+pageSize-1);

    if (error) return {data:all,error};
    all=all.concat(data || []);
    if (!data || data.length < pageSize) break;
    from+=pageSize;
  }

  // Defensive dedupe for previously unstable page boundaries or repeated rows.
  const unique=new Map();
  for (const row of all) {
    const key=table === 'essay_node_knowledge_links'
      ? `${row.essay_node_id}|${row.knowledge_node_id}|${row.role || ''}`
      : row.id;
    if (!unique.has(key)) unique.set(key,row);
  }

  return {data:[...unique.values()],error:null};
}

function metaFor(title) {
  return FIELD_META[title] || {icon:'◌',short:'A territory in the knowledge map.'};
}

function clamp(value,min,max) {
  return Math.min(max,Math.max(min,value));
}

export default function Home() {
  const [nodes,setNodes]=useState([]);
  const [knowledgeNodes,setKnowledgeNodes]=useState([]);
  const [knowledgeLinks,setKnowledgeLinks]=useState([]);
  const [knowledgeEdges,setKnowledgeEdges]=useState([]);
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState('');

  const [selectedFieldId,setSelectedFieldId]=useState(null);
  const [selectedNodeId,setSelectedNodeId]=useState(null);
  const [expanded,setExpanded]=useState(() => new Set());

  const [search,setSearch]=useState('');
  const [searchOpen,setSearchOpen]=useState(false);
  const [zoom,setZoom]=useState(100);
  const [viewMode,setViewMode]=useState('overview');
  const [scope,setScope]=useState('concept');
  const [copied,setCopied]=useState('');
  const [mobileNodeId,setMobileNodeId]=useState(null);

  useEffect(() => {
    loadAtlas();
  },[]);

  async function loadAtlas() {
    setLoading(true);
    setLoadError('');

    const [result,knowledgeResult,linksResult,edgesResult]=await Promise.all([
      fetchAllRows('essay_nodes','sort_order'),
      fetchAllRows('knowledge_nodes','label'),
      fetchAllRows('essay_node_knowledge_links','essay_node_id'),
      fetchAllRows('knowledge_edges','id')
    ]);

    if (result.error) {
      setLoadError(result.error.message || 'Could not load the curriculum.');
      setLoading(false);
      return;
    }

    const loaded=result.data || [];
    setNodes(loaded);
    setKnowledgeNodes(knowledgeResult.error ? [] : (knowledgeResult.data || []));
    setKnowledgeLinks(linksResult.error ? [] : (linksResult.data || []));
    setKnowledgeEdges(edgesResult.error ? [] : (edgesResult.data || []));

    const roots=loaded.filter(node => !node.parent_id);
    if (roots[0]) {
      setSelectedFieldId(roots[0].id);
      setSelectedNodeId(roots[0].id);
      setExpanded(new Set([roots[0].id]));
      setViewMode('overview');
      setMobileNodeId(null);
    }

    setLoading(false);
  }

  const nodeById=useMemo(() => {
    const map=new Map();
    for (const node of nodes) map.set(node.id,node);
    return map;
  },[nodes]);

  const childrenByParent=useMemo(() => {
    const map=new Map();

    for (const node of nodes) {
      const key=node.parent_id || '__root__';
      if (!map.has(key)) map.set(key,[]);
      map.get(key).push(node);
    }

    for (const list of map.values()) {
      list.sort((a,b) =>
        Number(a.sort_order || 0)-Number(b.sort_order || 0) ||
        String(a.title || '').localeCompare(String(b.title || ''))
      );
    }

    return map;
  },[nodes]);

  const roots=childrenByParent.get('__root__') || [];
  const selectedNode=selectedNodeId ? nodeById.get(selectedNodeId) : null;
  const selectedField=selectedFieldId ? nodeById.get(selectedFieldId) : null;

  const knowledgeById=useMemo(() => {
    const map=new Map();
    for (const node of knowledgeNodes) map.set(node.id,node);
    return map;
  },[knowledgeNodes]);

  const knowledgeLinksByEssay=useMemo(() => {
    const map=new Map();
    for (const link of knowledgeLinks) {
      if (!map.has(link.essay_node_id)) map.set(link.essay_node_id,[]);
      map.get(link.essay_node_id).push(link);
    }
    return map;
  },[knowledgeLinks]);

  const essayLinksByKnowledge=useMemo(() => {
    const map=new Map();
    for (const link of knowledgeLinks) {
      if (!map.has(link.knowledge_node_id)) map.set(link.knowledge_node_id,[]);
      map.get(link.knowledge_node_id).push(link);
    }
    return map;
  },[knowledgeLinks]);

  const edgesByKnowledge=useMemo(() => {
    const map=new Map();
    for (const edge of knowledgeEdges) {
      for (const id of [edge.source_id,edge.target_id]) {
        if (!map.has(id)) map.set(id,[]);
        map.get(id).push(edge);
      }
    }
    return map;
  },[knowledgeEdges]);

  function pathFor(nodeOrId) {
    let current=typeof nodeOrId === 'string' ? nodeById.get(nodeOrId) : nodeOrId;
    const path=[];
    const seen=new Set();

    while (current && !seen.has(current.id)) {
      path.unshift(current);
      seen.add(current.id);
      current=current.parent_id ? nodeById.get(current.parent_id) : null;
    }

    return path;
  }

  const selectedPath=selectedNode ? pathFor(selectedNode) : [];
  const selectedPathIds=new Set(selectedPath.map(node => node.id));
  const selectedCountry=selectedPath.find(node => node.node_type === 'country') || null;
  const mobileNode=mobileNodeId ? nodeById.get(mobileNodeId) || null : null;
  const mobilePath=mobileNode ? pathFor(mobileNode) : [];
  const mobileChildren=mobileNode ? (childrenByParent.get(mobileNode.id) || []) : roots;
  const mobileParent=mobileNode?.parent_id ? nodeById.get(mobileNode.parent_id) || null : null;

  const focusIds=useMemo(() => {
    const ids=new Set();
    if (!selectedNodeId) return ids;

    const path=pathFor(selectedNodeId);
    for (const node of path) ids.add(node.id);

    const stack=[...(childrenByParent.get(selectedNodeId) || [])];
    while (stack.length) {
      const node=stack.pop();
      ids.add(node.id);
      stack.push(...(childrenByParent.get(node.id) || []));
    }

    return ids;
  },[selectedNodeId,nodeById,childrenByParent]);

  function descendantsOf(id) {
    const out=[];
    const stack=[...(childrenByParent.get(id) || [])];

    while (stack.length) {
      const node=stack.shift();
      out.push(node);
      stack.unshift(...(childrenByParent.get(node.id) || []));
    }

    return out;
  }

  function descendantCount(id) {
    let count=0;
    const stack=[...(childrenByParent.get(id) || [])];

    while (stack.length) {
      const node=stack.pop();
      count++;
      stack.push(...(childrenByParent.get(node.id) || []));
    }

    return count;
  }

  const fieldCounts=useMemo(() => {
    const counts={};

    for (const root of roots) {
      let count=0;
      const stack=[...(childrenByParent.get(root.id) || [])];
      while (stack.length) {
        const node=stack.pop();
        count++;
        stack.push(...(childrenByParent.get(node.id) || []));
      }
      counts[root.id]=count;
    }

    return counts;
  },[roots,childrenByParent]);

  const searchResults=useMemo(() => {
    const term=search.trim().toLowerCase();
    if (term.length < 2) return [];

    return nodes
      .filter(node =>
        String(node.title || '').toLowerCase().includes(term) ||
        String(node.description || '').toLowerCase().includes(term)
      )
      .sort((a,b) => {
        const at=String(a.title || '').toLowerCase();
        const bt=String(b.title || '').toLowerCase();
        const aStarts=at.startsWith(term) ? 0 : 1;
        const bStarts=bt.startsWith(term) ? 0 : 1;
        return aStarts-bStarts || at.length-bt.length || at.localeCompare(bt);
      })
      .slice(0,12);
  },[search,nodes]);

  function expandPath(id,includeChildren=true) {
    const path=pathFor(id);

    setExpanded(previous => {
      const next=new Set(previous);
      for (const node of path) next.add(node.id);
      if (includeChildren) next.add(id);
      return next;
    });
  }

  function focusNode(id,{scroll=true}={}) {
    const node=nodeById.get(id);
    if (!node) return;

    const path=pathFor(node);
    const field=path[0];

    if (field) setSelectedFieldId(field.id);
    setSelectedNodeId(id);
    setMobileNodeId(id);
    setScope('concept');
    expandPath(id,true);
    setSearch('');
    setSearchOpen(false);

    if (scroll) {
      window.setTimeout(() => {
        document.getElementById('atlas-node-'+id)?.scrollIntoView({
          behavior:'smooth',
          block:'center'
        });
      },80);
    }
  }

  function selectField(id) {
    setSelectedFieldId(id);
    setSelectedNodeId(id);
    setMobileNodeId(id);
    setScope('concept');
    setViewMode('overview');
    setExpanded(new Set([id]));
    setSearch('');
    setSearchOpen(false);

    window.setTimeout(() => {
      document.querySelector('.atlas-tree-scroll')?.scrollTo({top:0,left:0,behavior:'smooth'});
    },20);
  }

  function handleNodeClick(node) {
    if (!node) return;

    const childNodes=childrenByParent.get(node.id) || [];
    const hasChildren=childNodes.length > 0;
    const sameNode=selectedNodeId === node.id;
    const isOpen=expanded.has(node.id);

    const path=pathFor(node);
    const field=path[0];
    if (field) setSelectedFieldId(field.id);

    setSelectedNodeId(node.id);
    setMobileNodeId(node.id);
    setScope('concept');
    setSearch('');
    setSearchOpen(false);

    if (!hasChildren) return;

    setExpanded(previous => {
      const next=new Set(previous);

      if (sameNode && isOpen) {
        next.delete(node.id);
        for (const descendant of descendantsOf(node.id)) next.delete(descendant.id);
        return next;
      }

      for (const pathNode of path) next.add(pathNode.id);
      next.add(node.id);
      return next;
    });
  }

  function showOverview() {
    if (!selectedFieldId) return;
    setViewMode('overview');
    setExpanded(new Set([selectedFieldId]));
  }

  function showFocus(node=selectedNode) {
    if (!selectedFieldId || !node) return;
    setViewMode('focus');

    const next=new Set();
    for (const pathNode of pathFor(node)) next.add(pathNode.id);
    next.add(node.id);
    for (const descendant of descendantsOf(node.id)) next.add(descendant.id);
    setExpanded(next);

    window.setTimeout(() => {
      document.getElementById('atlas-node-'+node.id)?.scrollIntoView({
        behavior:'smooth',
        block:'center',
        inline:'center'
      });
    },80);
  }

  function showFull() {
    if (!selectedFieldId) return;
    setViewMode('full');
    const ids=[selectedFieldId,...descendantsOf(selectedFieldId).map(node => node.id)];
    setExpanded(new Set(ids));
  }

  function collapseToPath() {
    if (!selectedFieldId) return;
    const next=new Set([selectedFieldId]);
    for (const node of selectedPath) next.add(node.id);
    setExpanded(next);
  }

  const siblings=useMemo(() => {
    if (!selectedNode) return [];
    const key=selectedNode.parent_id || '__root__';
    return (childrenByParent.get(key) || []).filter(node => node.id !== selectedNode.id);
  },[selectedNode,childrenByParent]);

  const children=selectedNode ? (childrenByParent.get(selectedNode.id) || []) : [];
  const parent=selectedNode?.parent_id ? nodeById.get(selectedNode.parent_id) : null;

  const selectedKnowledge=useMemo(() => {
    if (!selectedNodeId) return null;
    const links=knowledgeLinksByEssay.get(selectedNodeId) || [];
    const preferred=links.find(link => link.role === 'primary') || links[0];
    return preferred ? knowledgeById.get(preferred.knowledge_node_id) || null : null;
  },[selectedNodeId,knowledgeLinksByEssay,knowledgeById]);

  const alsoAppears=useMemo(() => {
    if (!selectedKnowledge || !selectedNodeId) return [];
    const links=essayLinksByKnowledge.get(selectedKnowledge.id) || [];
    const seen=new Set();
    const matches=[];

    for (const link of links) {
      if (link.essay_node_id === selectedNodeId || seen.has(link.essay_node_id)) continue;
      const node=nodeById.get(link.essay_node_id);
      if (!node) continue;
      seen.add(node.id);
      matches.push(node);
    }

    return matches.sort((a,b) =>
      String(a.primary_field || '').localeCompare(String(b.primary_field || '')) ||
      pathFor(a).length-pathFor(b).length ||
      String(a.title || '').localeCompare(String(b.title || ''))
    );
  },[selectedKnowledge,selectedNodeId,essayLinksByKnowledge,nodeById]);

  const relatedConcepts=useMemo(() => {
    if (!selectedKnowledge) return [];
    const edges=edgesByKnowledge.get(selectedKnowledge.id) || [];

    return edges
      .map(edge => {
        const outgoing=edge.source_id === selectedKnowledge.id;
        const otherId=outgoing ? edge.target_id : edge.source_id;
        const concept=knowledgeById.get(otherId);
        if (!concept) return null;
        return {edge,concept,outgoing};
      })
      .filter(Boolean)
      .sort((a,b) =>
        Number(b.edge.strength || 0)-Number(a.edge.strength || 0) ||
        String(a.concept.label || '').localeCompare(String(b.concept.label || ''))
      );
  },[selectedKnowledge,edgesByKnowledge,knowledgeById]);

  function relationText(item) {
    const label=String(item.edge.relation_type || 'related_to').replaceAll('_',' ');
    if (item.edge.is_bidirectional || item.edge.relation_type === 'related_to') return '↔ '+label;
    return item.outgoing ? label+' →' : '← '+label;
  }

  function focusKnowledgeConcept(knowledgeId) {
    const locations=(essayLinksByKnowledge.get(knowledgeId) || [])
      .map(link => nodeById.get(link.essay_node_id))
      .filter(Boolean);

    if (!locations.length) return;
    const sameField=locations.find(node => node.primary_field === selectedField?.title);
    focusNode((sameField || locations[0]).id);
  }

  function branchText(node,maxDepth=2,maxItems=70) {
    let count=0;
    const lines=[];

    function walk(current,depth) {
      if (!current || count >= maxItems) return;
      lines.push('  '.repeat(depth)+'- '+current.title);
      count++;
      if (depth >= maxDepth) return;

      for (const child of childrenByParent.get(current.id) || []) {
        walk(child,depth+1);
        if (count >= maxItems) break;
      }
    }

    walk(node,0);

    if (count >= maxItems) lines.push('  …');
    return lines.join('\n');
  }

  function completeBranchText(node) {
    const lines=[];

    function walk(current,depth) {
      if (!current) return;
      const childNodes=childrenByParent.get(current.id) || [];
      const importance=String(current.metadata?.importance || '').toUpperCase();
      const marker=!childNodes.length && (importance === 'CORE' || importance === 'IMPORTANT')
        ? `[${importance}] `
        : '';
      lines.push('  '.repeat(depth)+(childNodes.length ? '## ' : '- ')+marker+current.title);

      for (const child of childNodes) walk(child,depth+1);
    }

    walk(node,0);
    return lines.join('\n');
  }

  function historySynthesisPrompt(scopeNode,{countryWide=false}={}) {
    const path=pathFor(scopeNode);
    const country=path.find(node => node.node_type === 'country') || selectedCountry;
    const countryName=country?.title || 'this country';
    const scopeName=scopeNode.title;
    const structure=completeBranchText(scopeNode);

    if (countryWide) {
      return `I want a comprehensive big-picture understanding of ${countryName}'s history.

I am using a curated knowledge map. The complete country structure below is the mandatory scope for the lesson:

${structure}

Treat every listed leaf topic as a required historical anchor. [CORE] leaves are non-negotiable turning points or structural anchors. [IMPORTANT] leaves should be included but receive less space. Do not turn the answer into a sequence of disconnected mini-essays.

Build one coherent chronological and causal narrative of ${countryName}. Tie the events, people, institutions, movements and long-term processes together so I understand how one phase created the conditions for the next.

For every major phase, explain:
1. What the political, social and regional order looked like at the start.
2. Which pressures, conflicts or structural changes were building.
3. What triggered the major turning points.
4. Who the important actors were and what they wanted.
5. Why each major event mattered.
6. What changed afterward.
7. How those consequences shaped the next phase.

Use explicit causal bridges such as:
"This created the conditions for..."
"This mattered because..."
"The immediate consequence was..."
"The deeper structural consequence was..."
"This changed the balance of power by..."

Integrate the cross-cutting sections on political institutions, communities, social structure and foreign relations into the chronological story rather than treating them as detached appendices.

Prioritize the big picture. Give more space to genuinely decisive turning points and less space to contextual anchors. Distinguish established facts from contested interpretations where necessary.

At the end, give me:
- a 15–25 step historical spine that lets me mentally reconstruct the whole story,
- the most important causal chains,
- the institutions and social cleavages that persist across periods,
- and the major unresolved tensions that explain the contemporary country.

Do not assume I already know the history. Teach it as one connected story.`;
    }

    return `I want a comprehensive understanding of this section of ${countryName}'s history:

${path.map(node => node.title).join(' → ')}

The complete subsection structure below is the mandatory scope:

${structure}

Treat every listed leaf topic as a required anchor. [CORE] leaves are the decisive anchors; [IMPORTANT] leaves provide supporting context. Do not explain them as isolated encyclopedia entries. Build a coherent chronological and causal narrative for "${scopeName}".

Explain:
1. the situation at the beginning of this period or theme,
2. the pressures and causes that produced change,
3. the major actors and what they wanted,
4. the decisive events and turning points,
5. the consequences of each turning point,
6. how the topics connect to one another,
7. and how this subsection changed the later history of ${countryName}.

Use explicit causal bridges such as "this created the conditions for...", "this mattered because...", and "the long-term consequence was...".

Keep the main focus on this subsection. Bring in earlier or later ${countryName} history only when needed to explain causes or consequences.

At the end, give me a compact subsection spine in roughly 8–15 steps so I can reconstruct the sequence from memory.`;
  }


  function nodePromptLabel(node) {
    if (!node) return '';
    const childNodes=childrenByParent.get(node.id) || [];
    if (!node.parent_id) return 'Field overview';
    if (node.node_type === 'country') return 'Country big picture';
    if (!childNodes.length) return 'Focused concept';
    return 'Branch synthesis';
  }

  function buildNodePrompt(node) {
    if (!node) return '';

    const path=pathFor(node);
    const pathText=path.map(item => item.title).join(' → ');
    const childNodes=childrenByParent.get(node.id) || [];
    const hasChildren=childNodes.length > 0;
    const country=path.find(item => item.node_type === 'country') || null;
    const depth=Math.max(0,path.length-1);
    const descendants=descendantCount(node.id);
    const importance=String(node.metadata?.importance || '').toUpperCase();

    if (node.node_type === 'country' && node.metadata?.country_history_v1) {
      return historySynthesisPrompt(node,{countryWide:true});
    }

    if (country && node.primary_field === 'History & Politics' && hasChildren) {
      return historySynthesisPrompt(node);
    }

    if (!hasChildren) {
      return `I am using Intellectual OS to study one precise concept.

My exact location:
${pathText}

Focus only on:
"${node.title}"
${importance === 'CORE' || importance === 'IMPORTANT' ? `
Curriculum priority: [${importance}]` : ''}

Teach this concept as a focused learning unit. Explain what it is, the immediate background needed to understand it, the key mechanism or causal story, the most important actors or components, and why it matters.

Then explain its significance inside its parent topic and the larger path above. If this is a historical event, conflict, person, institution or document, make clear what changed because of it and which later developments it helped produce. If it is a theory, mechanism or idea, explain what problem it addresses, how it works, and its main limitations or disagreements.

Do not broaden the lesson into a survey of the entire parent branch. Bring in neighboring topics only when they are necessary to explain this concept.

End with:
- the 3–5 things I should remember,
- the single most important reason this concept matters,
- and the most useful connection back to its parent topic.

After that, let me continue naturally with follow-up questions.`;
    }

    if (!node.parent_id) {
      return `I am using Intellectual OS to orient myself inside the field of ${node.title}.

Current location:
${pathText}

Top-level structure:
${branchText(node,1,50)}

Give me a big-picture map of this field. Explain what its major branches study, the central questions that organize the field, how the branches relate to one another, and which foundational ideas or historical developments connect them.

Do not try to teach every descendant topic individually. At this level I want orientation, structure and intellectual geography. Help me understand what exists to learn and how the major branches fit together.

End with:
- a compact map of the field,
- the major recurring questions,
- the most important connections between branches,
- and a sensible conceptual order in which I could explore them.

Keep the explanation anchored to the structure above and let me choose which folder to enter next.`;
    }

    const structure = depth <= 1
      ? branchText(node,1,50)
      : depth <= 2
        ? branchText(node,2,80)
        : descendants <= 120
          ? completeBranchText(node)
          : branchText(node,3,120);

    return `I am using Intellectual OS to study this exact branch of knowledge.

My location:
${pathText}

Current branch:
"${node.title}"

Branch structure:
${structure}

Teach this branch as one coherent scope. The deeper I move through the atlas, the tighter the lesson should become, so keep the explanation centered on this branch rather than drifting into the whole field.

Explain the core ideas, mechanisms, events, people, institutions, debates or examples that make this branch intelligible. Show how the child topics relate to one another instead of treating them as isolated encyclopedia entries. Use the parent path for orientation, not as an excuse to broaden the lesson.

Where causal or chronological relationships matter, make them explicit. Where the branch is conceptual, explain the organizing framework and the most important distinctions.

End with:
- a compact mental map of this branch,
- the most important internal connections,
- what I should understand before moving into its children,
- and which child folders represent genuinely different directions of study.

After that, let me continue naturally with follow-up questions.`;
  }

  function openMobileNode(id) {
    focusNode(id,{scroll:false});
  }

  function mobileBack() {
    if (!mobileNode) return;
    if (mobileParent) {
      openMobileNode(mobileParent.id);
      return;
    }

    setMobileNodeId(null);
    setSearch('');
    setSearchOpen(false);
  }

  function buildStudyPrompt() {
    if (!selectedNode) return '';

    const path=pathFor(selectedNode);
    const pathText=path.map(node => node.title).join(' → ');
    const siblingNames=siblings.slice(0,10).map(node => node.title).join(', ');
    const childNames=children.slice(0,20).map(node => node.title).join(', ');

    if (scope === 'country' && selectedCountry) {
      return historySynthesisPrompt(selectedCountry,{countryWide:true});
    }

    if (scope === 'branch') {
      if (selectedCountry && selectedNode.primary_field === 'History & Politics') {
        return historySynthesisPrompt(selectedNode);
      }

      return `I am using a knowledge map to guide my study.

My location:
${pathText}

Teach me the branch beginning at "${selectedNode.title}".

Branch structure:
${branchText(selectedNode,2)}

Use the tree as a scope map. Teach this branch comprehensively and conversationally, but keep me oriented inside it. Explain the important ideas, causal relationships, people, events, mechanisms, examples, debates, and context that genuinely matter.

Do not wander into neighboring branches unless they are necessary to understand this one. When you briefly leave the branch for context, make that explicit.

I want to learn this through normal ChatGPT conversation, so begin with a coherent explanation and then let me ask follow-up questions.`;
    }

    if (scope === 'parent' && parent) {
      return `I am using a knowledge map to guide my study.

My current location:
${pathText}

I want to study the parent topic "${parent.title}" while keeping special attention on "${selectedNode.title}".

Parent branch:
${branchText(parent,1)}

Teach the parent topic as a coherent whole so I understand where "${selectedNode.title}" fits among its sibling topics. Make the relationships between the branches clear rather than treating them as isolated facts.

Use the tree as the scope boundary. Do not move beyond this parent branch except briefly when necessary for context.`;
    }

    return `I am using a knowledge map to guide my study.

My exact location:
${pathText}

Focus only on: "${selectedNode.title}".

Teach this topic comprehensively and conversationally. Give me the context needed to understand it, but do not automatically move ahead into neighboring topics.

${childNames ? `This node contains these child topics, which you may use to structure the explanation when relevant: ${childNames}.` : ''}
${siblingNames ? `Nearby sibling topics are: ${siblingNames}. Treat them mainly as orientation and do not turn the answer into lessons about them unless necessary.` : ''}

I want to understand what this topic is, why it matters, how it works or developed, its most important examples or cases, major disagreements or limitations, and how it fits into the larger path above.

After the initial explanation, let me continue naturally with follow-up questions.`;
  }

  async function copyText(text,label) {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea=document.createElement('textarea');
      textarea.value=text;
      textarea.style.position='fixed';
      textarea.style.opacity='0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }

    setCopied(label);
    window.setTimeout(() => setCopied(''),1500);
  }

  function TreeNode({node,depth=0}) {
    const childNodes=childrenByParent.get(node.id) || [];
    const hasChildren=childNodes.length > 0;
    const isOpen=expanded.has(node.id);
    const isSelected=selectedNodeId === node.id;
    const onPath=selectedPathIds.has(node.id);
    const isDimmed=viewMode === 'focus' && !focusIds.has(node.id);

    return <div
      className={'atlas-tree-node '+(isDimmed ? 'dimmed' : '')}
      data-depth={depth}
    >
      <button
        id={'atlas-node-'+node.id}
        className={'atlas-tree-row '+(isSelected ? 'selected ' : '')+(onPath ? 'on-path ' : '')+(hasChildren ? 'branch ' : 'leaf ')}
        onClick={() => handleNodeClick(node)}
        aria-expanded={hasChildren ? isOpen : undefined}
      >
        <span className="atlas-node-state" aria-hidden="true">
          {hasChildren ? (isOpen ? '−' : '›') : '•'}
        </span>
        <span className="atlas-node-title">{node.title}</span>
        {hasChildren && <span className="atlas-child-count">{childNodes.length}</span>}
      </button>

      {hasChildren && isOpen && <div className="atlas-tree-children">
        {childNodes.map(child => <TreeNode key={child.id} node={child} depth={depth+1}/>)}
      </div>}
    </div>;
  }

  if (loading) {
    return <main className="atlas-loading">
      <div className="atlas-mark">IO</div>
      <h1>Building the knowledge map…</h1>
      <p>Loading the curriculum structure.</p>
    </main>;
  }

  if (loadError) {
    return <main className="atlas-loading">
      <div className="atlas-mark">IO</div>
      <h1>Could not load the map.</h1>
      <p>{loadError}</p>
      <button onClick={loadAtlas}>Try again</button>
    </main>;
  }

  return <main className="atlas-shell">
    <header className="atlas-header">
      <div className="atlas-brand">
        <div className="atlas-mark">IO</div>
        <div>
          <strong>INTELLECTUAL OS</strong>
          <span>Map what there is to learn.</span>
        </div>
      </div>

      <div className="atlas-search-wrap">
        <div className="atlas-search">
          <span>⌕</span>
          <input
            value={search}
            onChange={event => {
              setSearch(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={event => {
              if (event.key === 'Escape') setSearchOpen(false);
              if (event.key === 'Enter' && searchResults[0]) focusNode(searchResults[0].id);
            }}
            placeholder="Find any topic…"
          />
          {search && <button onClick={() => setSearch('')}>×</button>}
        </div>

        {searchOpen && search.trim().length >= 2 && <div className="atlas-search-results">
          {searchResults.length ? searchResults.map(result => {
            const path=pathFor(result);
            return <button key={result.id} onClick={() => focusNode(result.id)}>
              <strong>{result.title}</strong>
              <span>{path.slice(0,-1).map(node => node.title).join(' → ')}</span>
            </button>;
          }) : <div className="atlas-search-empty">No matching topic.</div>}
        </div>}
      </div>

      <div className="atlas-header-stat">
        <strong>{nodes.length.toLocaleString()}</strong>
        <span>topics mapped</span>
      </div>
    </header>

    <div className="atlas-workspace">
      <aside className="atlas-fields">
        <div className="atlas-panel-label">FIELDS</div>
        <div className="atlas-field-list">
          {roots.map(root => {
            const active=root.id === selectedFieldId;
            const meta=metaFor(root.title);

            return <button
              key={root.id}
              className={active ? 'active' : ''}
              onClick={() => selectField(root.id)}
            >
              <span className="field-icon">{meta.icon}</span>
              <span className="field-copy">
                <strong>{root.title}</strong>
                <small>{(fieldCounts[root.id] || 0).toLocaleString()} topics</small>
              </span>
            </button>;
          })}
        </div>

        <div className="atlas-field-note">
          <span>THE IDEA</span>
          <p>Use this site to orient yourself. Use ChatGPT to actually learn.</p>
        </div>
      </aside>

      <section className="atlas-map">
        <div className="atlas-map-toolbar">
          <div className="atlas-map-title">
            <span>{metaFor(selectedField?.title).icon}</span>
            <div>
              <small>KNOWLEDGE MAP</small>
              <strong>{selectedField?.title || 'Knowledge'}</strong>
            </div>
          </div>

          <div className="atlas-view-controls">
            <button className={viewMode === 'overview' ? 'active' : ''} onClick={showOverview}>Overview</button>
            <button className={viewMode === 'focus' ? 'active' : ''} onClick={() => showFocus()}>Focus</button>
            <button className={viewMode === 'full' ? 'active' : ''} onClick={showFull}>Full</button>
            <button onClick={collapseToPath}>Collapse</button>
            <span className="atlas-divider"></span>
            <button className="zoom-button" onClick={() => setZoom(value => clamp(value-10,60,140))}>−</button>
            <span className="zoom-label">{zoom}%</span>
            <button className="zoom-button" onClick={() => setZoom(value => clamp(value+10,60,140))}>+</button>
          </div>
        </div>

        <div className="atlas-breadcrumb">
          {selectedPath.map((node,index) => <span key={node.id}>
            {index > 0 && <i>→</i>}
            <button onClick={() => focusNode(node.id)}>{node.title}</button>
          </span>)}
        </div>

        <div className="atlas-tree-scroll" onClick={() => setSearchOpen(false)}>
          <div className={'atlas-tree-stage mode-'+viewMode} style={{'--atlas-zoom':zoom/100}}>
            {selectedField ? <TreeNode node={selectedField}/> : <div className="atlas-empty">Select a field.</div>}
          </div>
        </div>
      </section>

      <aside className="atlas-inspector">
        {selectedNode ? <>
          <div className="atlas-panel-label">YOU ARE HERE</div>

          <div className="atlas-inspector-path">
            {selectedPath.map((node,index) => <button key={node.id} onClick={() => focusNode(node.id)}>
              <span>{String(index+1).padStart(2,'0')}</span>
              <strong>{node.title}</strong>
            </button>)}
          </div>

          <div className="atlas-inspector-main">
            <small>{String(selectedNode.node_type || 'topic').replaceAll('_',' ').toUpperCase()}</small>
            <h1>{selectedNode.title}</h1>
            <p>{selectedNode.description || 'A node in the curriculum. Its position in the tree provides the learning context.'}</p>
          </div>

          <div className="atlas-context-grid">
            <div>
              <small>PARENT</small>
              {parent
                ? <button onClick={() => focusNode(parent.id)}>{parent.title}</button>
                : <span>Top-level field</span>}
            </div>
            <div>
              <small>CHILDREN</small>
              <strong>{children.length}</strong>
            </div>
            <div>
              <small>DESCENDANTS</small>
              <strong>{descendantCount(selectedNode.id)}</strong>
            </div>
          </div>

          {children.length > 0 && <button className="atlas-expand-branch" onClick={() => showFocus(selectedNode)}>
            <span>EXPAND ENTIRE BRANCH</span>
            <strong>Open every descendant of {selectedNode.title}</strong>
            <i>→</i>
          </button>}

          {children.length > 0 && <div className="atlas-related-block">
            <div className="atlas-panel-label">INSIDE THIS TOPIC</div>
            <div className="atlas-mini-list">
              {children.slice(0,12).map(child => <button key={child.id} onClick={() => focusNode(child.id)}>
                <span>↳</span>{child.title}
              </button>)}
              {children.length > 12 && <small>+ {children.length-12} more in the tree</small>}
            </div>
          </div>}

          {siblings.length > 0 && <div className="atlas-related-block">
            <div className="atlas-panel-label">NEARBY TOPICS</div>
            <div className="atlas-sibling-cloud">
              {siblings.slice(0,8).map(sibling => <button key={sibling.id} onClick={() => focusNode(sibling.id)}>
                {sibling.title}
              </button>)}
            </div>
          </div>}

          {selectedKnowledge && <div className="atlas-knowledge-block">
            <div className="atlas-knowledge-head">
              <div>
                <small>KNOWLEDGE HUB</small>
                <strong>{selectedKnowledge.label}</strong>
              </div>
              <span>{alsoAppears.length+1} {alsoAppears.length === 0 ? 'location' : 'locations'}</span>
            </div>

            {selectedKnowledge.description && <p className="atlas-knowledge-description">
              {selectedKnowledge.description}
            </p>}

            {alsoAppears.length > 0 && <div className="atlas-knowledge-section">
              <div className="atlas-panel-label">ALSO APPEARS IN</div>
              <div className="atlas-location-list">
                {alsoAppears.slice(0,6).map(node => {
                  const path=pathFor(node);
                  return <button key={node.id} onClick={() => focusNode(node.id)}>
                    <strong>{node.primary_field || path[0]?.title || 'Knowledge'}</strong>
                    <span>{path.slice(1,-1).map(item => item.title).join(' → ') || 'Direct field topic'}</span>
                  </button>;
                })}
                {alsoAppears.length > 6 && <small>+ {alsoAppears.length-6} more locations in the atlas</small>}
              </div>
            </div>}

            {relatedConcepts.length > 0 && <div className="atlas-knowledge-section">
              <div className="atlas-panel-label">RELATED CONCEPTS</div>
              <div className="atlas-concept-list">
                {relatedConcepts.slice(0,8).map(item => <button
                  key={item.edge.id || item.concept.id+'-'+item.edge.relation_type}
                  onClick={() => focusKnowledgeConcept(item.concept.id)}
                >
                  <strong>{item.concept.label}</strong>
                  <span>{relationText(item)}</span>
                </button>)}
              </div>
            </div>}
          </div>}

          <div className="atlas-study">
            <div className="atlas-study-heading">
              <div>
                <small>STUDY WITH CHATGPT</small>
                <strong>Choose your scope.</strong>
              </div>
            </div>

            <div className="atlas-scope">
              <button className={scope === 'concept' ? 'active' : ''} onClick={() => setScope('concept')}>
                <span>01</span>
                <div><strong>This concept</strong><small>Stay tightly focused here.</small></div>
              </button>
              <button className={scope === 'branch' ? 'active' : ''} onClick={() => setScope('branch')}>
                <span>02</span>
                <div><strong>This branch</strong><small>Include the child structure.</small></div>
              </button>
              <button
                className={scope === 'parent' ? 'active' : ''}
                onClick={() => parent && setScope('parent')}
                disabled={!parent}
              >
                <span>03</span>
                <div><strong>Parent topic</strong><small>Understand the surrounding branch.</small></div>
              </button>
              {selectedCountry && <button
                className={scope === 'country' ? 'active' : ''}
                onClick={() => setScope('country')}
              >
                <span>04</span>
                <div><strong>Country big picture</strong><small>Use every historical anchor in {selectedCountry.title}.</small></div>
              </button>}
            </div>

            <div className="atlas-copy-actions">
              <button onClick={() => copyText(selectedPath.map(node => node.title).join(' → '),'path')}>
                {copied === 'path' ? 'Copied path ✓' : 'Copy path'}
              </button>
              <button className="primary" onClick={() => copyText(buildStudyPrompt(),'prompt')}>
                {copied === 'prompt' ? 'Copied prompt ✓' : 'Copy study prompt'}
              </button>
            </div>
          </div>
        </> : <div className="atlas-inspector-empty">
          <span>SELECT A NODE</span>
          <p>The path, surrounding topics and study scope will appear here.</p>
        </div>}
      </aside>
    </div>

    <section className="mobile-explorer">
      <div className="mobile-explorer-inner">
        <div className="mobile-nav-head">
          {mobileNode
            ? <button className="mobile-back" onClick={mobileBack} aria-label="Go back">←</button>
            : <div className="mobile-root-mark">IO</div>}

          <div className="mobile-nav-copy">
            <small>{mobileNode ? nodePromptLabel(mobileNode) : 'KNOWLEDGE ATLAS'}</small>
            <strong>{mobileNode?.title || 'Choose a field'}</strong>
          </div>
        </div>

        {mobileNode && <div className="mobile-crumbs">
          {mobilePath.map((node,index) => <span key={node.id}>
            {index > 0 && <i>→</i>}
            <button onClick={() => openMobileNode(node.id)}>{node.title}</button>
          </span>)}
        </div>}

        {mobileNode ? <>
          <div className="mobile-current">
            <div className="mobile-current-meta">
              <small>{String(mobileNode.node_type || 'topic').replaceAll('_',' ')}</small>
              <span>{mobileChildren.length ? `${mobileChildren.length} inside · ${descendantCount(mobileNode.id)} total` : 'final leaf'}</span>
            </div>
            <h1>{mobileNode.title}</h1>
            <p>{mobileNode.description || (mobileChildren.length
              ? 'Open a folder below to narrow the scope. The study prompt becomes more specific at every level.'
              : 'This is the most focused learning unit in this path. Its prompt stays tightly centered on this concept and its significance.')}</p>
          </div>

          <div className="mobile-study">
            <div className="mobile-study-copy">
              <small>STUDY THIS LEVEL</small>
              <strong>{nodePromptLabel(mobileNode)}</strong>
              <span>{mobileChildren.length
                ? 'The prompt uses this folder as the scope boundary.'
                : 'The prompt focuses only on this leaf and why it matters.'}</span>
            </div>
            <button onClick={() => copyText(buildNodePrompt(mobileNode),'mobile-prompt')}>
              {copied === 'mobile-prompt' ? 'Copied ✓' : 'Copy prompt'}
            </button>
          </div>
        </> : <div className="mobile-current">
          <div className="mobile-current-meta">
            <small>INTELLECTUAL OS</small>
            <span>{nodes.length.toLocaleString()} topics</span>
          </div>
          <h1>Navigate knowledge like folders.</h1>
          <p>Choose a field, then move one level deeper at a time. Every folder has its own ChatGPT study prompt, and each prompt becomes more specific as the path narrows.</p>
        </div>}

        <div className="mobile-folder-section">
          <div className="mobile-section-head">
            <small>{mobileNode ? (mobileChildren.length ? 'GO DEEPER' : 'END OF BRANCH') : 'KNOWLEDGE FIELDS'}</small>
            <span>{mobileChildren.length ? `${mobileChildren.length} ${mobileChildren.length === 1 ? 'item' : 'items'}` : ''}</span>
          </div>

          {mobileChildren.length > 0 ? <div className="mobile-folder-list">
            {mobileChildren.map(child => {
              const childChildren=childrenByParent.get(child.id) || [];
              const childHasChildren=childChildren.length > 0;
              const count=childHasChildren ? descendantCount(child.id) : 0;
              const rootMeta=!mobileNode ? metaFor(child.title) : null;

              return <button className="mobile-folder-row" key={child.id} onClick={() => openMobileNode(child.id)}>
                <span className="mobile-folder-copy">
                  <strong>{child.title}</strong>
                  <span>{rootMeta
                    ? rootMeta.short
                    : childHasChildren
                      ? `${String(child.node_type || 'branch').replaceAll('_',' ')} · ${count} topics inside`
                      : `${String(child.node_type || 'topic').replaceAll('_',' ')} · focused leaf`}</span>
                </span>
                <span className="mobile-folder-side">
                  {childHasChildren && <span className="mobile-folder-count">{childChildren.length}</span>}
                  <span className="mobile-folder-arrow">{childHasChildren ? '›' : '•'}</span>
                </span>
              </button>;
            })}
          </div> : mobileNode && <div className="mobile-leaf-note">
            You have reached the final leaf. Copy the focused prompt above to study this concept without widening the scope.
          </div>}
        </div>
      </div>
    </section>
  </main>;
}
