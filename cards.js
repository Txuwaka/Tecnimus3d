import * as THREE from './vendor/three.module.js';
export const SUITS=['oros','copas','espadas','bastos'];
export const RANKS=[1,2,3,4,5,6,7,10,11,12];
export const SUIT_NAMES={oros:'Oros',copas:'Copas',espadas:'Espadas',bastos:'Bastos'};
const FIGURES={10:'Sota',11:'Caballo',12:'Rey'};
export const cardKey=card=>`${card.suit}-${card.rank}`;
export const cardURL=card=>`./assets/cards/${cardKey(card)}.webp`;
export const cardName=card=>`${FIGURES[card.rank]||card.rank} de ${SUIT_NAMES[card.suit]}`;
export const INITIAL_HANDS={
  txuwa:[{suit:'oros',rank:12},{suit:'espadas',rank:11},{suit:'copas',rank:10},{suit:'bastos',rank:1}],
  lola:[{suit:'oros',rank:3},{suit:'copas',rank:2},{suit:'espadas',rank:7},{suit:'bastos',rank:6}],
  bruno:[{suit:'oros',rank:10},{suit:'copas',rank:12},{suit:'espadas',rank:4},{suit:'bastos',rank:5}],
  nico:[{suit:'oros',rank:1},{suit:'copas',rank:11},{suit:'espadas',rank:12},{suit:'bastos',rank:10}]
};
export function makeDeck(){return SUITS.flatMap(suit=>RANKS.map(rank=>({suit,rank})))}
export function dealHands(random=Math.random){const deck=makeDeck();for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}return Object.fromEntries(['txuwa','lola','bruno','nico'].map((id,i)=>[id,deck.slice(i*4,i*4+4)]))}
export async function loadCardTextures(){const loader=new THREE.TextureLoader();const entries=await Promise.all(makeDeck().map(async card=>{const t=await loader.loadAsync(cardURL(card));t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return [cardKey(card),t]}));return new Map(entries)}
