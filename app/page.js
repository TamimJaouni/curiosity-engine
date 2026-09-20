'use client';
import {useEffect,useState} from 'react';
import {concepts} from '../data/concepts';

const worlds=[
 {id:'psychology',name:'Psychology & Human Behavior',desc:'How minds judge, learn, remember and relate.',status:'live',target:'500–600'},
 {id:'neuroscience',name:'Neuroscience',desc:'Brain systems, memory, reward, sleep and behavior.',status:'next',target:'250–350'},
 {id:'body',name:'Body & Gym',desc:'Training-relevant anatomy, movement, hypertrophy and recovery.',status:'next',target:'120–180'},
 {id:'economics',name:'Economics',desc:'Markets, money, incentives, crises and institutions.',status:'planned',target:'400–600'},
 {id:'social-sciences',name:'Social Sciences',desc:'Society, culture, institutions, power, groups, inequality and human organization.',target:'140+',status:'live'},
 {id:'philosophy',name:'Continental Philosophy',desc:'German Idealism, phenomenology, existentialism, critical theory and post-structuralism',status:'planned',target:'300–450'},{id:'analytic-philosophy',name:'Analytic Philosophy',desc:'Logic, language, mind, knowledge, science, metaphysics and analytic ethics.',target:'327',status:'live'},
 {id:'europe',name:'European History',desc:'Events, people, institutions and long processes across Europe.',status:'planned',target:'900–1,200'},{id:'modern-europe',name:'Modern European History',desc:'Europe from the post-WWI settlement to today: dictatorship, war, integration, communism, democracy and the security order.',status:'live',target:'247'},
 {id:'middle-east',name:'Middle East History',desc:'Empires, states, movements and turning points across the region.',status:'planned',target:'700–900'},
 {id:'gulf',name:'UAE & The Gulf',desc:'Federation, oil, society, states and Gulf political economy.',status:'planned',target:'200–350'}
];

function diverseSample(items,n=5,exclude=[]){
 const pool=items.filter(c=>!exclude.includes(c.id));
 const by={}; pool.forEach(c=>(by[c.pool]??=[]).push(c));
 const groups=Object.values(by).sort(()=>Math.random()-.5);
 const out=[];
 groups.forEach(g=>{if(out.length<n)out.push(g[Math.floor(Math.random()*g.length)])});
 const rest=pool.filter(c=>!out.includes(c)).sort(()=>Math.random()-.5);
 return [...out,...rest].slice(0,n);
}

const bodyMap={
 'pectoralis-major':['front',50,32],'latissimus-dorsi':['back',50,38],'trapezius':['back',50,22],'rhomboids':['back',50,30],'anterior-deltoid':['front',35,27],'lateral-deltoid':['front',31,29],'posterior-deltoid':['back',34,28],'biceps-brachii':['front',29,39],'brachialis':['front',30,43],'triceps-brachii':['back',29,39],'forearms':['front',23,51],'rectus-abdominis':['front',50,48],'obliques':['front',39,48],'erector-spinae':['back',50,48],'gluteus-maximus':['back',50,61],'gluteus-medius':['back',39,57],'quadriceps':['front',43,70],'rectus-femoris':['front',47,70],'hamstrings':['back',43,70],'adductors':['front',47,66],'calves':['back',43,85],'gastrocnemius':['back',43,83],'soleus':['back',43,88],'hip-flexors':['front',43,59]
};
function BodyVisual({media,name}){
 const p=bodyMap[media?.region]; if(!p)return null; const back=p[0]==='back';
 return <div className="bodyvisual"><div><small>WHERE IT IS</small><h3>{name}</h3><p>{back?'Back view':'Front view'} · highlighted area</p></div><svg viewBox="0 0 100 180" role="img" aria-label={name+' location on the body'}><circle cx="50" cy="16" r="10"/><path d="M38 29 Q50 24 62 29 L68 72 Q62 91 60 105 L65 166 L54 166 L50 112 L46 166 L35 166 L40 105 Q38 91 32 72 Z"/><path d="M34 34 L18 79 L25 82 L42 48 M66 34 L82 79 L75 82 L58 48"/><circle className="musclemark" cx={p[1]} cy={p[2]} r="9"/><circle className="musclecore" cx={p[1]} cy={p[2]} r="4"/></svg></div>
}

export default function Home(){
 const [screen,setScreen]=useState('home'),[cards,setCards]=useState([]),[concept,setConcept]=useState(null),[picked,setPicked]=useState(null),[seen,setSeen]=useState([]),[known,setKnown]=useState([]),[world,setWorld]=useState('psychology'),[topicIds,setTopicIds]=useState([]),[topicLabel,setTopicLabel]=useState('');
 useEffect(()=>{try{setSeen(JSON.parse(localStorage.getItem('ce-seen')||'[]'));setKnown(JSON.parse(localStorage.getItem('ce-known')||'[]'))}catch{}},[]);
 const persist=(s,k)=>{setSeen(s);setKnown(k);localStorage.setItem('ce-seen',JSON.stringify(s));localStorage.setItem('ce-known',JSON.stringify(k))};
 const worldConcepts=concepts.filter(c=>(c.world||'psychology')===world);
 const discover=(nextWorld=world)=>{const pool=concepts.filter(c=>(c.world||'psychology')===nextWorld);setWorld(nextWorld);setTopicIds([]);setTopicLabel('');setCards(diverseSample(pool,5,nextWorld===world?cards.map(x=>x.id):[]));setScreen('browse');setConcept(null);setPicked(null)};
 const open=c=>{setConcept(c);setPicked(null);setScreen('play');if(!seen.includes(c.id))persist([...seen,c.id],known)};
 const answer=i=>{setPicked(i);if(i===concept.answer&&!known.includes(concept.id))persist(seen.includes(concept.id)?seen:[...seen,concept.id],[...known,concept.id])};
 const related=()=>open(worldConcepts.find(x=>concept.related?.includes(x.id)&&x.id!==concept.id)||worldConcepts.find(x=>x.id!==concept.id));
 const exploreTopic=()=>{const label=concept.topic||concept.pool;const pool=worldConcepts.filter(x=>(x.topic||x.pool)===label&&x.id!==concept.id);const fallback=worldConcepts.filter(x=>concept.related?.includes(x.id)&&x.id!==concept.id);const available=[...pool,...fallback.filter(x=>!pool.some(y=>y.id===x.id))];setTopicIds(available.map(x=>x.id));setTopicLabel(label);setCards(diverseSample(available,5));setScreen('browse');setConcept(null);setPicked(null)};
 return <main><nav><button className="brand" onClick={()=>setScreen('home')}><span>CE</span> Curiosity Engine</button><div className="navright"><span>{seen.length} discovered</span><button className="ghost" onClick={()=>setScreen('worlds')}>Worlds</button></div></nav>
 {screen==='home'&&<section className="hero"><div className="eyebrow">LEARN SIDEWAYS</div><h1>Find something<br/><i>worth knowing.</i></h1><p className="lead">Five ideas. Pick the one that catches you. Understand it quickly. Then wander somewhere else.</p><button className="primary big" onClick={discover}>Show me 5 ideas <b>→</b></button><p className="sub">No streaks. No homework. Just curiosity.</p><div className="preview"><span>Today you might discover</span><div>{diverseSample(concepts,3).map((c,i)=><article key={c.id}><small>0{i+1} · {c.pool}</small><h3>{c.name}</h3><p>{c.hook}</p></article>)}</div></div></section>}
 {screen==='worlds'&&<section className="wrap"><div className="eyebrow">WORLDS</div><h2>What are you curious about?</h2><p className="muted">One engine, different ways of learning. Visuals appear when they actually help.</p><div className="worldgrid">{worlds.map((w,i)=><button key={w.id} className="world" onClick={()=>discover(w.id)}><small>0{i+1} · {w.target} concepts</small><h3>{w.name}</h3><p>{w.desc}</p><b>Explore →</b></button>)}</div></section>}
 {screen==='browse'&&<section className="wrap browse"><div className="browsehead"><div><div className="eyebrow">{topicLabel?topicLabel.toUpperCase()+' · RABBIT HOLE':worlds.find(w=>w.id===world)?.name.toUpperCase()+' · DISCOVERY'}</div><h2>Which one pulls you in?</h2></div><button className="ghost" onClick={()=>{const pool=topicIds.length?worldConcepts.filter(x=>topicIds.includes(x.id)):worldConcepts;setCards(diverseSample(pool,5,cards.map(x=>x.id)))}}>Shuffle ↻</button></div><div className="cardstack">{cards.map((c,i)=><button className="conceptcard" onClick={()=>open(c)} key={c.id}><span className="num">0{i+1}</span><div><small>{c.pool}</small><h3>{c.name}</h3><p>{c.hook}</p></div><b>→</b></button>)}</div><p className="hint">There is no best choice. Follow the question you want answered.</p></section>}
 {screen==='play'&&concept&&<section className="lesson wrap"><button className="back" onClick={()=>setScreen('browse')}>← Back to five</button><div className="eyebrow">{concept.pool.toUpperCase()} · QUICK DISCOVERY</div><h2>{concept.name}</h2>{concept.media?.kind==='body'&&<BodyVisual media={concept.media} name={concept.name}/>} {concept.visual&&<div className="conceptvisual">{concept.visual}</div>}<p className="question">{concept.question}</p><div className="answers">{concept.options.map((o,i)=><button disabled={picked!==null} className={picked===null?'':i===concept.answer?'correct':picked===i?'wrong':''} onClick={()=>answer(i)} key={o}><span>{String.fromCharCode(65+i)}</span>{o}</button>)}</div>{picked!==null&&<div className="reveal"><div className="result">{picked===concept.answer?'That’s it.':'Here’s the interesting part.'}</div><h3>What’s going on?</h3><p>{concept.reveal}</p><h3>See it in the wild</h3><div className="examples">{concept.examples.map(([a,b])=><div key={a}><b>{a}</b><p>{b}</p></div>)}</div><div className="why"><small>WHY IT MATTERS</small><p>{concept.why}</p>{concept.caveat&&<p className="caveat"><b>Keep in mind:</b> {concept.caveat}</p>}</div><div className="next"><button className="primary" onClick={discover}>5 new concepts →</button><button className="ghost" onClick={exploreTopic}>Explore this topic →</button><button className="ghost" onClick={related}>Related concept</button></div></div>}</section>}</main>
}
