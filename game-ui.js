import {attachTableTools} from './table-tools.js?v=0.17.0';
import {explainLance} from './review.js?v=0.17.0';
import {MusGame,PLAYER_NAMES,PHASE_NAMES,SIGNAL_NAMES} from './mus-game.js?v=0.17.0';
import {MusRules} from './mus-rules.js?v=0.17.0';
import {cardName,cardURL} from './cards.js?v=0.17.0';
import {loadProfile,saveProfile,normalizeProfile,PARTNERS,CHARACTER_NAMES} from './profiles.js?v=0.17.0';
import {javielLine} from './javiel.js?v=0.17.0';

// Public turn information only. A private signal must never steal the turn.
export function turnCue(s){
  if(s.paused||!MusRules.ids.includes(s.actor)||['idle','ready','summary','finished'].includes(s.stage))return null;
  const name=(s.names||PLAYER_NAMES)[s.actor],prefix=name+': ',said=s.message.startsWith(prefix)?s.message.slice(prefix.length):'';
  const human=s.actor==='txuwa',phase=PHASE_NAMES[s.phases[s.phaseIndex]]||'este lance';
  let line=said;
  if(!line){
    if(s.stage==='mus')line=human?'¿Mus o corto?':'Decide: mus o corto';
    else if(s.stage==='response')line=s.offer?.ordago?'Responde al órdago':'Responde al envite';
    else line=(human?'Te toca en ':'Decide en ')+phase;
  }
  return {id:s.actor,line,waiting:human&&s.waiting,speaking:!!said};
}

export function attachMusGame({world,view,time,speak,toast,resume,markTurn,refreshCards,profileChanged=()=>{},storage,confirmReset=()=>true,engine=new MusGame()}){
  const $=id=>document.getElementById(id);
  let visible=false,started=false,lastSequence=0,lastSignal=0,lastHand=0,signalsOpen=false,cameraView='seat',profile=loadProfile(storage),wasPaused=false,countWasShown=false;
  let lastComment=0,commentText='',commentTimer=null;
  const names=()=>engine.state.names||PLAYER_NAMES;
  const labels={start:'Otra partida',resume:'Reanudar',mus:'Mus',cut:'Corto mus',pass:'Paso',bet:'Envido',ordago:'¡Órdago!',decline:'No quiero',accept:'Quiero',raise:'Subo',reveal:'Mostrar cartas',next:'Siguiente mano'};
  function applyProfile(value){profile=normalizeProfile(value);world.configureProfile(profile);profileChanged(profile)}
  function show(){resume();visible=true;document.body.classList.add('playing');$('game-panel').hidden=false;$('game-announcement').hidden=false;$('game-start').textContent='Volver a la partida';view(cameraView)}
  const characterHints={lola:'La reina del farol',bruno:'El bigote tiene un plan',nico:'Cálculos y croquetas'};
  function syncSetupNames(){
    for(const id of PARTNERS){
      const name=$('profile-name-'+id).value.trim()||CHARACTER_NAMES[id];
      $('profile-option-'+id).textContent=name+' · '+characterHints[id];
      $('profile-role-'+id).textContent=CHARACTER_NAMES[id]+' · '+($('profile-partner').value===id?'tu compañero':'rival');
    }
  }
  function openSettings(){wasPaused=engine.state.paused;if(started)engine.pause(true);$('profile-name').value=profile?.name||'';$('profile-partner').value=profile?.partner||'lola';$('profile-corrido').checked=profile?.firstHandCorrido!==false;for(const id of PARTNERS)$('profile-name-'+id).value=profile?.characterNames[id]||CHARACTER_NAMES[id];syncSetupNames();$('profile-error').hidden=true;$('player-setup').showModal();$('profile-name').focus()}
  function cancelSettings(){$('player-setup').close();if(started&&visible)engine.pause(wasPaused)}
  function start(){if(!started&&!profile){openSettings();return}show();if(!started){started=true;engine.newGame(profile)}else{engine.pause(false);render(engine.snapshot())}}
  function explore(){visible=false;engine.pause(true);syncJaviel();document.body.classList.remove('playing');$('game-panel').hidden=true;$('game-announcement').hidden=true;$('game-options').open=false;markTurn(null);view('general');toast('Partida en pausa. Vuelve cuando quieras con «Volver a la partida».')}
  function act(action){const amount=Number($('game-amount').value);if(action==='resume'){resume();engine.pause(false);return}if(!engine.play(action,amount)){toast(action==='mus'?'Marca al menos una carta para descartarla.':'Elige una cantidad entera válida.');return}if(['next','start'].includes(action)){signalsOpen=false;view(cameraView)}}
  function resultRows(target,s,explain=false){
    target.replaceChildren();
    for(const row of s.result){const p=document.createElement('p'),b=document.createElement('b');b.textContent=PHASE_NAMES[row.phase]+' · '+(row.side==='nosotros'?'Nuestra pareja':'Rivales');p.append(b,document.createTextNode(row.ordago?' · Órdago querido':` +${row.points}`+(row.refused?' · envite ya cobrado':'')));if(explain){const why=document.createElement('small');why.className='count-reason';why.textContent=explainLance(s,row);p.appendChild(why)}target.appendChild(p)}
  }
  function syncJaviel(){
    const inCount=!!$('count-dialog').open;
    $('javiel-line').textContent=commentText;$('count-javiel-line').textContent=commentText;
    $('javiel-comment').hidden=!visible||!commentText||inCount;
    $('count-javiel-comment').hidden=!visible||!commentText||!inCount;
  }
  function renderJaviel(s){
    if(!s.commentEvent){commentText='';if(commentTimer!==null)engine.clearTimer(commentTimer);commentTimer=null}
    else if(s.commentEvent.sequence!==lastComment&&visible&&!s.paused){
      lastComment=s.commentEvent.sequence;commentText=javielLine(s.commentEvent,s.names);
      if(commentTimer!==null)engine.clearTimer(commentTimer);
      if(commentText){world.comment(time());commentTimer=engine.setTimer(()=>{commentTimer=null;if(!$('count-dialog').open){commentText='';syncJaviel()}},5000)}
    }
    syncJaviel();
  }
  function closeCount(focus=true){if($('count-dialog').open)$('count-dialog').close();syncJaviel();if(focus)$('game-count-open').focus({preventScroll:true})}
  function showCount(s=engine.snapshot()){
    if(!s.revealed||!['summary','finished'].includes(s.stage))return;
    const players=s.names||PLAYER_NAMES;
    $('count-title').textContent=s.stage==='finished'?'Final de partida':'El conteo';
    $('count-note').textContent='Mano '+s.handNumber+' · Nuestra pareja '+s.scores.nosotros+' — '+s.scores.ellos+' Rivales';
    resultRows($('count-summary'),s);resultRows($('count-breakdown'),s,true);$('count-explanation').open=false;$('count-hands').replaceChildren();
    for(const id of ['txuwa','lola','bruno','nico']){
      const panel=document.createElement('section'),name=document.createElement('h3'),role=document.createElement('small'),cards=document.createElement('div'),info=document.createElement('p');
      panel.className='count-player';panel.dataset.player=id;panel.dataset.voice=world.getPerson(id).type;
      name.textContent=players[id];name.title=players[id];role.textContent=id==='txuwa'?'Tú':id==='lola'?'Tu pareja':'Rival';name.appendChild(role);cards.className='count-cards';
      for(const card of s.hands[id]){const img=document.createElement('img');img.src=cardURL(card);img.alt=cardName(card);img.width=384;img.height=576;cards.appendChild(img)}
      const total=MusRules.sum(s.hands[id]);info.textContent=MusRules.pairs(s.hands[id]).name+' · '+(total>=31?'Juego: ':'Punto: ')+total;
      panel.append(name,cards,info);const won=s.result.filter(row=>!row.refused&&row.winner===id).map(row=>'Gana '+PHASE_NAMES[row.phase]);if(won.length){const badge=document.createElement('p');badge.className='count-wins';badge.textContent=won.join(' · ');panel.appendChild(badge)}$('count-hands').appendChild(panel);
    }
    $('count-next').textContent=s.stage==='finished'?'Otra partida →':'Siguiente mano →';
    countWasShown=true;if(!$('count-dialog').open)$('count-dialog').showModal();syncJaviel();
  }
  function render(s){
    if(s.stage==='idle')return;
    const players=s.names||PLAYER_NAMES;
    world.setHands(s.hands,{revealed:s.revealed,selected:s.selected});world.setSignalsAllowed(!s.signalsLocked);world.setMano(s.corrido&&s.stage==='mus'&&s.actor?s.actor:MusRules.ids[s.mano]);
    $('game-us').textContent=s.scores.nosotros;$('game-them').textContent=s.scores.ellos;$('game-team').textContent=players.txuwa+' + '+players.lola;
    $('game-phase').textContent=s.stage==='mus'?(s.corrido?'MUS CORRIDO':'MUS'):s.stage==='discard'?'DESCARTES':s.stage==='finished'?'FIN DE PARTIDA':PHASE_NAMES[s.phases[s.phaseIndex]]?.toUpperCase()||'RESULTADOS';
    $('game-mano').textContent='Mano '+s.handNumber+' · '+(s.corrido?'Se decide al cortar':players[MusRules.ids[s.mano]]+' es mano');
    $('game-announcement').dataset.voice=s.actor?world.getPerson(s.actor).type:'beard';
    $('game-message').textContent=s.paused?'La partida está en pausa.':s.message;$('game-detail').textContent=s.paused?'Reanuda para seguir jugando.':s.detail;
    $('game-offer').hidden=!s.offer||!['response','settling'].includes(s.stage);$('game-offer').textContent=s.offer?.ordago?'¡ÓRDAGO!':(s.offer?.amount||0)+' piedras en juego';
    const canSelect=!s.paused&&s.stage==='mus'&&s.actor==='txuwa'&&s.waiting,focused=document.activeElement?.dataset?.discardIndex;
    $('game-hand').replaceChildren();s.hands.txuwa.forEach((card,i)=>{const b=document.createElement('button'),img=document.createElement('img');b.type='button';b.className='play-card'+(s.selected.includes(i)?' chosen':'');b.dataset.discardIndex=String(i);b.disabled=!canSelect;b.setAttribute('aria-pressed',String(s.selected.includes(i)));b.setAttribute('aria-label',cardName(card)+(s.selected.includes(i)?', seleccionada para descarte':''));img.src=cardURL(card);img.alt='';img.width=384;img.height=576;b.appendChild(img);b.addEventListener('click',()=>engine.toggleCard(i));$('game-hand').appendChild(b)});
    if(focused!==undefined&&canSelect)$('game-hand').children[Number(focused)]?.focus({preventScroll:true});
    const hand=s.hands.txuwa,points=MusRules.sum(hand),pairs=MusRules.pairs(hand);$('game-hand-note').textContent=canSelect?'Toca las cartas que quieras descartar.':'Tus cuatro cartas';$('game-strength').textContent=pairs.name+' · '+(points>=31?'Juego: ':'Punto: ')+points;
    const actions=engine.actions();$('game-actions').replaceChildren();for(const action of actions){const b=document.createElement('button');b.type='button';b.dataset.gameAction=action;b.textContent=action==='mus'?'Mus · '+s.selected.length+' al montón':labels[action];b.className='game-action'+(['cut','bet','accept','reveal','next','start','resume'].includes(action)?' emphasized':'')+(action==='ordago'?' ordago':'');b.disabled=action==='mus'&&!s.selected.length;b.addEventListener('click',()=>act(action));$('game-actions').appendChild(b)}
    if(!actions.length){const p=document.createElement('span');p.className='game-waiting';p.textContent=s.paused?'En pausa':s.actor?'Habla '+players[s.actor]+'…':'La mesa está hablando…';$('game-actions').appendChild(p)}
    $('game-bet-row').hidden=!actions.some(a=>['bet','raise'].includes(a));$('game-amount').min=actions.includes('raise')?'1':'2';
    if(s.signalsLocked)signalsOpen=false;
    $('game-signal-toggle').textContent=s.signalsLocked?'Sin señas · 1ª mano':'Hacer una seña';$('game-signal-toggle').disabled=!engine.signals().length;$('game-signal-toggle').setAttribute('aria-expanded',String(signalsOpen));$('game-signals').hidden=!signalsOpen;$('game-signals').replaceChildren();for(const key of engine.signals()){const b=document.createElement('button');b.textContent=SIGNAL_NAMES[key];b.addEventListener('click',()=>{engine.signal(key);signalsOpen=false;render(engine.snapshot())});$('game-signals').appendChild(b)}
    const incoming=s.signalEvent?.to==='txuwa'?players[s.signalEvent.id]+' te ha hecho una seña. Mira su cara.':'';$('game-signal-receipt').textContent=s.signalsLocked?'':[incoming,s.signalReceipt].filter(Boolean).join(' · ')||'';
    $('game-turn-feed').textContent=s.history.slice(-4).join(' → ');
    const resolved=['summary','finished'].includes(s.stage);$('game-results').hidden=!resolved;$('game-count-open').hidden=!resolved;resultRows($('game-results'),s);
    if(!s.revealed){countWasShown=false;closeCount(false)}
    else if(resolved&&visible&&!countWasShown&&!$('cards-dialog').open&&!$('player-setup').open)showCount(s);
    if(visible){const cue=turnCue(s);markTurn(cue?.id||null,cue)}
    renderJaviel(s);
    const event=s.lastAction;if(event&&event.sequence!==lastSequence){lastSequence=event.sequence;if(event.kind==='deal'){world.redeal(time());refreshCards()}else if(event.kind==='discard')world.discardCards(event.id,event.indices,time());else if(event.id&&visible){if(!['signal','ack'].includes(event.kind))speak(players[event.id],event.label,event.id,engine.delay);if(event.kind==='ack')world.gesture(event.id,'ack',time());if(event.kind==='signal')world.gesture(event.id,event.key,time())}}
    const gesture=s.signalEvent;if(gesture&&gesture.sequence!==lastSignal){lastSignal=gesture.sequence;world.gesture(gesture.id,gesture.key,time());if(visible&&gesture.to==='txuwa')toast(players[gesture.id]+' te hace una seña. Mira su cara.')}
    if(s.handNumber!==lastHand){lastHand=s.handNumber;$('game-amount').value='2';signalsOpen=false}
  }
  $('game-count-open').onclick=()=>showCount();
  $('count-close').onclick=()=>closeCount();$('count-table').onclick=()=>closeCount();
  $('count-dialog').addEventListener('cancel',e=>{e.preventDefault();closeCount()});
  $('count-next').onclick=()=>{const action=engine.state.stage==='finished'?'start':'next';if(!engine.actions().includes(action))return;closeCount(false);act(action)};
  engine.subscribe(render);
  attachTableTools({engine,world,storage,toast});
  applyProfile(profile||{});
  // Keep first-use setup open when the name has not been chosen yet.
  if(!loadProfile(storage))profile=null;
  $('profile-form').addEventListener('submit',e=>{e.preventDefault();const raw=$('profile-name').value;if(!raw.trim()){$('profile-error').textContent='Escribe el nombre con el que quieres jugar.';$('profile-error').hidden=false;return}if(started&&!confirmReset())return;profile=saveProfile({name:raw,partner:$('profile-partner').value,characterNames:Object.fromEntries(PARTNERS.map(id=>[id,$('profile-name-'+id).value])),firstHandCorrido:$('profile-corrido').checked},storage);applyProfile(profile);$('player-setup').close();started=true;cameraView='seat';show();engine.newGame(profile)});
  for(const id of PARTNERS)$('profile-name-'+id).addEventListener('input',syncSetupNames);$('profile-partner').addEventListener('change',syncSetupNames);
  $('profile-cancel').onclick=cancelSettings;$('player-setup').addEventListener('cancel',e=>{e.preventDefault();cancelSettings()});
  $('profile-open').onclick=openSettings;$('game-players').onclick=openSettings;
  $('game-start').onclick=start;$('game-exit').onclick=explore;$('game-camera').onclick=()=>{cameraView=cameraView==='seat'?'table':'seat';$('game-camera').textContent=cameraView==='seat'?'Ver mesa':'Mi silla';view(cameraView)};
  $('game-new').onclick=openSettings;
  $('game-signal-toggle').onclick=()=>{signalsOpen=!signalsOpen;render(engine.snapshot())};
  for(const id of ['game-players','game-camera','game-new','game-exit','game-journal','game-speed'])$(id).addEventListener('click',()=>{$('game-options').open=false});
  return {engine,start,explore,openSettings,toggleCard:i=>engine.toggleCard(i),get active(){return started},get visible(){return visible},pause(value){if(visible)engine.pause(value)},showSignals(){if(!visible)start();if(!started)return;if(engine.state.signalsLocked){toast('Toda la primera mano se juega sin señas. Se activan en la segunda.');return}signalsOpen=true;render(engine.snapshot())}};
}
