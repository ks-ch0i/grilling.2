import {recordCompletion} from './saveStore.js';
export function createRunCoordinator({store,onStorageError=()=>{}}){
  let scene=null,finished=false,ticksSinceAttempt=0,listeners=[];
  function persist(){const result=store.persist();if(!result.ok)onStorageError(result.reason);return result;}
  function flush(){
    if(!scene||finished)return {ok:true};
    const run=scene.exportStageSnapshot();ticksSinceAttempt=0;
    store.setSave({...store.getSave(),run});return persist();
  }
  function onClear(){
    if(finished||!scene)return;finished=true;
    const data=scene.exportStageSnapshot();
    store.setSave(recordCompletion(store.getSave(),data.stageId,{elapsedTicks:data.elapsedTicks,deaths:data.deaths}));persist();
  }
  function bind(target){
    if(scene)throw new Error('Coordinator already attached');scene=target;ticksSinceAttempt=0;
    for(const name of ['stage:pickup','stage:death']){const handler=()=>flush();target.events.on(name,handler);listeners.push([name,handler]);}
    target.events.on('stage:clear',onClear);listeners.push(['stage:clear',onClear]);return api;
  }
  function tick(){if(scene&&!finished&&++ticksSinceAttempt>=60)flush();}
  function dispose(){if(!scene)return;for(const [name,handler] of listeners)scene.events.off(name,handler);listeners=[];scene=null;}
  const api={bind,tick,flush,dispose,isFinished:()=>finished};return api;
}
