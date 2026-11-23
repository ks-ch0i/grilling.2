export function mountAuthScreen({title,message,actions=[]}={}){
  const container=document.getElementById('game');
  container.replaceChildren();
  const screen=document.createElement('section');screen.className='auth-screen';screen.setAttribute('role','main');screen.setAttribute('aria-labelledby','auth-title');
  const panel=document.createElement('div');panel.className='auth-panel';
  const heading=document.createElement('h2');heading.id='auth-title';heading.textContent=title??'Grill-Me';
  const description=document.createElement('p');description.className='auth-message';description.setAttribute('aria-live','polite');description.textContent=message??'';
  panel.append(heading,description);
  for(const action of actions){
    const button=document.createElement('button');button.type='button';button.className=`auth-button${action.primary?' auth-button-primary':''}`;
    button.textContent=action.label;button.addEventListener('click',()=>action.onClick?.());panel.append(button);
  }
  screen.append(panel);container.append(screen);
  return {remove:()=>screen.remove()};
}
