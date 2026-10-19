import {createBirdsongBuffer} from './birdsong.js?v=0.17.0';
import {THREE,createWorld,PEOPLE,VIEWS,canWalk,playerViewFov} from './scene.js?v=0.17.0';
import {loadCardTextures,cardName,cardURL,RANKS,SUIT_NAMES} from './cards.js?v=0.17.0';
import {attachMusGame} from './game-ui.js?v=0.17.0';

const $=id=>document.getElementById(id), stage=$('stage'), host=$('scene');
let renderer,world,camera,bootStep="graphics";
try{
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'default'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.setClearColor(0x000000,0);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
  host.appendChild(renderer.domElement);camera=new THREE.PerspectiveCamera(40,1,.08,100);
  bootStep="cards";
  const cardTextures=await loadCardTextures();
  bootStep="scene";
  world=createWorld({cardTextures});world.attachCamera(camera);
}catch(e){$('loading').hidden=true;$('error').hidden=false;if(bootStep==='cards')$('error-text').textContent='No se han podido cargar nuestras cartas. Comprueba la conexión y vuelve a intentarlo.';console.error('No se ha podido iniciar Tecnimus 3D',e);throw e;}

let mode='inspect',activeView='general',paused=false,time=0,prev=performance.now(),selected=null;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let target=new THREE.Vector3(...VIEWS.general.target),desiredTarget=target.clone();
camera.position.fromArray(VIEWS.general.position);camera.lookAt(target);
let desiredPosition=camera.position.clone(),transition=false,orbit=new THREE.Spherical().setFromVector3(camera.position.clone().sub(target));
let walkYaw=0,walkPitch=0,walkVelocity=0;const keys=new Set(),pointers=new Map();let dragMoved=0,dragStart=null,lastPinch=0;
let currentTurn=null;
let toastTimeout,speechTimeout,dealTimeout;const raycaster=new THREE.Raycaster();

let cardsMode='hand',cardsSuit='oros',cardsReturnFocus=null,cardsWasPaused=false,cardsGeneration=-1;
function renderCards(){const hand=cardsMode==='hand',cards=hand?world.getHand():RANKS.map(rank=>({rank,suit:cardsSuit}));$('cards-grid').replaceChildren();$('cards-grid').classList.toggle('full-deck',!hand);for(const card of cards){const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');img.src=cardURL(card);img.alt=cardName(card);img.width=384;img.height=576;img.loading='eager';caption.textContent=cardName(card);figure.append(img,caption);$('cards-grid').appendChild(figure)}$('suit-filters').hidden=hand;$('cards-hand').classList.toggle('active',hand);$('cards-deck').classList.toggle('active',!hand);$('cards-hand').setAttribute('aria-pressed',String(hand));$('cards-deck').setAttribute('aria-pressed',String(!hand));$('cards-caption').textContent=hand?'Tu mano · 4 cartas':`${SUIT_NAMES[cardsSuit]} · 10 cartas · Baraja española de 40`;document.querySelectorAll('[data-suit]').forEach(b=>{b.classList.toggle('active',b.dataset.suit===cardsSuit);b.setAttribute('aria-pressed',String(b.dataset.suit===cardsSuit))})}
function openCards(){cardsReturnFocus=document.activeElement;cardsWasPaused=gameUI.engine.state.paused;cardsGeneration=gameUI.engine.generation;if(gameUI.active)gameUI.pause(true);cardsMode='hand';renderCards();closeMenu();keys.clear();$('cards-dialog').showModal()}
function closeCards(){$('cards-dialog').close();if(gameUI.active&&cardsGeneration===gameUI.engine.generation)gameUI.pause(cardsWasPaused);cardsReturnFocus?.focus?.({preventScroll:true})}
$('cards-dialog').addEventListener('cancel',e=>{e.preventDefault();closeCards()});
$('cards-open').onclick=openCards;$('cards-quick').onclick=openCards;$('cards-close').onclick=closeCards;
$('cards-hand').onclick=()=>{cardsMode='hand';renderCards()};$('cards-deck').onclick=()=>{cardsMode='deck';renderCards()};
document.querySelectorAll('[data-suit]').forEach(b=>b.addEventListener('click',()=>{cardsSuit=b.dataset.suit;renderCards()}));
$('cards-dialog').addEventListener('click',e=>{if(e.target===$('cards-dialog')){const r=$('cards-dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeCards()}});

function toast(msg){$('toast').textContent=msg;$('toast').hidden=false;clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').hidden=true,3100)}
function speak(name,line,id=null,duration=2000){$('speech').dataset.voice=id?world.getPerson(id).type:'beard';$('speech').replaceChildren();const small=document.createElement('small');small.textContent=name.toUpperCase();$('speech').append(small,document.createTextNode('«'+line+'»'));$('speech').hidden=false;clearTimeout(speechTimeout);speechTimeout=setTimeout(()=>$('speech').hidden=true,duration)}
function setMenu(open,focus=false){
  if(open)keys.clear();
  $('sidebar').hidden=!open;$('sidebar').classList.toggle('open',open);$('sidebar-backdrop').hidden=!open;$('stage').inert=open;
  $('menu').setAttribute('aria-expanded',String(open));$('menu').setAttribute('aria-label',open?'Cerrar menú lateral':'Abrir menú lateral');$('menu').title=open?'Cerrar menú lateral':'Abrir menú lateral';
  if(focus)$(open?'sidebar-close':'menu').focus({preventScroll:true});
}
function closeMenu(){setMenu(false)}
function updateModeUI(){for(const m of ['inspect','walk']){const b=$(m+'-mode');b.classList.toggle('active',mode===m);b.setAttribute('aria-pressed',String(mode===m))}$('walk-pad').hidden=mode!=='walk';host.classList.toggle('walking',mode==='walk');$('control-hint').textContent=mode==='walk'?'WASD / flechas para caminar · Arrastra para mirar':'Arrastra para girar · Rueda para acercar'}
function setView(id){mode='inspect';activeView=id;camera.fov=id==='seat'?playerViewFov(camera.aspect):40;world.setPlayerView(id==='seat');camera.updateProjectionMatrix();desiredPosition.fromArray(VIEWS[id].position);desiredTarget.fromArray(VIEWS[id].target);if(id==='general')fitGeneralView();transition=true;updateModeUI();document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===id);b.setAttribute('aria-pressed',String(b.dataset.view===id))});closeMenu();if(id==='bar')inspect('javiel',false);else if(id==='table')inspect('table',false);else if(id==='seat')inspect('txuwa',false);else inspect(null,false);host.focus({preventScroll:true})}
function syncOrbit(){orbit.setFromVector3(camera.position.clone().sub(target));transition=false}
function setWalk(){if(mode==='walk')return;world.setPlayerView(false);mode='walk';transition=false;activeView=null;camera.position.set(4.2,2.32,3.55);walkYaw=.80;walkPitch=-.08;updateModeUI();document.querySelectorAll('[data-view]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false')});toast('Pasea con WASD o las flechas. Arrastra para mirar.');host.focus({preventScroll:true});closeMenu();inspect(null,false)}
function setInspect(){if(mode==='inspect')return;setView('general')}
function inspect(id,focus=true){selected=id;world.select(id);const d=world.getPerson(id||'room');$('inspector').hidden=false;$('inspector').classList.toggle('has-selection',!!id);$('detail-tag').textContent=d.role;$('detail-title').textContent=d.title;$('detail-copy').textContent=d.copy;$('detail-meta').textContent=d.meta;$('detail-close').hidden=!id;document.querySelectorAll('[data-select]').forEach(b=>b.classList.toggle('selected',b.dataset.select===id));if(focus&&id){if(id==='javiel')setView('bar');else if(id==='table')setView('table');else{world.setPlayerView(false);camera.fov=40;camera.updateProjectionMatrix();mode='inspect';activeView=null;updateModeUI();const p=PEOPLE[id];desiredTarget.set(p.x,1.9,p.z);const away=new THREE.Vector3(p.x-.4,0,p.z-.7).normalize();desiredPosition.set(p.x-away.x*3.4+away.z*.8,3.2,p.z-away.z*3.4-away.x*.8);transition=true;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false')})}closeMenu()} }

function markTurn(id,cue=null){
  currentTurn=id?{...cue,id}:null;
  const bubble=$('turn-bubble');bubble.hidden=!currentTurn;bubble.dataset.entity=id||'';
  if(!currentTurn)return;
  const person=world.getPerson(id);bubble.dataset.voice=person.type;bubble.dataset.waiting=String(!!cue?.waiting);
  $('turn-speaker').textContent=cue?.waiting?'TU TURNO · '+person.name:person.name;
  $('turn-line').textContent=cue?.line||'Le toca';
}
function placeTurnBubble(){
  const bubble=$('turn-bubble');
  if(!currentTurn||!document.body.classList.contains('playing')){bubble.hidden=true;return}
  const anchor=world.turnAnchor(currentTurn.id).project(camera);
  if(anchor.z<=-1||anchor.z>=1){bubble.hidden=true;return}
  bubble.hidden=false;
  const width=bubble.offsetWidth||150,height=bubble.offsetHeight||52;
  const x=THREE.MathUtils.clamp((anchor.x*.5+.5)*host.clientWidth,width/2+8,Math.max(width/2+8,host.clientWidth-width/2-8));
  const y=THREE.MathUtils.clamp((-.5*anchor.y+.5)*host.clientHeight-10,height+9,Math.max(height+9,host.clientHeight-10));
  bubble.style.left=x+'px';bubble.style.top=y+'px';
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.querySelectorAll('[data-select]').forEach(b=>b.addEventListener('click',()=>inspect(b.dataset.select)));
$('detail-close').onclick=()=>inspect(null,false);$('inspect-mode').onclick=setInspect;$('walk-mode').onclick=setWalk;
$('reset').onclick=()=>setView('general');$('menu').onclick=()=>setMenu($('sidebar').hidden,true);$('sidebar-close').onclick=()=>setMenu(false,true);$('sidebar-backdrop').onclick=()=>setMenu(false,true);
$('map-toggle').onclick=()=>{const open=$('map').hidden;$('map').hidden=!open;$('map-toggle').setAttribute('aria-expanded',String(open))};$('map-close').onclick=()=>{$('map').hidden=true;$('map-toggle').setAttribute('aria-expanded','false')};
$('pause').onclick=()=>{paused=!paused;gameUI.pause(paused);$('pause').setAttribute('aria-pressed',String(paused));$('pause').setAttribute('aria-label',paused?'Reanudar animaciones':'Pausar animaciones');$('pause').title=paused?'Reanudar animaciones':'Pausar animaciones';$('pause').querySelector('use').setAttribute('href',paused?'#i-play':'#i-pause');toast(paused?'Un respiro. Hasta Javiel descansa.':'La cuadrilla vuelve a la carga.')};
function resumeForAction(){if(paused)$('pause').click()}
$('signal').onclick=()=>{if(gameUI.active){gameUI.showSignals();return}resumeForAction();if(mode==='walk'||activeView==='bar')setView('table');world.signal(time);inspect('lola',false);speak(world.getPerson('lola').name,'¡Seña recibida, compañero! A mí no se me escapa una.','lola');if(audioState)chime(600,.10)};
$('deal').onclick=()=>gameUI.start();
function syncFullscreenButton(){const active=!!document.fullscreenElement,label=active?'Salir de pantalla completa':'Pantalla completa';$('fullscreen').setAttribute('aria-pressed',String(active));$('fullscreen').setAttribute('aria-label',label);$('fullscreen').title=label}
$('fullscreen').onclick=async()=>{try{if(!document.fullscreenElement){const page=document.documentElement;if(!page?.requestFullscreen){toast('La pantalla completa no está disponible en este navegador.');return}await page.requestFullscreen()}else await document.exitFullscreen();syncFullscreenButton()}catch{toast('El navegador no permite la pantalla completa aquí.')}};
document.addEventListener('fullscreenchange',syncFullscreenButton);
function zoom(factor){if(mode==='walk'){camera.fov=THREE.MathUtils.clamp(camera.fov*factor,32,70);camera.updateProjectionMatrix();return}syncOrbit();orbit.radius=THREE.MathUtils.clamp(orbit.radius*factor,1.15,25);camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(orbit));camera.lookAt(target)}
$('zoom-in').onclick=()=>zoom(.86);$('zoom-out').onclick=()=>zoom(1.16);

host.addEventListener('pointerdown',e=>{host.focus({preventScroll:true});pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});host.setPointerCapture(e.pointerId);dragStart={x:e.clientX,y:e.clientY};dragMoved=0;lastPinch=0;host.classList.add('dragging');if(mode==='inspect')syncOrbit()});
host.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId),dx=e.clientX-old.x,dy=e.clientY-old.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});dragMoved+=Math.abs(dx)+Math.abs(dy);if(pointers.size===2){const ps=[...pointers.values()],dist=Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y);if(lastPinch)zoom(lastPinch/dist);lastPinch=dist;return}if(mode==='walk'){walkYaw-=dx*.006;walkPitch=THREE.MathUtils.clamp(walkPitch-dy*.004,-1.0,.8)}else if(e.shiftKey||e.buttons===2){const right=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0).multiplyScalar(-dx*.007);right.y=0;const forward=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),right).normalize().multiplyScalar(dy*.007);target.add(right).add(forward);target.x=THREE.MathUtils.clamp(target.x,-5,5);target.z=THREE.MathUtils.clamp(target.z,-4,4)}else{orbit.theta-=dx*.005;orbit.phi=THREE.MathUtils.clamp(orbit.phi+dy*.005,.20,Math.PI/2-.04)}if(mode==='inspect'){camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(orbit));camera.lookAt(target)}});
function pointerUp(e){pointers.delete(e.pointerId);lastPinch=0;host.classList.remove('dragging');if(e.type==='pointerup'&&dragMoved<6&&dragStart){const rect=host.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hits=raycaster.intersectObjects(world.pickables,false).filter(h=>{let a=h.object;while(a){if(!a.visible)return false;a=a.parent}return true});if(hits.length){let o=hits[0].object;while(o&&!o.userData.entity)o=o.parent;if(o){let cardHit=hits[0].object;while(cardHit&&cardHit.userData.player===undefined)cardHit=cardHit.parent;if(gameUI.visible&&cardHit?.userData.player==='txuwa'){gameUI.toggleCard(cardHit.userData.index);return}inspect(o.userData.entity,false);if(world.getPerson(o.userData.entity).quote)speak(world.getPerson(o.userData.entity).name,world.getPerson(o.userData.entity).quote,o.userData.entity)}}}dragStart=null}
host.addEventListener('pointerup',pointerUp);host.addEventListener('pointercancel',pointerUp);host.addEventListener('contextmenu',e=>e.preventDefault());host.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY>0?1.065:.94)},{passive:false});
document.addEventListener('keydown',e=>{if($('cards-dialog').open||$('player-setup').open||$('count-dialog').open||$('journal-dialog').open)return;if(e.key==='Escape'){setMenu(false,!$('sidebar').hidden);$('map').hidden=true;$('map-toggle').setAttribute('aria-expanded','false');$('speech').hidden=true;return}if(!$('sidebar').hidden||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase());if(mode==='inspect'&&host===document.activeElement){if(e.key==='ArrowLeft'||e.key==='ArrowRight'){syncOrbit();orbit.theta+=(e.key==='ArrowLeft'?.09:-.09);camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(orbit));camera.lookAt(target)}if(e.key==='+'||e.key==='=')zoom(.9);if(e.key==='-')zoom(1.1)}});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();pointers.clear()});document.addEventListener('visibilitychange',()=>{prev=performance.now();if(document.hidden)keys.clear()});
document.querySelectorAll('[data-walk]').forEach(b=>{const k={forward:'w',back:'s',left:'a',right:'d'}[b.dataset.walk];b.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(k);b.setPointerCapture(e.pointerId)});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>keys.delete(k))});

let audioState=null;
function chime(freq,duration){if(!audioState)return;const a=audioState.ctx,o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.setValueAtTime(freq,a.currentTime);o.frequency.exponentialRampToValueAtTime(freq*1.4,a.currentTime+duration);g.gain.setValueAtTime(.08,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+duration);o.connect(g).connect(audioState.master);o.start();o.stop(a.currentTime+duration)}
let soundBusy=false;
async function toggleSound(){
  if(soundBusy)return;soundBusy=true;
  let openingContext=null;
  try{
    if(audioState){await audioState.ctx.close();audioState=null;$('sound').setAttribute('aria-pressed','false');$('sound').setAttribute('aria-label','Activar pajaritos');$('sound').title='Activar pajaritos';return}
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error();
    const ctx=new Audio();openingContext=ctx;await ctx.resume();
    const master=ctx.createGain();master.gain.value=.18;master.connect(ctx.destination);
    const birds=ctx.createBufferSource();birds.buffer=createBirdsongBuffer(ctx);birds.loop=true;birds.connect(master);birds.start();
    audioState={ctx,master};openingContext=null;
    $('sound').setAttribute('aria-pressed','true');$('sound').setAttribute('aria-label','Silenciar pajaritos');$('sound').title='Silenciar pajaritos';
    toast('Pajaritos por la ventana. Javiel no les cobra la ronda.');
  }catch{if(openingContext)await openingContext.close().catch(()=>{});toast('No se ha podido activar el sonido en este navegador.')}finally{soundBusy=false}
}
$('sound').onclick=toggleSound;

function fitGeneralView(){// Keep the whole diorama inside a portrait viewport, too.
  const base=new THREE.Vector3(...VIEWS.general.position),center=new THREE.Vector3(...VIEWS.general.target),distanceScale=Math.max(1,1.15/camera.aspect);
  desiredPosition.copy(center).add(base.sub(center).multiplyScalar(Math.min(distanceScale,2.0)));desiredTarget.copy(center);
}
function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h);camera.aspect=w/h;if(activeView==='seat')camera.fov=playerViewFov(camera.aspect);camera.updateProjectionMatrix();world.fitPlayerHand();if(activeView==='general'&&mode==='inspect'){fitGeneralView();transition=true}}
new ResizeObserver(resize).observe(host);resize();
let rendered=false;
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-prev)/1000,.05);prev=now;if(document.hidden)return;if(!paused)time+=dt;
  if(transition){const f=reduced?1:1-Math.exp(-dt*5);camera.position.lerp(desiredPosition,f);target.lerp(desiredTarget,f);camera.lookAt(target);if(camera.position.distanceTo(desiredPosition)<.007&&target.distanceTo(desiredTarget)<.007){camera.position.copy(desiredPosition);target.copy(desiredTarget);transition=false;syncOrbit()}}
  if(mode==='walk'){const fw=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0),side=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);const len=Math.max(1,Math.hypot(fw,side)),speed=dt*2.3;const dx=(-Math.sin(walkYaw)*fw+Math.cos(walkYaw)*side)/len*speed,dz=(-Math.cos(walkYaw)*fw-Math.sin(walkYaw)*side)/len*speed;if(canWalk(camera.position.x+dx,camera.position.z))camera.position.x+=dx;if(canWalk(camera.position.x,camera.position.z+dz))camera.position.z+=dz;camera.position.y=2.32+(reduced?0:Math.sin(now*.009)*.008*Math.min(1,Math.hypot(fw,side)));const dir=new THREE.Vector3(-Math.sin(walkYaw)*Math.cos(walkPitch),Math.sin(walkPitch),-Math.cos(walkYaw)*Math.cos(walkPitch));camera.lookAt(camera.position.clone().add(dir));}
  world.update(time);world.cutaway(camera);renderer.render(world.scene,camera);
  placeTurnBubble();
  if(!rendered){$('loading').hidden=true;rendered=true;host.setAttribute('data-ready','true')}
}
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('error').hidden=false;$('error-text').textContent='Se ha interrumpido la conexión con la tarjeta gráfica. Recarga para volver a entrar.'});
function refreshRoster(){if(currentTurn)markTurn(currentTurn.id,currentTurn);for(const b of document.querySelectorAll('[data-select]')){const p=world.getPerson(b.dataset.select);b.textContent=p.name.slice(0,1).toUpperCase();b.title=p.name+' · '+p.role;b.setAttribute('aria-label','Inspeccionar a '+p.name);b.style.backgroundColor='#'+p.color.toString(16).padStart(6,'0');b.style.color='#fff6e4'}$('map-partner').textContent=world.getPerson('lola').name.slice(0,1);$('map-left').textContent=world.getPerson('bruno').name.slice(0,1);$('map-right').textContent=world.getPerson('nico').name.slice(0,1);$('map-description').textContent=world.getPerson('table').copy;$('map-layout').setAttribute('aria-label','Javiel en la barra al norte. '+world.getPerson('lola').name+' al norte de la mesa, '+world.getPerson('txuwa').name+' al sur, '+world.getPerson('bruno').name+' al oeste y '+world.getPerson('nico').name+' al este.');if(selected)inspect(selected,false);}
let profileStorage;try{profileStorage=window.localStorage}catch{}
const gameUI=attachMusGame({world,view:setView,time:()=>time,speak,toast,storage:profileStorage,profileChanged:refreshRoster,resume:()=>{if(paused)$('pause').click()},refreshCards:()=>{if($('cards-dialog').open)renderCards()},confirmReset:()=>window.confirm('¿Empezar una partida nueva y reiniciar el marcador?'),markTurn});
function fitSceneAboveControls(){
  const playing=document.body.classList.contains('playing');
  const panelHeight=playing?$('game-panel').getBoundingClientRect().height:0;
  stage.style.setProperty('--game-panel-height',panelHeight+'px');
  const announcementHeight=playing?$('game-announcement').getBoundingClientRect().height:0;
  host.style.bottom=playing?'calc(var(--game-panel-height) + var(--hud-edge) + '+(announcementHeight+16)+'px)':'0px';
}
const hudObserver=new ResizeObserver(fitSceneAboveControls);
for(const el of [$('game-panel'),$('game-announcement'),stage])hudObserver.observe(el);
requestAnimationFrame(animate);
// Public read-only diagnostics are useful when checking the future Godot layout.
Object.defineProperty(window,'tecnimusScene',{value:{get ready(){return rendered},get mode(){return mode},get selected(){return selected},get paused(){return paused},get counts(){return {players:4,bartenders:1,cards:world.cards.length}},get cameraPosition(){return camera.position.toArray()}},writable:false});
window.addEventListener('pagehide',()=>{if(audioState)audioState.ctx.close()});
