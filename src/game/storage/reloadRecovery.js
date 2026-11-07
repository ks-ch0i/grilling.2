const KEY='pixel-action.active-tab.v1';
function session(){try{return globalThis.sessionStorage;}catch{return null;}}
export function markRunActive(storage=session()){try{storage?.setItem(KEY,'1');}catch{}}
export function clearRunActive(storage=session()){try{storage?.removeItem(KEY);}catch{}}
export function shouldRecoverRun(navigationType,hasSavedRun,storage=session()){
  try{return navigationType==='reload'&&Boolean(hasSavedRun)&&storage?.getItem(KEY)==='1';}catch{return false;}
}
