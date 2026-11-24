import {ROUND_COUNT} from '../sim/rounds.js';
import {recordCompletion,recordHardProgress} from './saveStore.js';
export function createRunCoordinator({store,onStorageError=()=>{}}){
  let scene=null,finished=false,ticksSinceAttempt=0,listeners=[];
  function persist(options){const result=store.persist(options);if(!result.ok)onStorageError(result.reason);return result;}
  function flush({immediate=false,roundStarted=false}={}){
    if(!scene||finished)return {ok:true};
    const run=scene.exportStageSnapshot();ticksSinceAttempt=0;
    let save={...store.getSave(),run};
    const hardMilestone=roundStarted&&scene.mode==='hard';
    if(hardMilestone){
      const {stageId,round,elapsedTicks,deaths}=run;
      save=recordHardProgress(save,stageId,{roundReached:round,cleared:false,elapsedTicks,deaths});
    }
    store.setSave(save);return persist({immediate:immediate||hardMilestone});
  }
  function onClear(){
    if(finished||!scene)return;finished=true;
    const {stageId,elapsedTicks,deaths}=scene.exportStageSnapshot();
    const result={elapsedTicks,deaths};
    let save=recordCompletion(store.getSave(),stageId,result);
    if(scene.mode==='hard')save=recordHardProgress(save,stageId,{roundReached:ROUND_COUNT,cleared:true,...result});
    store.setSave(save);persist({immediate:true});
  }
  function bind(target){
    if(scene)throw new Error('Coordinator already attached');scene=target;ticksSinceAttempt=0;
    for(const [name,handler] of [
      ['stage:pickup',()=>flush()],
      ['stage:death',()=>flush({immediate:true})],
      ['round:clear',()=>flush({immediate:true})],
      ['round:start',()=>flush({roundStarted:true})]
    ]){target.events.on(name,handler);listeners.push([name,handler]);}
    target.events.on('stage:clear',onClear);listeners.push(['stage:clear',onClear]);
    if(scene.mode==='hard')flush({roundStarted:true});
    return api;
  }
  function tick(){if(scene&&!finished&&++ticksSinceAttempt>=60)flush();}
  function dispose(){if(!scene)return;for(const [name,handler] of listeners)scene.events.off(name,handler);listeners=[];scene=null;}
  const api={bind,tick,flush,dispose,isFinished:()=>finished};return api;
}
