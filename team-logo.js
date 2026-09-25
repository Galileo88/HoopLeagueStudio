/* Team marks use Hoop Land's letter sprites when no custom image is set. */
(()=>{
 const letters=new Image();letters.src='./player-assets/team-letters.png';
 const valid=value=>/^[\da-f]{6}$/i.test(String(value||''));
 const rgb=value=>[0,2,4].map(i=>parseInt(value.slice(i,i+2),16));
 const isImage=value=>/^(https?:|data:image|blob:|\/|\.\/)/i.test(value)||/\.(png|jpe?g|webp|gif)(?:[?#]|$)/i.test(value);
 function create(team){
  const icon=document.createElement('span');icon.className='team-icon';icon.dataset.teamLogo='true';
  icon.syncTeamLogo=()=>{
   icon.replaceChildren();
   const primary=rgb(valid(team.teamColors?.[0])?team.teamColors[0]:'147dff');
   const secondary=rgb(valid(team.teamColors?.[1])?team.teamColors[1]:'102737');
   const tertiary=rgb(valid(team.teamColors?.[2])?team.teamColors[2]:'05c8ff');
   const source=String(team.logoURL||'').trim();
   if(source&&isImage(source)){
    const img=document.createElement('img');img.alt='';img.src=source;
    img.onerror=()=>{if(icon.contains(img)){teamLogoLetter(icon,team,primary,secondary,tertiary)}};
    icon.append(img);return
   }
   teamLogoLetter(icon,team,primary,secondary,tertiary)
  };
  icon.syncTeamLogo();return icon
 }
 function teamLogoLetter(icon,team,primary,secondary,tertiary){
  icon.replaceChildren();
  const character=String(team.name||team.shortName||'H').trim().charAt(0).toUpperCase();
  const index=character.charCodeAt(0)-65;
  if(index<0||index>=26){icon.textContent=character||'?';return}
  const canvas=document.createElement('canvas');canvas.width=canvas.height=32;
  canvas.setAttribute('aria-hidden','true');icon.append(canvas);
  const draw=()=>{
   if(!letters.naturalWidth)return;
   const context=canvas.getContext('2d',{willReadFrequently:true});
   context.clearRect(0,0,32,32);context.drawImage(letters,(index%8)*32,Math.floor(index/8)*32,32,32,0,0,32,32);
   const image=context.getImageData(0,0,32,32);
   for(let i=0;i<image.data.length;i+=4){if(!image.data[i+3])continue;
    // The sprite's three blue palette entries represent the team's color slots.
    const source=(image.data[i]<<16)|(image.data[i+1]<<8)|image.data[i+2];
    const color=source===0x147dff?primary:source===0x0aafff?secondary:source===0x05c8ff?tertiary:null;
    if(!color)continue;
    image.data[i]=color[0];image.data[i+1]=color[1];image.data[i+2]=color[2]
   }context.putImageData(image,0,0)
  };
  if(letters.complete)draw();else letters.addEventListener('load',draw,{once:true})
 }
 async function letterCanvas(team){
  await letters.decode();
  const icon=create({...team,logoURL:''}),sprite=icon.querySelector('canvas');
  if(sprite)return sprite;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=32;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(icon.textContent,16,16,32);return canvas;
 }
 window.HLSTeamLogo={create,letterCanvas};

 function enhanceTeamScroller(){
  const teams=document.getElementById('teams');
  if(!teams||teams.closest('.team-scroll-shell'))return;
  const shell=document.createElement('div'),hint=document.createElement('div');
  shell.className='team-scroll-shell';hint.className='team-scroll-hint';hint.setAttribute('aria-hidden','true');
  teams.parentNode.insertBefore(shell,teams);shell.append(teams,hint);
  const sync=()=>{
   const overflow=teams.scrollHeight>teams.clientHeight+2;
   const canScrollUp=overflow&&teams.scrollTop>2;
   const canScrollDown=overflow&&teams.scrollTop+teams.clientHeight<teams.scrollHeight-2;
   shell.classList.toggle('can-scroll-up',canScrollUp);
   shell.classList.toggle('can-scroll-down',canScrollDown)
  };
  teams.addEventListener('scroll',sync,{passive:true});
  if('ResizeObserver'in window)new ResizeObserver(sync).observe(teams);
  new MutationObserver(()=>requestAnimationFrame(sync)).observe(teams,{childList:true,subtree:true});
  requestAnimationFrame(sync)
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhanceTeamScroller,{once:true});else enhanceTeamScroller();

 function enhanceSaveLoad(){
  const save=document.getElementById('saveProgress'),load=document.getElementById('restoreProgress');
  if(!save||!load)return;
  if(typeof save.onclick!=='function'||typeof load.onclick!=='function'){setTimeout(enhanceSaveLoad,50);return}
  if(load.dataset.saveLoadEnhanced)return;
  load.dataset.saveLoadEnhanced='true';
  const saveHandler=save.onclick,loadHandler=load.onclick;
  save.hidden=true;load.textContent='Save / Load League';load.setAttribute('aria-haspopup','dialog');

  const readSlots=()=>new Promise((resolve,reject)=>{
   const request=indexedDB.open('HooplandLeagueStudioDrafts',1);
   request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('drafts'))db.createObjectStore('drafts')};
   request.onerror=()=>reject(request.error||Error('Browser storage is unavailable.'));
   request.onsuccess=()=>{
    const db=request.result,tx=db.transaction('drafts','readonly'),store=tx.objectStore('drafts'),records=Array(3);
    let remaining=3;
    [0,1,2].forEach(slot=>{
     const key=slot===0?'current':'slot-'+slot,operation=store.get(key);
     operation.onsuccess=()=>{records[slot]=operation.result;if(!--remaining){db.close();resolve(records)}};
     operation.onerror=()=>{db.close();reject(operation.error||Error('Could not read saved leagues.'))}
    });
    tx.onerror=()=>{db.close();reject(tx.error||Error('Could not read saved leagues.'))}
   }
  });

  const runOriginal=(mode,slot,action)=>new Promise((resolve,reject)=>{
   const existing=new Set(document.querySelectorAll('dialog.draft-dialog'));
   const handler=mode==='save'?saveHandler:loadHandler,source=mode==='save'?save:load;
   let bridge=null,settled=false,timer;
   const finish=(error)=>{
    if(settled)return;settled=true;clearTimeout(timer);observer.disconnect();
    if(bridge?.open)bridge.close();
    error?reject(error):resolve()
   };
   const trigger=()=>{
    if(!bridge)return;
    const rows=[...bridge.querySelectorAll('.draft-row')];
    if(rows.length<3){setTimeout(trigger,20);return}
    const target=action==='delete'?rows[slot]?.querySelector('.draft-delete'):rows[slot]?.querySelector('.draft-slot');
    if(!target||target.disabled){finish(Error(action==='delete'?'This save could not be deleted.':'That slot is not available.'));return}
    const originalConfirm=window.confirm;window.confirm=()=>true;
    try{target.click()}finally{window.confirm=originalConfirm}
   };
   const observer=new MutationObserver(records=>{
    for(const record of records)for(const node of record.addedNodes)if(node instanceof HTMLDialogElement&&node.matches('dialog.draft-dialog')&&!existing.has(node)){
     bridge=node;bridge.classList.add('draft-dialog-bridge');bridge.setAttribute('aria-hidden','true');
     bridge.addEventListener('close',()=>finish(),{once:true});
     const status=bridge.querySelector('[role="status"]');
     if(status)new MutationObserver(()=>{
      if(!bridge?.open)return;
      if(/could not|try again once|unavailable/i.test(status.textContent||''))finish(Error(status.textContent))
     }).observe(status,{childList:true,subtree:true,characterData:true});
     trigger();return
    }
   });
   observer.observe(document.body,{childList:true});
   timer=setTimeout(()=>finish(Error('The save/load action took too long.')),12000);
   try{handler.call(source)}catch(error){finish(error)}
  });

  const openUnified=async()=>{
   if(document.querySelector('dialog.save-load-league-dialog'))return;
   const dialog=document.createElement('dialog'),heading=document.createElement('h2'),message=document.createElement('p'),list=document.createElement('div'),close=document.createElement('button');
   dialog.className='draft-dialog save-load-league-dialog';heading.textContent='Save / Load League';heading.id='save-load-dialog-title';dialog.setAttribute('aria-labelledby',heading.id);
   message.className='save-load-message';message.setAttribute('role','status');message.textContent='Loading saved leagues…';
   list.className='save-load-list';close.type='button';close.textContent='Close';close.onclick=()=>dialog.close();
   dialog.append(heading,message,list,close);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
   let busy=false;
   const setBusy=value=>{busy=value;close.disabled=value;for(const button of list.querySelectorAll('button'))button.disabled=value||button.dataset.defaultDisabled==='true'};
   const draw=async()=>{
    try{
     const records=await readSlots();if(!dialog.open)return;
     list.replaceChildren();message.textContent='Save the current league or load an existing save.';
     records.forEach((record,slot)=>{
      const row=document.createElement('div'),info=document.createElement('div'),actions=document.createElement('div'),title=document.createElement('strong'),meta=document.createElement('small');
      row.className='draft-row save-load-row';info.className='draft-slot save-load-slot-info';actions.className='save-load-actions';
      const name=record?.league?.leagueName||'Empty slot';title.textContent='Slot '+(slot+1)+' — '+name;meta.textContent=record?'Saved '+new Date(record.savedAt).toLocaleString():'Available for a new league';
      info.append(title,meta);
      const saveButton=document.createElement('button'),loadButton=document.createElement('button');
      saveButton.type=loadButton.type='button';saveButton.textContent=record?'Overwrite':'Save';loadButton.textContent='Load';
      saveButton.dataset.defaultDisabled=String(save.disabled);saveButton.disabled=save.disabled;
      loadButton.dataset.defaultDisabled=String(!record);loadButton.disabled=!record;
      saveButton.onclick=async()=>{
       if(busy||save.disabled)return;
       if(record&&!confirm('Replace “'+name+'” in slot '+(slot+1)+'?'))return;
       setBusy(true);message.textContent='Saving slot '+(slot+1)+'…';
       try{await runOriginal('save',slot,'slot');message.textContent='Saved slot '+(slot+1)+'.';await draw()}catch(error){message.textContent=error.message||'Could not save league.'}finally{if(dialog.open)setBusy(false)}
      };
      loadButton.onclick=async()=>{
       if(busy||!record)return;
       if(!save.disabled&&!confirm('Load “'+name+'”? Any unsaved changes in the current league will be replaced.'))return;
       setBusy(true);message.textContent='Loading slot '+(slot+1)+'…';
       try{await runOriginal('load',slot,'slot');if(dialog.open)dialog.close()}catch(error){message.textContent=error.message||'Could not load league.';if(dialog.open)setBusy(false)}
      };
      actions.append(saveButton,loadButton);
      if(record){
       const remove=document.createElement('button');remove.type='button';remove.className='draft-delete';remove.textContent='Delete';remove.setAttribute('aria-label','Delete '+name+' from slot '+(slot+1));
       remove.onclick=async()=>{
        if(busy||!confirm('Delete “'+name+'” from slot '+(slot+1)+'? This cannot be undone.'))return;
        setBusy(true);message.textContent='Deleting slot '+(slot+1)+'…';
        try{await runOriginal('load',slot,'delete');message.textContent='Deleted slot '+(slot+1)+'.';await draw()}catch(error){message.textContent=error.message||'Could not delete save.'}finally{if(dialog.open)setBusy(false)}
       };
       actions.append(remove)
      }
      row.append(info,actions);list.append(row)
     })
    }catch(error){message.textContent='Could not read saved leagues: '+error.message}
   };
   dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault()});
   await draw()
  };
  load.onclick=openUnified
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhanceSaveLoad,{once:true});else enhanceSaveLoad();
})();
