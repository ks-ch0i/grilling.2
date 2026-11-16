const floor={x:0,y:304,w:640,h:56};
const platforms=[{x:128,y:256,w:112,h:16},{x:400,y:256,w:96,h:16},{x:288,y:288,w:32,h:16}];

export const FOREST_STAGE={
  id:'forest-1',
  world:{width:640,height:360},
  spawn:{x:16,y:276},
  solids:[floor,...platforms],
  pitDeathY:344,
  pickups:[],
  enemies:[
    {id:'soldier-template',kind:'soldier',x:128,y:276},
    {id:'wisp-template',kind:'wisp',x:288,y:284},
    {id:'boar-template',kind:'boar',x:400,y:284}
  ],
  arena:{left:16,right:624,top:0,bottom:304},
  boss:{id:'forest-guardian',x:520,y:208}
};

export {validateStage} from './stageValidation.js';
