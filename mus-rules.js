// Reglas extraídas del Tecnimus guardado el 7 de octubre de 2026.
// Adaptador de nombres para los personajes de la escena 3D.
export const MusRules = (() => {
  const ids = ['txuwa', 'nico', 'lola', 'bruno'];
  const sides = {txuwa:'nosotros', lola:'nosotros', bruno:'ellos', nico:'ellos'};
  const ranks = [1,2,3,4,5,6,7,10,11,12];
  const suits = ['oros','copas','espadas','bastos'];
  const rank = card => card.rank === 3 ? 12 : card.rank === 2 ? 1 : card.rank;
  const sum = hand => hand.reduce((n,c) => n + (rank(c) >= 10 ? 10 : rank(c)), 0);
  const deck = () => suits.flatMap(suit => ranks.map(rank => ({suit,rank})));
  const shuffle = cards => {
    for(let i=cards.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [cards[i],cards[j]]=[cards[j],cards[i]];
    }
    return cards;
  };

  function pairs(hand){
    const counts = new Map();
    hand.forEach(c => counts.set(rank(c),(counts.get(rank(c))||0)+1));
    const doubles = [...counts].filter(([,n])=>n===2).map(([v])=>v).sort((a,b)=>b-a);
    const four = [...counts].find(([,n])=>n===4);
    const three = [...counts].find(([,n])=>n===3);
    if(four) return {tier:3,values:[four[0],four[0]],name:'Duples',points:3};
    if(doubles.length===2) return {tier:3,values:doubles,name:'Duples',points:3};
    if(three) return {tier:2,values:[three[0]],name:'Medias',points:2};
    if(doubles.length) return {tier:1,values:doubles,name:'Par',points:1};
    return {tier:0,values:[],name:'Sin pares',points:0};
  }

  const gameOrder = [31,32,40,37,36,35,34,33];
  function strength(hand, phase){
    if(phase==='GRANDE') return hand.map(rank).sort((a,b)=>b-a);
    if(phase==='CHICA') return hand.map(c=>-rank(c)).sort((a,b)=>b-a);
    if(phase==='PARES'){
      const p=pairs(hand);
      return [p.tier,...p.values];
    }
    const n=sum(hand);
    if(phase==='JUEGO') return [n>=31 ? gameOrder.length-gameOrder.indexOf(n) : 0];
    return [n]; // PUNTO
  }

  function compare(a,b){
    for(let i=0;i<Math.max(a.length,b.length);i++){
      const diff=(a[i]||0)-(b[i]||0);
      if(diff) return Math.sign(diff);
    }
    return 0;
  }

  function qualifies(hand,phase){
    return phase==='PARES' ? pairs(hand).tier>0 : phase==='JUEGO' ? sum(hand)>=31 : true;
  }

  // ids ya está ordenado a derechas; mano es el índice del jugador que es mano.
  function order(mano){return ids.map((_,i)=>ids[(mano+i)%4]);}

  function winner(hands,phase,mano){
    const eligible=order(mano).filter(id=>qualifies(hands[id],phase));
    if(!eligible.length)return null;
    // En empate se conserva el primero según el orden desde la mano.
    return eligible.reduce((best,id)=>compare(strength(hands[id],phase),strength(hands[best],phase))>0?id:best);
  }

  function phases(hands){
    const all=ids.map(id=>hands[id]);
    const pairPresent=all.some(h=>qualifies(h,'PARES'));
    const gamePresent=all.some(h=>qualifies(h,'JUEGO'));
    return ['GRANDE','CHICA','PARES',gamePresent?'JUEGO':'PUNTO'];
  }

  function canBet(hands,phase){
    return ['nosotros','ellos'].every(side=>ids.some(id=>sides[id]===side&&qualifies(hands[id],phase)));
  }

  function intrinsic(hands,phase,side){
    const own=ids.filter(id=>sides[id]===side);
    if(phase==='PARES')return own.reduce((n,id)=>n+pairs(hands[id]).points,0);
    if(phase==='JUEGO')return own.reduce((n,id)=>n+(sum(hands[id])===31?3:sum(hands[id])>=32?2:0),0);
    return 1;
  }

  // Señas verdaderas, sin señas parciales de duples. Las medias no reales
  // se ofrecen sólo después de Grande. No cambia la puntuación de la mesa.
  function signals(hand,{grandeDone=false}={}){
    const p=pairs(hand),n=sum(hand),result=[];
    if(p.tier===3)result.push('duples');
    else if(p.tier===2){
      if(p.values[0]===12)result.push('medias-reyes');
      else if(p.values[0]===1)result.push('medias-ases');
      else if(grandeDone)result.push('medias');
    }else if(p.tier===1){if(p.values[0]===12)result.push('reyes');else if(p.values[0]===1)result.push('ases');}
    // Medias y pares de ases no admiten señas parciales de otras jugadas.
    if((p.tier===2||p.tier===1)&&p.values[0]===1)return result;
    if(n===31)result.push('31');else if(n>31)result.push('juego');
    else if(n===30)result.push('30');else if(n===29&&p.tier<2)result.push('29');
    if(!result.length&&p.tier<2&&n<29)result.push('ciego');
    return result;
  }
  return {ids,sides,rank,sum,deck,shuffle,pairs,strength,compare,qualifies,order,winner,phases,canBet,intrinsic,signals};
})();

