// Quiet, intermittent birds outside the window. Generated locally: no downloads.
export function createBirdsongBuffer(ctx,{duration=36,sampleRate=22050,random=Math.random}={}){
  const buffer=ctx.createBuffer(2,Math.ceil(duration*sampleRate),sampleRate);
  const left=buffer.getChannelData(0),right=buffer.getChannelData(1);
  for(let phrase=.5;phrase<duration-1.5;phrase+=2.6+random()*2.8){
    const base=1900+random()*1200,pan=random()*.8-.4,volume=.10+random()*.05;
    const notes=2+Math.floor(random()*3),falling=random()<.45;
    for(let note=0;note<notes;note++){
      const length=.095+random()*.10,start=phrase+note*.23;
      const offset=Math.floor(start*sampleRate),count=Math.floor(length*sampleRate);
      let phase=0;
      for(let i=0;i<count&&offset+i<left.length;i++){
        const u=i/count,t=i/sampleRate;
        const curve=falling?1-u:u;
        const frequency=base+curve*700+Math.sin(t*2*Math.PI*32)*95;
        phase+=2*Math.PI*frequency/sampleRate;
        const envelope=Math.pow(Math.sin(Math.PI*u),1.7);
        const sample=(Math.sin(phase)+.12*Math.sin(phase*2))*envelope*volume;
        left[offset+i]+=sample*Math.sqrt((1-pan)/2);
        right[offset+i]+=sample*Math.sqrt((1+pan)/2);
      }
    }
  }
  return buffer;
}
