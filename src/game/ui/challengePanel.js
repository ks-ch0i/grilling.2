import {mountMenu} from './menu.js';

export function mountChallengePanel(title,subtitle='',{titleScreen=false}={}){
  const menu=mountMenu(title,subtitle,titleScreen?{variant:'title',layout:'submenu'}:{});
  menu.root.classList.add('challenge-overlay');
  menu.panel.classList.add('challenge-panel');
  return menu;
}

export function setPanelStage(panel,stageId){
  if(stageId!=='forest-1'&&stageId!=='mine-1')throw new TypeError('Unknown panel stage');
  panel.setAttribute('data-stage-id',stageId);
}

export function appendChoiceSwitch(parent,{label,choices,value,onChange}){
  const root=document.createElement('div');
  root.className='challenge-tabs';
  root.setAttribute('role','group');
  root.setAttribute('aria-label',label);
  const buttons=new Map();
  let selected;

  function setValue(next){
    if(!buttons.has(next))throw new TypeError('Unknown switch choice');
    selected=next;
    for(const [key,button] of buttons)button.setAttribute('aria-pressed',String(key===selected));
  }

  for(const choice of choices){
    const button=document.createElement('button');
    button.type='button';
    button.textContent=choice.label;
    button.setAttribute('data-choice',choice.value);
    button.addEventListener('click',()=>{
      if(choice.value===selected)return;
      setValue(choice.value);
      onChange(choice.value);
    });
    buttons.set(choice.value,button);
    root.append(button);
  }
  setValue(value);
  parent.append(root);
  return {root,setValue};
}
