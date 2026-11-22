export function mountAuthScreen({title,message,actions=[],accounts=[],onSelectAccount}={}){
  const container=document.getElementById('game');
  container.replaceChildren();
  const screen=document.createElement('section');screen.className='auth-screen';screen.setAttribute('role','main');screen.setAttribute('aria-labelledby','auth-title');
  const panel=document.createElement('div');panel.className='auth-panel';
  const heading=document.createElement('h2');heading.id='auth-title';heading.textContent=title??'Grill-Me';
  const description=document.createElement('p');description.className='auth-message';description.setAttribute('aria-live','polite');description.textContent=message??'';
  panel.append(heading,description);
  if(accounts.length){
    const list=document.createElement('div');list.className='auth-account-list';
    for(const account of accounts){
      const button=document.createElement('button');button.type='button';button.className='auth-button';
      button.textContent=account.name||account.username||'Microsoft 계정';
      button.addEventListener('click',()=>onSelectAccount?.(account));list.append(button);
    }
    panel.append(list);
  }
  for(const action of actions){
    const button=document.createElement('button');button.type='button';button.className=`auth-button${action.primary?' auth-button-primary':''}`;
    button.textContent=action.label;button.addEventListener('click',()=>action.onClick?.());panel.append(button);
  }
  screen.append(panel);container.append(screen);
  return {remove:()=>screen.remove(),setMessage:value=>{description.textContent=value;}};
}
