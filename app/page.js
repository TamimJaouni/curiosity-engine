'use client';
import {useEffect,useState} from 'react';
import {concepts} from '../data/concepts';

const worlds=[
 {id:'psychology',name:'Psychology & Human Behavior',desc:'Mind, learning, emotion, relationships, development and psychological science.'},
 {id:'neuroscience',name:'Neuroscience',desc:'Neurons, brain systems, memory, reward, perception, sleep and brain disorders.'},
 {id:'body',name:'Body & Gym',desc:'Training anatomy, movement, hypertrophy, recovery and technique.'},
 {id:'economics',name:'Economics',desc:'Markets, macroeconomics, finance, political economy and schools of thought.'},
 {id:'social-sciences',name:'Social Sciences',desc:'Culture, groups, inequality, institutions, power, thinkers and methods.'},
 {id:'philosophy',name:'Continental Philosophy',desc:'Idealism, Marxism, phenomenology, existentialism and post-structural thought.'},
 {id:'analytic-philosophy',name:'Analytic Philosophy',desc:'Language, knowledge, metaphysics, mind, science, ethics and political philosophy.'},
 {id:'europe',name:'European History',desc:'Medieval society to World War I: institutions, everyday life, revolutions and state formation.'},
 {id:'modern-europe',name:'Modern European History',desc:'Europe from the post-WWI settlement to the present security order.'},
 {id:'middle-east',name:'Middle East History',desc:'Caliphates, empires, nationalism, wars, states, ideas and contemporary society.'}
];

function diverseSample(items,n=5,exclude=[]){
 const pool=items.filter(c=>!exclude.includes(c.id));
 const by={}; pool.forEach(c=>(by[c.topic||c.pool]??=[]).push(c));
 const groups=Object.values(by).sort(()=>Math.random()-.5);
 const out=[];
 groups.forEach(g=>{if(out.length<n)out.push(g[Math.floor(Math.random()*g.length)])});
 const rest=pool.filter(c=>!out.includes(c)).sort(()=>Math.random()-.5);
 return [...out,...rest].slice(0,n);
}

const bodyMap={
 'pectoralis-major':['front',50,32],'latissimus-dorsi':['back',50,38],'trapezius':['back',50,22],'rhomboids':['back',50,30],
 'anterior-deltoid':['front',35,27],'lateral-deltoid':['front',31,29],'posterior-deltoid':['back',34,28],
 'biceps-brachii':['front',29,39],'brachialis':['front',30,43],'triceps-brachii':['back',29,39],'forearms':['front',23,51],
 'rectus-abdominis':['front',50,48],'obliques':['front',39,48],'erector-spinae':['back',50,48],
 'gluteus-maximus':['back',50,61],'gluteus-medius':['back',39,57],'quadriceps':['front',43,70],
 'rectus-femoris':['front',47,70],'hamstrings':['back',43,70],'adductors':['front',47,66],
 'calves':['back',43,85],'gastrocnemius':['back',43,83],'soleus':['back',43,88],'hip-flexors':['front',43,59]
};

function BodyVisual({media,name}){
 const p=bodyMap[media?.region]; if(!p)return null; const back=p[0]==='back';
 return <div className="bodyvisual"><div><small>LOCATION</small><h3>{name}</h3><p>{back?'Back view':'Front view'} · highlighted area</p></div><svg viewBox="0 0 100 180" role="img" aria-label={name+' location on the body'}><circle cx="50" cy="16" r="10"/><path d="M38 29 Q50 24 62 29 L68 72 Q62 91 60 105 L65 166 L54 166 L50 112 L46 166 L35 166 L40 105 Q38 91 32 72 Z"/><path d="M34 34 L18 79 L25 82 L42 48 M66 34 L82 79 L75 82 L58 48"/><circle className="musclemark" cx={p[1]} cy={p[2]} r="9"/><circle className="musclecore" cx={p[1]} cy={p[2]} r="4"/></svg></div>
}

export default function Home(){
 const [screen,setScreen]=useState('home');
 const [cards,setCards]=useState([]);
 const [concept,setConcept]=useState(null);
 const [picked,setPicked]=useState(null);
 const [seen,setSeen]=useState([]);
 const [known,setKnown]=useState([]);
 const [world,setWorld]=useState('psychology');
 const [category,setCategory]=useState('');
 const [topic,setTopic]=useState('');

 useEffect(()=>{try{setSeen(JSON.parse(localStorage.getItem('ce-seen')||'[]'));setKnown(JSON.parse(localStorage.getItem('ce-known')||'[]'))}catch{}},[]);
 const persist=(s,k)=>{setSeen(s);setKnown(k);localStorage.setItem('ce-seen',JSON.stringify(s));localStorage.setItem('ce-known',JSON.stringify(k))};
 const itemsFor=id=>concepts.filter(c=>(c.world||'psychology')===id);
 const worldConcepts=itemsFor(world);
 const currentWorld=worlds.find(w=>w.id===world);
 const headings=[...new Set(worldConcepts.map(c=>c.pool).filter(Boolean))];
 const subheadsFor=label=>[...new Set(worldConcepts.filter(c=>c.pool===label).map(c=>c.topic||c.pool).filter(Boolean))];
 const poolFor=(cat=category,sub=topic)=>worldConcepts.filter(c=>(!cat||c.pool===cat)&&(!sub||(c.topic||c.pool)===sub));
 const worldCount=id=>itemsFor(id).length;

 const chooseWorld=id=>{setWorld(id);setCategory('');setTopic('');setConcept(null);setPicked(null);setScreen('categories')};
 const chooseCategory=label=>{
   const subs=[...new Set(itemsFor(world).filter(c=>c.pool===label).map(c=>c.topic||c.pool).filter(Boolean))];
   setCategory(label);setTopic('');setConcept(null);setPicked(null);
   if(subs.length<=1){const p=itemsFor(world).filter(c=>c.pool===label);setCards(diverseSample(p,5));setScreen('browse')}
   else setScreen('subcategories');
 };
 const chooseTopic=label=>{setTopic(label);setCards(diverseSample(poolFor(category,label),5));setScreen('browse');setConcept(null);setPicked(null)};
 const discover=()=>{const p=poolFor();setCards(diverseSample(p,5,cards.map(x=>x.id)));setScreen('browse');setConcept(null);setPicked(null)};
 const open=c=>{setConcept(c);setPicked(null);setScreen('play');if(!seen.includes(c.id))persist([...seen,c.id],known)};
 const answer=i=>{setPicked(i);if(i===concept.answer&&!known.includes(concept.id))persist(seen.includes(concept.id)?seen:[...seen,concept.id],[...known,concept.id])};
 const related=()=>open(worldConcepts.find(x=>concept.related?.includes(x.id)&&x.id!==concept.id)||worldConcepts.find(x=>x.id!==concept.id));
 const exploreTopic=()=>{
   const cat=concept.pool,sub=concept.topic||concept.pool;
   setCategory(cat);setTopic(sub);setCards(diverseSample(worldConcepts.filter(x=>x.pool===cat&&(x.topic||x.pool)===sub&&x.id!==concept.id),5));
   setConcept(null);setPicked(null);setScreen('browse');
 };
 const backFromBrowse=()=>setScreen(topic&&subheadsFor(category).length>1?'subcategories':'categories');

 return <main>
  <nav>
   <button className="brand" onClick={()=>setScreen('home')}><span>CE</span><strong>Curiosity Engine</strong></button>
   <div className="navright"><span>{seen.length} discovered</span><button className="ghost" onClick={()=>setScreen('worlds')}>Worlds</button></div>
  </nav>

  {screen==='home'&&<section className="hero">
   <div className="eyebrow">STUDY BY CURIOSITY</div>
   <h1>Learn one useful idea at a time.</h1>
   <p className="lead">Choose a subject, follow a question, test your intuition, then move deeper when something catches you.</p>
   <div className="heroactions"><button className="primary big" onClick={()=>chooseWorld('psychology')}>Start learning →</button><button className="ghost big" onClick={()=>setScreen('worlds')}>Browse worlds</button></div>
   <div className="stats"><div><b>{worlds.reduce((n,w)=>n+worldCount(w.id),0)}</b><span>study cards</span></div><div><b>{worlds.length}</b><span>worlds</span></div><div><b>{seen.length}</b><span>discovered</span></div></div>
  </section>}

  {screen==='worlds'&&<section className="wrap">
   <div className="eyebrow">WORLDS</div><h2>Choose a subject.</h2><p className="muted">Counts are live from the actual card library.</p>
   <div className="worldgrid">{worlds.map(w=>{
     const wc=itemsFor(w.id), areas=[...new Set(wc.map(c=>c.pool).filter(Boolean))].length;
     return <button key={w.id} className="world" onClick={()=>chooseWorld(w.id)}>
      <small>{worldCount(w.id)} concepts · {areas} areas</small><h3>{w.name}</h3><p>{w.desc}</p><b>Open subject →</b>
     </button>
   })}</div>
  </section>}

  {screen==='categories'&&<section className="wrap">
   <button className="back" onClick={()=>setScreen('worlds')}>← All worlds</button>
   <div className="eyebrow">{currentWorld?.name.toUpperCase()}</div><h2>Choose an area.</h2>
   <p className="muted">{worldConcepts.length} concepts. Broad areas first, then the deeper subtopics.</p>
   <div className="categorygrid">{headings.map(label=>{
     const subs=subheadsFor(label), count=worldConcepts.filter(c=>c.pool===label).length;
     return <button className="category" key={label} onClick={()=>chooseCategory(label)}>
      <small>{count} concepts · {subs.length} {subs.length===1?'topic':'topics'}</small>
      <h3>{label}</h3>
      <div className="subpreview">{subs.slice(0,4).map(s=><span key={s}>{s}</span>)}{subs.length>4&&<span>+{subs.length-4} more</span>}</div>
      <b>{subs.length>1?'View topics →':'Study →'}</b>
     </button>
   })}</div>
  </section>}

  {screen==='subcategories'&&<section className="wrap">
   <button className="back" onClick={()=>setScreen('categories')}>← {currentWorld?.name}</button>
   <div className="eyebrow">{category.toUpperCase()}</div><h2>Choose a topic.</h2>
   <p className="muted">Go specific, or return to the broader area at any time.</p>
   <div className="topicgrid">{subheadsFor(category).map(label=>{
     const count=worldConcepts.filter(c=>c.pool===category&&(c.topic||c.pool)===label).length;
     return <button className="topiccard" key={label} onClick={()=>chooseTopic(label)}><small>{count} concepts</small><h3>{label}</h3><b>Study →</b></button>
   })}</div>
  </section>}

  {screen==='browse'&&<section className="wrap browse">
   <button className="back" onClick={backFromBrowse}>← {topic&&subheadsFor(category).length>1?'Topics':'Areas'}</button>
   <div className="browsehead"><div><div className="eyebrow">{currentWorld?.name.toUpperCase()} · {(topic||category||'DISCOVERY').toUpperCase()}</div><h2>Pick one question.</h2></div><button className="ghost" onClick={discover}>Shuffle</button></div>
   <div className="cardstack">{cards.map((c,i)=><button className="conceptcard" onClick={()=>open(c)} key={c.id}><span className="num">{String(i+1).padStart(2,'0')}</span><div><small>{c.topic||c.pool}</small><h3>{c.name}</h3><p>{c.hook}</p></div><b>→</b></button>)}</div>
  </section>}

  {screen==='play'&&concept&&<section className="lesson wrap">
   <button className="back" onClick={()=>setScreen('browse')}>← Back to questions</button>
   <div className="eyebrow">{concept.topic||concept.pool}</div><h2>{concept.name}</h2>
   {concept.media?.kind==='body'&&<BodyVisual media={concept.media} name={concept.name}/>}
   {concept.visual&&<div className="conceptvisual">{concept.visual}</div>}
   <p className="question">{concept.question}</p>
   <div className="answers">{concept.options.map((o,i)=><button disabled={picked!==null} className={picked===null?'':i===concept.answer?'correct':picked===i?'wrong':''} onClick={()=>answer(i)} key={i}><span>{String.fromCharCode(65+i)}</span>{o}</button>)}</div>
   {picked!==null&&<div className="reveal">
    <div className="result">{picked===concept.answer?'Correct':'Review'}</div>
    <h3>Explanation</h3><p>{concept.reveal}</p>
    <h3>Connections</h3><div className="examples">{concept.examples.map(([a,b],i)=><div key={a+i}><b>{a}</b><p>{b}</p></div>)}</div>
    <div className="why"><small>WHY IT MATTERS</small><p>{concept.why}</p>{concept.caveat&&<p className="caveat"><b>Keep in mind:</b> {concept.caveat}</p>}</div>
    <div className="next"><button className="primary" onClick={discover}>5 new concepts →</button>{concept.topic&&<button className="ghost" onClick={exploreTopic}>Stay in this topic</button>}<button className="ghost" onClick={related}>Related concept</button></div>
   </div>}
  </section>}
 </main>
}
