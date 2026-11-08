// Original synthesized loops for this project; no external samples.
import {mkdir,writeFile} from 'node:fs/promises';
const rate=22050,seconds=16,n=rate*seconds;
const midi=m=>440*2**((m-69)/12);
const tracks={
 'mine-exploration':{bpm:90,notes:[45,52,55,52,48,55,59,55,43,50,53,50,41,48,52,48],bass:[33,36,31,29]},
 'mine-boss':{bpm:120,notes:[45,45,48,51,45,48,52,51,43,43,46,49,43,46,51,49],bass:[33,33,31,31]}
};
await mkdir('public/assets/audio/music',{recursive:true});
for(const [name,track] of Object.entries(tracks)){
 const pcm=Buffer.alloc(n*2),beat=60/track.bpm;
 for(let i=0;i<n;i++){
  const t=i/rate,beatIndex=Math.floor(t/beat),phase=(t%beat)/beat,env=Math.min(1,phase*16)*Math.max(0,1-phase)**1.5;
  const note=midi(track.notes[beatIndex%track.notes.length]),bass=midi(track.bass[Math.floor(beatIndex/4)%track.bass.length]);
  const tone=Math.sin(2*Math.PI*note*t)*.18+Math.sin(2*Math.PI*note*2*t)*.045;
  const low=Math.sin(2*Math.PI*bass*t)*.17;
  const beatAccent=name==='mine-boss'?Math.sin(2*Math.PI*(60-25*phase)*t)*.13*Math.exp(-phase*12):0;
  const endFade=Math.min(1,t/.03,(seconds-t)/.03);
  pcm.writeInt16LE(Math.round(Math.max(-1,Math.min(1,(tone*env+low*env+beatAccent)*endFade))*32767),i*2);
 }
 const head=Buffer.alloc(44);head.write('RIFF',0);head.writeUInt32LE(36+pcm.length,4);head.write('WAVEfmt ',8);head.writeUInt32LE(16,16);head.writeUInt16LE(1,20);head.writeUInt16LE(1,22);head.writeUInt32LE(rate,24);head.writeUInt32LE(rate*2,28);head.writeUInt16LE(2,32);head.writeUInt16LE(16,34);head.write('data',36);head.writeUInt32LE(pcm.length,40);
 await writeFile(`public/assets/audio/music/${name}.wav`,Buffer.concat([head,pcm]));
}
