import {recordCompletion} from './saveStore.js';
export function createRunCoordinator({store,onStorageError=()=>{}}){
  let scene=null,finished=false,lastAttemptTick=0,listeners=[];
  function persist(){const result=store.persist();if(!result.ok)onStorageError(result.reason);return result;}
  function flush(){
    if(!scene||finished)return {ok:true};
    const run=scene.exportCheckpointData();lastAttemptTick=run.elapsedTicks;
    store.setSave({...store.getSave(),run});return persist();
  }
  function onClear(){
    if(finished||!scene)return;finished=true;
    const data=scene.exportCheckpointData();
    store.setSave(recordCompletion(store.getSave(),{elapsedTicks:data.elapsedTicks,deaths:data.deaths}));persist();
  }
  function bind(target){
    if(scene)throw new Error('Coordinator already attached');scene=target;lastAttemptTick=scene.exportCheckpointData().elapsedTicks;
    for(const name of ['stage:checkpoint','stage:pickup','stage:death']){const handler=()=>flush();target.events.on(name,handler);listeners.push([name,handler]);}
    target.events.on('stage:clear',onClear);listeners.push(['stage:clear',onClear]);
    return api;
  }
  function tick(){if(scene&&!finished&&scene.exportCheckpointData().elapsedTicks-lastAttemptTick>=60)flush();}
  function dispose(){if(!scene)return;for(const [name,handler] of listeners)scene.events.off(name,handler);listeners=[];scene=null;}
  const api={bind,tick,flush,dispose,isFinished:()=>finished};return api;
}
