const floor={x:0,y:304,w:640,h:56};
const platforms=[{x:128,y:256,w:112,h:16},{x:400,y:256,w:96,h:16},{x:288,y:288,w:32,h:16}];

export const MINE_STAGE={
  id:'mine-1',
  world:{width:640,height:360},
  spawn:{x:16,y:276},
  solids:[floor,...platforms],
  pitDeathY:344,
  pickups:[],
  enemies:[
    {id:'golem-template',kind:'golem',x:128,y:264},
    {id:'insect-template',kind:'insect',x:288,y:280},
    {id:'bat-template',kind:'bat',x:400,y:180}
  ],
  arena:{left:16,right:624,top:0,bottom:304},
  boss:{id:'mine-machine',kind:'machine',x:520,y:240}
};
