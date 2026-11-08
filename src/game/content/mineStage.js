const pits=[[1504,1568],[3136,3200],[4960,5024],[6848,6912],[8752,8816]];
const ground=[];let left=0;
for(const [start,end] of pits){ground.push({x:left,y:304,w:start-left,h:56});left=end;}
ground.push({x:left,y:304,w:11520-left,h:56});
export const MINE_STAGE={
 id:'mine-1',world:{width:11520,height:360},spawn:{x:120,y:276},
 solids:[...ground,...[1800,3488,5504,7360,9120].map(x=>({x,y:256,w:128,h:16})),...[1216,2800,4384,6624,9504].map(x=>({x,y:288,w:32,h:16}))],
 pitDeathY:344,pickups:[{id:'heal-1',kind:'heal',x:2400,y:288},{id:'heal-2',kind:'heal',x:6200,y:288},{id:'heal-3',kind:'heal',x:9600,y:288}],
 enemies:[
  ...[800,3850,6400].map((x,i)=>({id:`golem-${i+1}`,kind:'golem',x,y:264})),
  ...[2200,5320,8070].map((x,i)=>({id:`insect-${i+1}`,kind:'insect',x,y:280})),
  ...[2300,6500,9700].map((x,i)=>({id:`bat-${i+1}`,kind:'bat',x,y:180}))
 ],
 arena:{left:10496,right:11472,top:0,bottom:304},boss:{id:'mine-machine',kind:'machine',x:11040,y:240}
};
