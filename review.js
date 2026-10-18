import {MusRules as R} from './mus-rules.js?v=0.10.0';

const rankName=n=>({1:'as',10:'sota',11:'caballo',12:'rey'}[n]||String(n));

// Explanations are shown only after the hands have been revealed.
export function explainLance(state,row){
  if(!state.revealed)return '';
  if(row.refused)return 'El envite fue rechazado. El rechazo ya se cobró; aquí se anota lo que quedaba pendiente del lance.';
  const id=row.winner,hand=state.hands[id];if(!hand)return '';
  const name=state.names?.[id]||id;
  let detail='';
  if(row.phase==='GRANDE'||row.phase==='CHICA'){
    const ranks=hand.map(R.rank).sort((a,b)=>row.phase==='GRANDE'?b-a:a-b);
    detail=name+': '+ranks.map(rankName).join(', ')+'. Se comparan de mayor a menor.';
    if(row.phase==='CHICA')detail=name+': '+ranks.map(rankName).join(', ')+'. Se comparan de menor a mayor.';
  }else if(row.phase==='PARES'){
    const pairs=R.pairs(hand);detail=name+': '+pairs.name+' ('+pairs.values.map(rankName).join(' y ')+').';
  }else detail=name+': '+R.sum(hand)+(row.phase==='JUEGO'?' de juego.':' al punto.');
  const tie=R.ids.some(other=>other!==id&&R.sides[other]!==R.sides[id]&&R.qualifies(state.hands[other],row.phase)&&R.compare(R.strength(state.hands[other],row.phase),R.strength(hand,row.phase))===0);
  if(tie)detail+=' Empate con un rival: decide el orden de mano.';
  return (row.ordago?'Órdago querido: decide la partida. ':'')+detail;
}
