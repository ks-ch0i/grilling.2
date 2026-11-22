export function showSaveImportPrompt(){
  return new Promise(resolve=>{
    const container=document.getElementById('game');
    const overlay=document.createElement('section');overlay.className='auth-screen import-screen';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','import-title');
    const panel=document.createElement('div');panel.className='auth-panel import-panel';
    const heading=document.createElement('h2');heading.id='import-title';heading.textContent='기존 기록이 있습니다';
    const description=document.createElement('p');description.className='auth-message';description.textContent='이 기기에 저장된 진행 기록을 현재 회사 계정으로 가져올까요? 설정은 이 기기에만 남습니다.';
    const importButton=document.createElement('button');importButton.type='button';importButton.className='auth-button auth-button-primary';importButton.textContent='기록 가져오기';
    const skipButton=document.createElement('button');skipButton.type='button';skipButton.className='auth-button';skipButton.textContent='새 계정으로 시작';
    const finish=choice=>{overlay.remove();resolve(choice);};
    importButton.addEventListener('click',()=>finish('import'));skipButton.addEventListener('click',()=>finish('skip'));
    panel.append(heading,description,importButton,skipButton);overlay.append(panel);container.replaceChildren(overlay);importButton.focus();
  });
}
