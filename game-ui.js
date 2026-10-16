import {MusGame,PLAYER_NAMES,PHASE_NAMES,SIGNAL_NAMES} from './mus-game.js';
import {MusRules} from './mus-rules.js';
import {cardName,cardURL} from './cards.js';

export function attachMusGame({world,view,time,speak,toast,resume,markTurn,refreshCards,confirmReset=()=>true,engine=new MusGame()}){
  const $=id=>document.getElementById(id);let visible=false,started=false,lastSequence=0,lastHand=0,signalsOpen=false;
  const labels={start:'Otra partida',resume:'Reanudar',mus:'Mus',cut:'Corto mus',pass:'Paso',bet:'Envido',ordago:'¡Órdago!',decline:'No quiero',accept:'Quiero',raise:'Subo',reveal:'Mostrar cartas',next:'Siguiente mano'};
  function show(){resume();visible=true;document.body.classList.add('playing');$('game-panel').hidden=false;$('game-start').textContent='Volver a la partida';view('table')}
  function start(){show();if(!started){started=true;engine.newGame()}else{engine.pause(false);render(engine.snapshot())}}
  function explore(){visible=false;engine.pause(true);document.body.classList.remove('playing');$('game-panel').hidden=true;markTurn(null);view('general');toast('Partida en pausa. Vuelve cuando quieras con «Volver a la partida».')}
  function act(action){const amount=Number($('game-amount').value);if(action==='resume'){resume();engine.pause(false);return}if(!engine.play(action,amount)){toast(action==='mus'?'Marca al menos una carta para descartarla.':'Elige una cantidad entera válida.');return}if(['next','start'].includes(action)){signalsOpen=false;view('table')}}
  function render(s){
    if(s.stage==='idle')return;
    world.setHands(s.hands,{revealed:s.revealed,selected:s.selected});
    $('game-us').textContent=s.scores.nosotros;$('game-them').textContent=s.scores.ellos;
    $('game-phase').textContent=s.stage==='mus'?'MUS':s.stage==='discard'?'DESCARTES':s.stage==='finished'?'FIN DE PARTIDA':PHASE_NAMES[s.phases[s.phaseIndex]]?.toUpperCase()||'RESULTADOS';
    $('game-mano').textContent='Mano '+s.handNumber+' · '+PLAYER_NAMES[MusRules.ids[s.mano]]+' es mano';
    $('game-message').textContent=s.paused?'La partida está en pausa.':s.message;$('game-detail').textContent=s.paused?'Reanuda para seguir jugando.':s.detail;
    $('game-offer').hidden=!s.offer||!['response','settling'].includes(s.stage);$('game-offer').textContent=s.offer?.ordago?'¡ÓRDAGO!':(s.offer?.amount||0)+' piedras en juego';
    const canSelect=!s.paused&&s.stage==='mus'&&s.actor==='txuwa'&&s.waiting;
    $('game-hand').replaceChildren();s.hands.txuwa.forEach((card,i)=>{const b=document.createElement('button'),img=document.createElement('img');b.type='button';b.className='play-card'+(s.selected.includes(i)?' chosen':'');b.disabled=!canSelect;b.setAttribute('aria-pressed',String(s.selected.includes(i)));b.setAttribute('aria-label',cardName(card)+(s.selected.includes(i)?', seleccionada para descarte':''));img.src=cardURL(card);img.alt='';img.width=384;img.height=576;b.appendChild(img);b.addEventListener('click',()=>engine.toggleCard(i));$('game-hand').appendChild(b)});
    const hand=s.hands.txuwa,points=MusRules.sum(hand),pairs=MusRules.pairs(hand);$('game-hand-note').textContent=canSelect?'Toca las cartas que quieras descartar.':'Tus cuatro cartas';$('game-strength').textContent=pairs.name+' · '+(points>=31?'Juego: ':'Punto: ')+points;
    const actions=engine.actions();$('game-actions').replaceChildren();for(const action of actions){const b=document.createElement('button');b.type='button';b.dataset.gameAction=action;b.textContent=action==='mus'?'Mus · '+s.selected.length+' al montón':labels[action];b.className='game-action'+(['cut','bet','accept','reveal','next','start','resume'].includes(action)?' emphasized':'')+(action==='ordago'?' ordago':'');b.disabled=action==='mus'&&!s.selected.length;b.addEventListener('click',()=>act(action));$('game-actions').appendChild(b)}
    if(!actions.length){const p=document.createElement('span');p.className='game-waiting';p.textContent=s.paused?'En pausa':'La mesa está hablando…';$('game-actions').appendChild(p)}
    $('game-bet-row').hidden=!actions.some(a=>['bet','raise'].includes(a));$('game-amount').min=actions.includes('raise')?'1':'2';
    $('game-signal-toggle').disabled=!engine.signals().length;$('game-signal-toggle').setAttribute('aria-expanded',String(signalsOpen));$('game-signals').hidden=!signalsOpen;$('game-signals').replaceChildren();for(const key of engine.signals()){const b=document.createElement('button');b.textContent=SIGNAL_NAMES[key];b.addEventListener('click',()=>{engine.signal(key);signalsOpen=false;render(engine.snapshot())});$('game-signals').appendChild(b)}$('game-signal-receipt').textContent=s.signalReceipt||'Las señas disponibles corresponden a tus cartas.';
    const resolved=['summary','finished'].includes(s.stage);$('game-results').hidden=!resolved;$('game-results').replaceChildren();if(resolved){for(const row of s.result){const p=document.createElement('p'),b=document.createElement('b');b.textContent=PHASE_NAMES[row.phase]+' · '+(row.side==='nosotros'?'Nuestra pareja':'Rivales');p.append(b,document.createTextNode(row.ordago?' · Órdago querido':` +${row.points}`+(row.refused?' · envite ya cobrado':'')));$('game-results').appendChild(p)}const p=document.createElement('p');p.className='revealed-hands';p.textContent=['txuwa','nico','lola','bruno'].map(id=>PLAYER_NAMES[id]+': '+s.hands[id].map(cardName).join(', ')).join(' / ');$('game-results').appendChild(p)}
    if(visible)markTurn(!s.paused&&s.actor?s.actor:null);
    const event=s.lastAction;if(event&&event.sequence!==lastSequence){lastSequence=event.sequence;if(event.kind==='deal'){world.redeal(time());refreshCards()}else if(event.kind==='discard')world.discardCards(event.id,event.indices,time());else if(event.id&&visible){speak(PLAYER_NAMES[event.id],event.label);if(event.kind==='ack')world.signal(time())}}
    if(s.handNumber!==lastHand){lastHand=s.handNumber;$('game-amount').value='2';signalsOpen=false}
  }
  engine.subscribe(render);
  $('game-start').onclick=start;$('game-exit').onclick=explore;$('game-camera').onclick=()=>view('table');
  $('game-new').onclick=()=>{if(started&&!confirmReset())return;show();started=true;engine.newGame()};
  $('game-signal-toggle').onclick=()=>{signalsOpen=!signalsOpen;render(engine.snapshot())};
  return {engine,start,explore,toggleCard:i=>engine.toggleCard(i),get active(){return started},get visible(){return visible},pause(value){if(visible)engine.pause(value)},showSignals(){if(!visible)start();signalsOpen=true;render(engine.snapshot())}};
}
