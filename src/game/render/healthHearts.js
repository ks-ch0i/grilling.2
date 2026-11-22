export function healthHeartState(hp,index){
 const full=Math.floor(Math.max(0,hp));
 if(index<full)return 'full';
 if(index===full&&hp-full>=0.5)return 'half';
 return 'empty';
}
