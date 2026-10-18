const JOURNAL_KEY='tecnimus-3d-journal-v1',PACE_KEY='tecnimus-3d-pace-v1';
const PACES=[2000,4000,1000];

export function attachTableTools({engine,world,storage,toast}){
  const $=id=>document.getElementById(id);
  let notebook={entries:[],scores:{nosotros:0,ellos:0}},lastSequence=-1,wasPaused=false,pauseGeneration=-1,pauseOwned=false;
  try{const saved=JSON.parse(storage?.getItem(JOURNAL_KEY)||'null');if(Array.isArray(saved?.entries))notebook={...saved,entries:saved.entries.filter(e=>typeof e.label==='string'&&typeof e.name==='string').slice(-600)}}catch{}
  try{const pace=Number(storage?.getItem(PACE_KEY));if(PACES.includes(pace))engine.setDelay(pace)}catch{}
  function renderNotebook(){
    const entries=notebook.entries;$('journal-ledger').replaceChildren();
    $('journal-summary').textContent=entries.length?'Nuestra pareja '+(notebook.scores?.nosotros||0)+' — '+(notebook.scores?.ellos||0)+' Rivales':'Todavía no hay jugadas apuntadas.';
    const hands=[...new Set(entries.map(e=>e.hand))].reverse();
    for(const hand of hands){
      const section=document.createElement('section'),title=document.createElement('h3'),list=document.createElement('ol');title.textContent='Mano '+hand;
      for(const entry of entries.filter(e=>e.hand===hand)){
        const row=document.createElement('li'),phase=document.createElement('small'),name=document.createElement('b'),label=document.createElement('span');
        row.dataset.voice=entry.voice||'';phase.textContent=entry.phase;name.textContent=entry.name;label.textContent=entry.label;row.append(phase,name,label);
        if(entry.kind==='score'||entry.kind==='reveal'){const score=document.createElement('em');score.textContent=(entry.scores?.nosotros||0)+' — '+(entry.scores?.ellos||0);row.appendChild(score)}
        list.appendChild(row);
      }
      section.append(title,list);$('journal-ledger').appendChild(section);
    }
  }
  function open(){
    if($('journal-dialog').open)return;
    wasPaused=engine.state.paused;pauseGeneration=engine.generation;pauseOwned=engine.state.stage!=='idle';
    if(pauseOwned)engine.pause(true);renderNotebook();$('journal-dialog').showModal();
  }
  function close(){
    $('journal-dialog').close();if(pauseOwned&&pauseGeneration===engine.generation)engine.pause(wasPaused);pauseOwned=false;
    (document.getElementById(engine.state.stage==='idle'?'journal-open':'game-journal'))?.focus({preventScroll:true});
  }
  function capture(s){
    const pace=PACES.includes(engine.delay)?engine.delay:2000;
    $('game-speed').textContent='Ritmo · '+pace/1000+' s';$('game-speed').title='Cambiar ritmo: 1, 2 o 4 segundos. Tus decisiones no tienen límite.';
    const sequence=s.log?.at(-1)?.sequence;if(sequence===undefined||sequence===lastSequence)return;lastSequence=sequence;
    notebook={entries:s.log.map(e=>({...e,voice:e.id?world.getPerson(e.id).type:''})),scores:{...s.scores}};
    try{storage?.setItem(JOURNAL_KEY,JSON.stringify(notebook))}catch{}
    if($('journal-dialog').open)renderNotebook();
  }
  $('journal-open').onclick=open;$('game-journal').onclick=open;$('journal-close').onclick=close;$('journal-back').onclick=close;
  $('journal-dialog').addEventListener('cancel',e=>{e.preventDefault();close()});
  $('game-speed').onclick=()=>{const index=PACES.indexOf(engine.delay),pace=PACES[((index<0?0:index)+1)%PACES.length];engine.setDelay(pace);try{storage?.setItem(PACE_KEY,String(pace))}catch{}toast('Ritmo de mesa: '+pace/1000+' segundos. Tú sigues sin reloj.')};
  const unsubscribe=engine.subscribe(capture);capture(engine.snapshot());
  return {open,close,dispose:unsubscribe};
}
