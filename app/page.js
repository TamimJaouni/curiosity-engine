'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const FIELD_META = {
  'History & Politics': { icon:'♜', short:'History, power, institutions, conflict and states.' },
  'Economics': { icon:'◫', short:'Markets, incentives, money, growth and political economy.' },
  'Philosophy & Ideas': { icon:'◇', short:'Reason, knowledge, ethics, mind and major traditions.' },
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
    const {data,error}=await supabase
      .from(table)
      .select('*')
      .order(orderColumn,{ascending:true})
      .range(from,from+pageSize-1);

    if (error) return {data:all,error};
    all=all.concat(data || []);
    if (!data || data.length < pageSize) break;
    from+=pageSize;
  }

  return {data:all,error:null};
}

function metaFor(title) {
  return FIELD_META[title] || {icon:'◌',short:'A territory in the knowledge map.'};
}

function clamp(value,min,max) {
  return Math.min(max,Math.max(min,value));
}

export default function Home() {
  const [nodes,setNodes]=useState([]);
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState('');

  const [selectedFieldId,setSelectedFieldId]=useState(null);
  const [selectedNodeId,setSelectedNodeId]=useState(null);
  const [expanded,setExpanded]=useState(() => new Set());

  const [search,setSearch]=useState('');
  const [searchOpen,setSearchOpen]=useState(false);
  const [zoom,setZoom]=useState(100);
  const [scope,setScope]=useState('concept');
  const [copied,setCopied]=useState('');

  useEffect(() => {
    loadAtlas();
  },[]);

  async function loadAtlas() {
    setLoading(true);
    setLoadError('');

    const result=await fetchAllRows('essay_nodes','sort_order');
    if (result.error) {
      setLoadError(result.error.message || 'Could not load the curriculum.');
      setLoading(false);
      return;
    }

    const loaded=result.data || [];
    setNodes(loaded);

    const roots=loaded.filter(node => !node.parent_id);
    if (roots[0]) {
      setSelectedFieldId(roots[0].id);
      setSelectedNodeId(roots[0].id);
      setExpanded(new Set([roots[0].id]));
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
    setScope('concept');
    setExpanded(new Set([id]));
    setSearch('');
    setSearchOpen(false);

    window.setTimeout(() => {
      document.querySelector('.atlas-tree-scroll')?.scrollTo({top:0,left:0,behavior:'smooth'});
    },20);
  }

  function toggleNode(id,event) {
    event?.stopPropagation();
    setExpanded(previous => {
      const next=new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandToDepth(maxDepth) {
    if (!selectedFieldId) return;
    const next=new Set();

    function walk(id,depth) {
      if (depth <= maxDepth) next.add(id);
      if (depth >= maxDepth) return;
      for (const child of childrenByParent.get(id) || []) walk(child.id,depth+1);
    }

    walk(selectedFieldId,0);

    for (const node of selectedPath) next.add(node.id);
    setExpanded(next);
  }

  function expandAll() {
    if (!selectedFieldId) return;
    const ids=[selectedFieldId,...descendantsOf(selectedFieldId).map(node => node.id)];
    setExpanded(new Set(ids));
  }

  function collapseAll() {
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

  function buildStudyPrompt() {
    if (!selectedNode) return '';

    const path=pathFor(selectedNode);
    const pathText=path.map(node => node.title).join(' → ');
    const siblingNames=siblings.slice(0,10).map(node => node.title).join(', ');
    const childNames=children.slice(0,20).map(node => node.title).join(', ');

    if (scope === 'branch') {
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

    return <div className="atlas-tree-node" data-depth={depth}>
      <div
        id={'atlas-node-'+node.id}
        className={'atlas-tree-row '+(isSelected ? 'selected ' : '')+(onPath ? 'on-path ' : '')}
        onClick={() => focusNode(node.id,{scroll:false})}
      >
        <button
          className={'atlas-caret '+(!hasChildren ? 'empty' : '')}
          onClick={event => hasChildren && toggleNode(node.id,event)}
          aria-label={hasChildren ? (isOpen ? 'Collapse topic' : 'Expand topic') : 'No child topics'}
        >
          {hasChildren ? (isOpen ? '−' : '+') : '·'}
        </button>

        <span className="atlas-node-dot"></span>

        <div className="atlas-node-copy">
          <span className="atlas-node-title">{node.title}</span>
          {depth === 0 && <span className="atlas-node-subtitle">{metaFor(node.title).short}</span>}
        </div>

        {hasChildren && <span className="atlas-child-count">{childNodes.length}</span>}
      </div>

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
              <small>KNOWLEDGE TREE</small>
              <strong>{selectedField?.title || 'Knowledge'}</strong>
            </div>
          </div>

          <div className="atlas-view-controls">
            <button onClick={() => expandToDepth(1)}>Overview</button>
            <button onClick={() => expandToDepth(2)}>Context</button>
            <button onClick={expandAll}>Expand all</button>
            <button onClick={collapseAll}>Collapse</button>
            <span className="atlas-divider"></span>
            <button className="zoom-button" onClick={() => setZoom(value => clamp(value-10,70,140))}>−</button>
            <span className="zoom-label">{zoom}%</span>
            <button className="zoom-button" onClick={() => setZoom(value => clamp(value+10,70,140))}>+</button>
          </div>
        </div>

        <div className="atlas-breadcrumb">
          {selectedPath.map((node,index) => <span key={node.id}>
            {index > 0 && <i>→</i>}
            <button onClick={() => focusNode(node.id)}>{node.title}</button>
          </span>)}
        </div>

        <div className="atlas-tree-scroll" onClick={() => setSearchOpen(false)}>
          <div className="atlas-tree-stage" style={{'--atlas-zoom':zoom/100}}>
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
  </main>;
}
