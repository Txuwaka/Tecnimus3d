import {MusGame,PLAYER_NAMES,PHASE_NAMES,SIGNAL_NAMES} from './mus-game.js?v=0.7.0';
import {MusRules} from './mus-rules.js?v=0.7.0';
import {cardName,cardURL} from './cards.js?v=0.7.0';
import {loadProfile,saveProfile,normalizeProfile} from './profiles.js?v=0.7.0';

export function attachMusGame({world,view,time,speak,toast,resume,markTurn,refreshCards,profileChanged=()=>{},storage,confirmReset=()=>true,engine=new MusGame()}){
  const $=id=>document.getElementById(id);
  let visible=false,started=false,lastSequence=0,lastSignal=0,lastHand=0,signalsOpen=false,cameraView='seat',profile=loadProfile(storage),wasPaused=false;
  const names=()=>engine.state.names||PLAYER_NAMES;
  const labels={start:'Otra partida',resume:'Reanudar',mus:'Mus',cut:'Corto mus',pass:'Paso',bet:'Envido',ordago:'¡Órdago!',decline:'No quiero',accept:'Quiero',raise:'Subo',reveal:'Mostrar cartas',next:'Siguiente mano'};
  function applyProfile(value){profile=normalizeProfile(value);world.configureProfile(profile);profileChanged(profile)}
  function show(){resume();visible=true;document.body.classList.add('playing');$('game-panel').hidden=false;$('game-start').textContent='Volver a la partida';view(cameraView)}
  function openSettings(){wasPaused=engine.state.paused;if(started)engine.pause(true);$('profile-name').value=profile?.name||'';$('profile-partner').value=profile?.partner||'lola';$('profile-error').hidden=true;$('player-setup').showModal();$('profile-name').focus()}
  function cancelSettings(){$('player-setup').close();if(started&&visible)engine.pause(wasPaused)}
  function start(){if(!started&&!profile){openSettings();return}show();if(!started){started=true;engine.newGame(profile)}else{engine.pause(false);render(engine.snapshot())}}
  function explore(){visible=false;engine.pause(true);document.body.classList.remove('playing');$('game-panel').hidden=true;markTurn(null);view('general');toast('Partida en pausa. Vuelve cuando quieras con «Volver a la partida».')}
  function act(action){const amount=Number($('game-amount').value);if(action==='resume'){resume();engine.pause(false);return}if(!engine.play(action,amount)){toast(action==='mus'?'Marca al menos una carta para descartarla.':'Elige una cantidad entera válida.');return}if(['next','start'].includes(action)){signalsOpen=false;view(cameraView)}}
  function render(s){
    if(s.stage==='idle')return;
    const players=s.names||PLAYER_NAMES;
    world.setHands(s.hands,{revealed:s.revealed,selected:s.selected});
    $('game-us').textContent=s.scores.nosotros;$('game-them').textContent=s.scores.ellos;$('game-team').textContent=players.txuwa+' + '+players.lola;
    $('game-phase').textContent=s.stage==='mus'?'MUS':s.stage==='discard'?'DESCARTES':s.stage==='finished'?'FIN DE PARTIDA':PHASE_NAMES[s.phases[s.phaseIndex]]?.toUpperCase()||'RESULTADOS';
    $('game-mano').textContent='Mano '+s.handNumber+' · '+players[MusRules.ids[s.mano]]+' es mano';
    $('game-message').textContent=s.paused?'La partida está en pausa.':s.message;$('game-detail').textContent=s.paused?'Reanuda para seguir jugando.':s.detail;
    $('game-offer').hidden=!s.offer||!['response','settling'].includes(s.stage);$('game-offer').textContent=s.offer?.ordago?'¡ÓRDAGO!':(s.offer?.amount||0)+' piedras en juego';
    const canSelect=!s.paused&&s.stage==='mus'&&s.actor==='txuwa'&&s.waiting,focused=document.activeElement?.dataset?.discardIndex;
    $('game-hand').replaceChildren();s.hands.txuwa.forEach((card,i)=>{const b=document.createElement('button'),img=document.createElement('img');b.type='button';b.className='play-card'+(s.selected.includes(i)?' chosen':'');b.dataset.discardIndex=String(i);b.disabled=!canSelect;b.setAttribute('aria-pressed',String(s.selected.includes(i)));b.setAttribute('aria-label',cardName(card)+(s.selected.includes(i)?', seleccionada para descarte':''));img.src=cardURL(card);img.alt='';img.width=384;img.height=576;b.appendChild(img);b.addEventListener('click',()=>engine.toggleCard(i));$('game-hand').appendChild(b)});
    if(focused!==undefined&&canSelect)$('game-hand').children[Number(focused)]?.focus({preventScroll:true});
    const hand=s.hands.txuwa,points=MusRules.sum(hand),pairs=MusRules.pairs(hand);$('game-hand-note').textContent=canSelect?'Toca las cartas que quieras descartar.':'Tus cuatro cartas';$('game-strength').textContent=pairs.name+' · '+(points>=31?'Juego: ':'Punto: ')+points;
    const actions=engine.actions();$('game-actions').replaceChildren();for(const action of actions){const b=document.createElement('button');b.type='button';b.dataset.gameAction=action;b.textContent=action==='mus'?'Mus · '+s.selected.length+' al montón':labels[action];b.className='game-action'+(['cut','bet','accept','reveal','next','start','resume'].includes(action)?' emphasized':'')+(action==='ordago'?' ordago':'');b.disabled=action==='mus'&&!s.selected.length;b.addEventListener('click',()=>act(action));$('game-actions').appendChild(b)}
    if(!actions.length){const p=document.createElement('span');p.className='game-waiting';p.textContent=s.paused?'En pausa':s.actor?'Habla '+players[s.actor]+'…':'La mesa está hablando…';$('game-actions').appendChild(p)}
    $('game-bet-row').hidden=!actions.some(a=>['bet','raise'].includes(a));$('game-amount').min=actions.includes('raise')?'1':'2';
    $('game-signal-toggle').disabled=!engine.signals().length;$('game-signal-toggle').setAttribute('aria-expanded',String(signalsOpen));$('game-signals').hidden=!signalsOpen;$('game-signals').replaceChildren();for(const key of engine.signals()){const b=document.createElement('button');b.textContent=SIGNAL_NAMES[key];b.addEventListener('click',()=>{engine.signal(key);signalsOpen=false;render(engine.snapshot())});$('game-signals').appendChild(b)}
    const incoming=s.signalEvent?.to==='txuwa'?players[s.signalEvent.id]+' te indica: '+SIGNAL_NAMES[s.signalEvent.key]:'';$('game-signal-receipt').textContent=[incoming,s.signalReceipt].filter(Boolean).join(' · ')||'Las señas disponibles corresponden a tus cartas.';
    $('game-turn-feed').textContent=s.history.slice(-4).join(' → ');
    const resolved=['summary','finished'].includes(s.stage);$('game-results').hidden=!resolved;$('game-results').replaceChildren();if(resolved){for(const row of s.result){const p=document.createElement('p'),b=document.createElement('b');b.textContent=PHASE_NAMES[row.phase]+' · '+(row.side==='nosotros'?'Nuestra pareja':'Rivales');p.append(b,document.createTextNode(row.ordago?' · Órdago querido':` +${row.points}`+(row.refused?' · envite ya cobrado':'')));$('game-results').appendChild(p)}const p=document.createElement('p');p.className='revealed-hands';p.textContent=['txuwa','nico','lola','bruno'].map(id=>players[id]+': '+s.hands[id].map(cardName).join(', ')).join(' / ');$('game-results').appendChild(p)}
    if(visible)markTurn(!s.paused&&s.actor?s.actor:null);
    const event=s.lastAction;if(event&&event.sequence!==lastSequence){lastSequence=event.sequence;if(event.kind==='deal'){world.redeal(time());refreshCards()}else if(event.kind==='discard')world.discardCards(event.id,event.indices,time());else if(event.id&&visible){if(!['signal','ack'].includes(event.kind))speak(players[event.id],event.label);if(event.kind==='ack')world.gesture(event.id,'ack',time());if(event.kind==='signal')world.gesture(event.id,event.key,time())}}
    const gesture=s.signalEvent;if(gesture&&gesture.sequence!==lastSignal){lastSignal=gesture.sequence;world.gesture(gesture.id,gesture.key,time());if(visible&&gesture.to==='txuwa')toast(players[gesture.id]+' te hace una seña. Mira su cara.')}
    if(s.handNumber!==lastHand){lastHand=s.handNumber;$('game-amount').value='2';signalsOpen=false}
  }
  engine.subscribe(render);
  applyProfile(profile||{});
  // Keep first-use setup open when the name has not been chosen yet.
  if(!loadProfile(storage))profile=null;
  $('profile-form').addEventListener('submit',e=>{e.preventDefault();const raw=$('profile-name').value;if(!raw.trim()){$('profile-error').textContent='Escribe el nombre con el que quieres jugar.';$('profile-error').hidden=false;return}if(started&&!confirmReset())return;profile=saveProfile({name:raw,partner:$('profile-partner').value},storage);applyProfile(profile);$('player-setup').close();started=true;cameraView='seat';show();engine.newGame(profile)});
  $('profile-cancel').onclick=cancelSettings;$('player-setup').addEventListener('cancel',e=>{e.preventDefault();cancelSettings()});
  $('profile-open').onclick=openSettings;$('game-players').onclick=openSettings;
  $('game-start').onclick=start;$('game-exit').onclick=explore;$('game-camera').onclick=()=>{cameraView=cameraView==='seat'?'table':'seat';$('game-camera').textContent=cameraView==='seat'?'Ver mesa':'Mi silla';view(cameraView)};
  $('game-new').onclick=openSettings;
  $('game-signal-toggle').onclick=()=>{signalsOpen=!signalsOpen;render(engine.snapshot())};
  return {engine,start,explore,openSettings,toggleCard:i=>engine.toggleCard(i),get active(){return started},get visible(){return visible},pause(value){if(visible)engine.pause(value)},showSignals(){if(!visible)start();if(!started)return;signalsOpen=true;render(engine.snapshot())}};
}
