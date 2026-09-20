'use client';
import {useEffect,useState} from 'react';
import {concepts} from '../data/concepts';

const worlds=[
 {id:'psychology',name:'Psychology & Human Behavior',desc:'How minds judge, learn, remember and relate.',status:'live',target:'500–600'},
 {id:'neuroscience',name:'Neuroscience',desc:'Brain systems, memory, reward, sleep and behavior.',status:'next',target:'250–350'},
 {id:'body',name:'Body & Gym',desc:'Training-relevant anatomy, movement, hypertrophy and recovery.',status:'next',target:'120–180'},
 {id:'economics',name:'Economics',desc:'Markets, money, incentives, crises and institutions.',status:'planned',target:'400–600'},
 {id:'philosophy',name:'Continental Philosophy',desc:'Thinkers and ideas about self, freedom, society and meaning.',status:'planned',target:'300–450'},
 {id:'europe',name:'European History',desc:'Events, people, institutions and long processes across Europe.',status:'planned',target:'900–1,200'},
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

export default function Home(){
 const [screen,setScreen]=useState('home'),[cards,setCards]=useState([]),[concept,setConcept]=useState(null),[picked,setPicked]=useState(null),[seen,setSeen]=useState([]),[known,setKnown]=useState([]);
 useEffect(()=>{try{setSeen(JSON.parse(localStorage.getItem('ce-seen')||'[]'));setKnown(JSON.parse(localStorage.getItem('ce-known')||'[]'))}catch{}},[]);
 const persist=(s,k)=>{setSeen(s);setKnown(k);localStorage.setItem('ce-seen',JSON.stringify(s));localStorage.setItem('ce-known',JSON.stringify(k))};
 const discover=()=>{setCards(diverseSample(concepts));setScreen('browse');setConcept(null);setPicked(null)};
 const open=c=>{setConcept(c);setPicked(null);setScreen('play');if(!seen.includes(c.id))persist([...seen,c.id],known)};
 const answer=i=>{setPicked(i);if(i===concept.answer&&!known.includes(concept.id))persist(seen.includes(concept.id)?seen:[...seen,concept.id],[...known,concept.id])};
 const related=()=>open(concepts.find(x=>concept.related?.includes(x.id)&&x.id!==concept.id)||concepts.find(x=>x.id!==concept.id));
 return <main><nav><button className="brand" onClick={()=>setScreen('home')}><span>CE</span> Curiosity Engine</button><div className="navright"><span>{seen.length} discovered</span><button className="ghost" onClick={()=>setScreen('worlds')}>Worlds</button></div></nav>
 {screen==='home'&&<section className="hero"><div className="eyebrow">LEARN SIDEWAYS</div><h1>Find something<br/><i>worth knowing.</i></h1><p className="lead">Five ideas. Pick the one that catches you. Understand it quickly. Then wander somewhere else.</p><button className="primary big" onClick={discover}>Show me 5 ideas <b>→</b></button><p className="sub">No streaks. No homework. Just curiosity.</p><div className="preview"><span>Today you might discover</span><div>{diverseSample(concepts,3).map((c,i)=><article key={c.id}><small>0{i+1} · {c.pool}</small><h3>{c.name}</h3><p>{c.hook}</p></article>)}</div></div></section>}
 {screen==='worlds'&&<section className="wrap"><div className="eyebrow">WORLDS</div><h2>What are you curious about?</h2><p className="muted">One engine, different ways of learning. Visuals appear when they actually help.</p><div className="worldgrid">{worlds.map((w,i)=><button key={w.id} className={'world '+(w.status==='live'?'':'locked')} onClick={()=>w.status==='live'&&discover()}><small>0{i+1} · {w.target} concepts</small><h3>{w.name}</h3><p>{w.desc}</p><b>{w.status==='live'?'Explore →':w.status==='next'?'Building next':'Planned'}</b></button>)}</div></section>}
 {screen==='browse'&&<section className="wrap browse"><div className="browsehead"><div><div className="eyebrow">PSYCHOLOGY · DISCOVERY</div><h2>Which one pulls you in?</h2></div><button className="ghost" onClick={()=>setCards(diverseSample(concepts,5,cards.map(x=>x.id)))}>Shuffle ↻</button></div><div className="cardstack">{cards.map((c,i)=><button className="conceptcard" onClick={()=>open(c)} key={c.id}><span className="num">0{i+1}</span><div><small>{c.pool}</small><h3>{c.name}</h3><p>{c.hook}</p></div><b>→</b></button>)}</div><p className="hint">There is no best choice. Follow the question you want answered.</p></section>}
 {screen==='play'&&concept&&<section className="lesson wrap"><button className="back" onClick={()=>setScreen('browse')}>← Back to five</button><div className="eyebrow">{concept.pool.toUpperCase()} · QUICK DISCOVERY</div><h2>{concept.name}</h2>{concept.visual&&<div className="conceptvisual">{concept.visual}</div>}<p className="question">{concept.question}</p><div className="answers">{concept.options.map((o,i)=><button disabled={picked!==null} className={picked===null?'':i===concept.answer?'correct':picked===i?'wrong':''} onClick={()=>answer(i)} key={o}><span>{String.fromCharCode(65+i)}</span>{o}</button>)}</div>{picked!==null&&<div className="reveal"><div className="result">{picked===concept.answer?'That’s it.':'Here’s the interesting part.'}</div><h3>What’s going on?</h3><p>{concept.reveal}</p><h3>See it in the wild</h3><div className="examples">{concept.examples.map(([a,b])=><div key={a}><b>{a}</b><p>{b}</p></div>)}</div><div className="why"><small>WHY IT MATTERS</small><p>{concept.why}</p>{concept.caveat&&<p className="caveat"><b>Keep in mind:</b> {concept.caveat}</p>}</div><div className="next"><button className="primary" onClick={discover}>5 new concepts →</button><button className="ghost" onClick={related}>Related concept</button></div></div>}</section>}</main>
}