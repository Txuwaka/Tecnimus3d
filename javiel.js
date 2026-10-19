// Javiel comments on public outcomes only. No AI random draws or private cards.
export function javielLine(event,names={}){
  if(!event)return '';
  const name=names[event.target],who=name?', '+name:'',team=event.side==='nosotros'?'Tu pareja':'La pareja rival';
  const index=Math.max(0,(event.sequence||1)-1);
  if(event.kind==='drinks'){
    const lines=['¿No me vais a pedir ni una cerveza? Que el vaso ya está limpio.','Sí, sí, seguid jugando… ¡que aquí no bebéis na!','Mucho órdago y poca cerveza. Así no pago yo la luz.','¿Otra partidita? La barra no se mantiene de faroles.','Tengo el vaso tan limpio que ya veo vuestras trampas.','Como sigáis así, os cobro el alquiler del tapete.','Aquí se envida mucho, pero se pide poco.','¿Os pongo algo o vais a brindar con las cartas?'];
    return lines[(event.lineIndex||0)%lines.length];
  }
  if(event.kind==='backdown'){
    const lines=[`¡Te has acojonado${who}! Tanto envidar para acabar mirando el vaso.`,`¡Te has acojonado${who}! Ese farol llegaba hasta la cocina.`];
    return lines[index%lines.length]+(event.points>10?` ¡El bicicleta! ${event.points} piedras a pedales.`:'');
  }
  if(event.kind==='ordago-accepted'){
    const lines=[`¡Con dos cojones${who}! Ahora que hablen las cartas.`,`¡Con dos cojones${who}! Ese «quiero» se ha oído en la cocina.`];
    return lines[index%lines.length];
  }
  if(event.kind==='big-win'&&event.points>10){
    const lines=[`¡El bicicleta! ${team} se lleva ${event.points} piedras a pedales.`,`¡El bicicleta! ${event.points} piedras y sin bajarse del sillín.`];
    return lines[index%lines.length];
  }
  return '';
}
