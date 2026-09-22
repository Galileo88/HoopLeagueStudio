/* Player and roster editing for an imported or generated Hoop Land league. */
(()=>{
 const positionNames=['PG','G','SG','GF','SF','F','PF','FC','C'];
 const archetypes=['All-Around','Athletic Finisher','Interior Defender','Perimeter Defender','Playmaker','Post Scorer','Rebounder','Sharpshooter','Shot Creator','Slasher'];
 const skillIds=['BAL','BUL','CHE','CLA','CLE','CLU','CRA','DIM','DUN','FOO','HIG','HOT','LIM','LOC','MAG','SNA','SOF','SPA','SPO','STE','TEA','TWO','UNF','VOL'];
 const skillNames={BAL:'Ball Hawk',BUL:'Bully',CHE:'Chef',CLA:'Clamps',CLE:'Cleanup Crew',CLU:'Clutch Gene',CRA:'Crafty',DIM:'Dimer',DUN:'Dunk Artist',FOO:'Foot Surgeon',HIG:'Highlight Reel',HOT:'Hot Potato',LIM:'Limitless',LOC:'Locked In',MAG:'Magnet',SNA:'Snatcher',SOF:'Soft Touch',SPA:'Spark Plug',SPO:'Spot Up',STE:'Step Dancer',TEA:'Tear Dropper',TWO:'Two Way',UNF:'Unfazed',VOL:'Volume Shooter'};
 const skillDescriptions={
  BAL:'Improves the chance of catching a deflected pass.',BUL:'Makes defenders more likely to fall when you back them down.',
  CHE:'Can set you on fire when a teammate catches fire after your assist.',CLA:'Strengthens your shot contests.',
  CLE:'Improves shot accuracy after an offensive rebound.',CLU:'Improves shot accuracy in clutch situations.',
  CRA:'Improves reverse and contact layups.',DIM:'Improves a teammate’s shot accuracy after your pass.',
  DUN:'Improves dunk success and allows acrobatic dunks.',FOO:'Keeps an opponent down longer after an ankle breaker.',
  HIG:'Reduces stamina used for dunks.',HOT:'Keeps the ball hot after a pass while you are on fire.',
  LIM:'Improves accuracy on shots from beyond 25 feet.',LOC:'Boosts defensive attributes in clutch situations.',
  MAG:'Helps win contested rebounds by tipping the ball.',SNA:'Improves the chance of catching a blocked shot.',
  SOF:'Improves hook shot accuracy.',SPA:'Starts you hot when you come off the bench.',
  SPO:'Improves jump shot accuracy after receiving a pass.',STE:'Improves shot accuracy after a step-back or side-step.',
  TEA:'Improves floater accuracy.',TWO:'Can steal an opponent’s on-fire status with a steal or block.',
  UNF:'Improves contested midrange shot accuracy.',VOL:'Reduces stamina used for jump shots.'
 };
 const attributeNames={LAY:'Layup',DNK:'Dunk',INS:'Inside',MID:'Midrange',TPT:'Three-point',FTS:'Free throw',DRB:'Dribbling',PAS:'Passing',ORE:'Offensive rebounding',DRE:'Defensive rebounding',STL:'Steal',BLK:'Block',STR:'Strength',SPD:'Speed',STM:'Stamina'};
 function node(tag,className='',label){const item=document.createElement(tag);if(className)item.className=className;if(label!==undefined)item.textContent=label;return item}
 function name(player){return [player.fn,player.ln].filter(Boolean).join(' ')||'Player '+player.id}
 function row(parent,title,control,hint){const label=node('label','roster-field');label.append(node('span','',title),control);if(hint)label.append(node('small','',hint));parent.append(label);return label}
 function input(parent,title,value,change,{type='text',min,max,step}={}){
  const control=node('input');control.type=type;control.value=value??'';if(min!==undefined)control.min=String(min);if(max!==undefined)control.max=String(max);if(step!==undefined)control.step=String(step);
  control.setAttribute('aria-label',title);
  const syncStepper=()=>{if(type!=='number'||!control.value)return;const current=Number(control.value);if(!Number.isFinite(current))return;const wrap=control.parentElement;if(!wrap?.classList.contains('number-control'))return;const [minus,,plus]=wrap.children;minus.disabled=min!==undefined&&current<=Number(min);plus.disabled=max!==undefined&&current>=Number(max)};
  control.onchange=()=>{const next=type==='number'?Number(control.value):control.value;if(type==='number'&&(!control.value||!Number.isFinite(next)||!control.checkValidity())){control.setCustomValidity('Enter a valid number.');control.reportValidity();return}control.setCustomValidity('');change(next);syncStepper()};
  if(type==='number'){
   const wrap=node('div','number-control'),minus=node('button','','−'),plus=node('button','','+');
   minus.type=plus.type='button';minus.setAttribute('aria-label','Decrease '+title);plus.setAttribute('aria-label','Increase '+title);
   const stepBy=direction=>{if(direction<0)control.stepDown();else control.stepUp();control.dispatchEvent(new Event('change',{bubbles:true}))};
   minus.onclick=()=>stepBy(-1);plus.onclick=()=>stepBy(1);control.oninput=syncStepper;
   wrap.append(minus,control,plus);row(parent,title,wrap);syncStepper();return control
  }
  row(parent,title,control);return control;
 }
 function select(parent,title,value,options,change){const control=node('select');control.setAttribute('aria-label',title);
  for(const [id,label]of options){const option=node('option','',label);option.value=String(id);control.append(option)}
  if(!options.some(([id])=>String(id)===String(value))){const option=node('option','',`Imported value ${value}`);option.value=String(value);control.append(option)}
  control.value=String(value);control.onchange=()=>change(control.value);row(parent,title,control);return control;
 }
 function optionStepper(parent,title,value,options,change){
  const wrap=node('div','number-control option-control'),previous=node('button','','◀'),next=node('button','','▶'),control=node('select');
  control.setAttribute('aria-label',title);previous.type=next.type='button';previous.setAttribute('aria-label','Previous '+title);next.setAttribute('aria-label','Next '+title);
  for(const [id,label]of options){const option=node('option','',label);option.value=String(id);control.append(option)}
  if(!options.some(([id])=>String(id)===String(value))){const option=node('option','',`Imported value ${value}`);option.value=String(value);control.append(option)}
  control.value=String(value);
  const sync=()=>{previous.disabled=control.selectedIndex<=0;next.disabled=control.selectedIndex<0||control.selectedIndex>=control.options.length-1};
  const commit=()=>{sync();change(control.value)};
  previous.onclick=()=>{if(control.selectedIndex>0){control.selectedIndex--;commit()}};
  next.onclick=()=>{if(control.selectedIndex>=0&&control.selectedIndex<control.options.length-1){control.selectedIndex++;commit()}};
  control.onchange=commit;wrap.append(previous,control,next);row(parent,title,wrap);sync();return control;
 }
 function colorInput(parent,title,value,change,team){
  const wrap=node('div','roster-field roster-color-field'),line=node('div','color-line'),swatch=node('input'),code=node('input'),reference=node('select');
  wrap.append(node('span','',title),line);swatch.type='color';code.type='text';code.maxLength=7;
  swatch.setAttribute('aria-label',title+' custom color');code.setAttribute('aria-label',title+' value');reference.setAttribute('aria-label',title+' team color');
  for(const [id,label]of [['','Custom'],['PRI','Primary'],['SEC','Secondary'],['TER','Tertiary']]){const option=node('option','',label);option.value=id;reference.append(option)}
  const resolved=stored=>{const index={PRI:0,SEC:1,TER:2}[String(stored||'').toUpperCase()],chosen=index===undefined?stored:team?.teamColors?.[index];return /^#?[\da-f]{6}$/i.test(String(chosen||''))?'#'+String(chosen).replace('#',''):'#ffffff'};
  const sync=stored=>{swatch.value=resolved(stored);code.value=String(stored??'');reference.value=['PRI','SEC','TER'].includes(stored)?stored:''};
  const commit=stored=>{change(stored);sync(stored)};
  swatch.oninput=()=>commit(swatch.value.slice(1).toUpperCase());
  reference.onchange=()=>commit(reference.value||swatch.value.slice(1).toUpperCase());
  code.onchange=()=>{const next=code.value.trim().replace(/^#/,'').toUpperCase();if(next&&!/^(?:[\da-f]{6}|PRI|SEC|TER)$/.test(next)){code.setCustomValidity('Use a six-digit color or a team color.');code.reportValidity();return}code.setCustomValidity('');commit(next)};
  line.append(swatch,code,reference);parent.append(wrap);sync(value)
 }
 window.HLSRosterManager={
  focusId:null,
  render(parent,{league,teamIndex,change,move,freeAgents=false,draftPlayer=null,onAddPlayer=null,onCreatePlayer=null,onCancelPlayer=null}){
   const team=freeAgents?{name:'Free Agents',roster:league.freeAgents||[],teamColors:['FFFFFF','102737','808080'],uniforms:[{jersey:'FFFFFF',shorts:'FFFFFF',jerseyStripe:'102737'}]}:league.teams[teamIndex];
   const roster=Array.isArray(team?.roster)?team.roster:[];
   if(!team){parent.append(node('p','','Choose a team to manage its roster.'));return}
   const shell=node('div','roster-manager'),listPanel=node('section','card roster-list-panel'),editor=node('section','card roster-player-panel');
   const search=node('input');search.type='search';search.placeholder='Search roster';search.setAttribute('aria-label','Search roster');
   const list=node('div','roster-list');listPanel.append(node('h2','',`${team.city?team.city+' ':''}${team.name} Roster`),node('p','',`${roster.length} players`),search,list);
   if(onAddPlayer){const add=node('button','primary roster-add-player','Add Player');add.type='button';add.onclick=async()=>{
    if(draftPlayer){active=draftPlayer;drawList();drawEditor();return}
    add.disabled=true;try{await onAddPlayer()}finally{add.disabled=false}
   };listPanel.insertBefore(add,search)}
   shell.append(listPanel,editor);parent.append(shell);
   let active=draftPlayer||roster.find(player=>player.id===this.focusId)||roster[0]||null,selectedUniformIndex=0;
   const path=(player,...keys)=>player===draftPlayer?['draft',...keys]:freeAgents?['freeAgents',roster.indexOf(player),...keys]:['teams',teamIndex,'roster',roster.indexOf(player),...keys];
   const commit=(player,key,value)=>{change(path(player,key),value);drawList();if(player===draftPlayer)editor.querySelector('h2').textContent=name(player)};
   const drawList=()=>{list.replaceChildren();const query=search.value.trim().toLocaleLowerCase();for(const player of roster.filter(player=>name(player).toLocaleLowerCase().includes(query)||String(player.num??'').includes(query))){
    const button=node('button','roster-player',`${player.num??'—'} · ${name(player)} · ${positionNames[player.pos]||(player.pos??'—')}`);button.type='button';button.classList.toggle('active',player===active);button.setAttribute('aria-pressed',String(player===active));button.onclick=()=>{active=player;selectedUniformIndex=0;this.focusId=player.id;drawList();drawEditor()};list.append(button)
   }if(!list.children.length)list.append(node('p','',freeAgents&&!roster.length?'No free agents yet.':'No matching players.'))};
   const drawEditor=()=>{
    editor.replaceChildren();if(!active){editor.append(node('h2','',freeAgents?'No free agents yet':'No players on this team'));return}
    const player=active,base=path(player),creating=player===draftPlayer;editor.append(node('h2','',creating&&!player.fn&&!player.ln?'New Free Agent':name(player)),node('p','roster-player-id',creating?'Set the player’s details before adding them to Free Agents.':`Player ID ${player.id} · Team ID ${player.tid}`));
    if(!creating){const moveRow=node('div','roster-move'),target=node('select'),button=node('button','primary','Move player');target.setAttribute('aria-label','Destination team');
    for(const [index,other]of league.teams.entries())if(index!==teamIndex){const option=node('option','',`${other.city?other.city+' ':''}${other.name}`);option.value=String(index);target.append(option)}
    button.type='button';button.textContent=freeAgents?'Add to team':'Move player';button.disabled=!target.options.length;
    button.onclick=()=>freeAgents?move(Number(target.value),player.id):move(teamIndex,Number(target.value),player.id);
    moveRow.append(target,button);editor.append(node('h3','',freeAgents?'Add to a team':'Move to another team'),moveRow)}
    const identity=node('div','roster-fields');editor.append(node('h3','','Player Details'),identity);
    for(const [key,title]of [['fn','First name'],['ln','Last name'],['tag','Nickname']])if(key in player){const control=input(identity,title,player[key],value=>commit(player,key,value));if(creating&&['fn','ln'].includes(key))control.required=true}
    for(const [key,title]of [['num','Jersey number'],['age','Age'],['ht','Height (inches)'],['wt','Weight (pounds)'],['yrs','Years of experience'],['pot','Potential']])if(key in player)input(identity,title,player[key],value=>commit(player,key,value),{type:'number',min:0,max:key==='num'?99:key==='pot'?10:999,step:1});
    if('pos'in player)optionStepper(identity,'Position',player.pos,positionNames.map((title,id)=>[id,title]),value=>commit(player,'pos',Number(value)));
    const archetypeOptions=[[0,'None'],...archetypes.map((title,index)=>[index+1,title])];
    for(const [key,title]of [['pri','Primary archetype'],['sec','Secondary archetype']])if(key in player)optionStepper(identity,title,player[key],archetypeOptions,value=>{commit(player,key,Number(value));drawEditor()});
    if(player.appearance){
     const appearance=node('div','roster-appearance'),preview=node('div','roster-appearance-preview'),canvas=node('canvas');
     canvas.width=64;canvas.height=84;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Animated player appearance preview');
     let uniformIndex=selectedUniformIndex,redraw=()=>{};
     const outfits=(player.accessories||[]).map((_,index)=>[index,['Home','Road','Alt 1','Alt 2'][index]||`Uniform ${index+1}`]);
     const uniformTabs=node('div','roster-uniform-tabs');uniformTabs.setAttribute('role','group');uniformTabs.setAttribute('aria-label','Uniform appearance');
     for(const [index,title]of outfits){const button=node('button','roster-uniform-tab',title);button.type='button';button.setAttribute('aria-pressed',String(index===uniformIndex));button.onclick=()=>{
      uniformIndex=selectedUniformIndex=index;
      for(const tab of uniformTabs.children){const selected=tab===button;tab.classList.toggle('selected',selected);tab.setAttribute('aria-pressed',String(selected))}
      drawAccessories();redraw()
     };button.classList.toggle('selected',index===uniformIndex);uniformTabs.append(button)}
     preview.append(canvas,uniformTabs,node('small','','Appearance preview may differ slightly in Hoop Land.'));
     const appearanceSettings=node('details','roster-appearance-settings'),settingsSummary=node('summary','','Skin, eyes & hair'),fields=node('div','roster-appearance-fields');
     appearanceSettings.append(settingsSummary,fields);appearance.append(preview,appearanceSettings);
     editor.append(node('h3','','Appearance'),appearance);
     const update=(key,value)=>{change([...base,'appearance',key],value);redraw()};
     for(const [key,title]of [['skinC','Skin'],['eyeC','Eyes'],['browC','Eyebrows'],['hairC','Hair color'],['fHairC','Facial hair color']])if(key in player.appearance){
      const control=node('input');control.type='color';control.value='#'+String(player.appearance[key]||'262539').replace('#','');control.className='roster-appearance-color';
      control.setAttribute('aria-label',title);control.oninput=()=>update(key,control.value.slice(1).toUpperCase());row(fields,title,control).classList.add('roster-color-field')
     }
     if('unibrow'in player.appearance){const label=node('label','roster-check roster-unibrow-field'),check=node('input');check.type='checkbox';check.checked=!!player.appearance.unibrow;check.onchange=()=>update('unibrow',check.checked);label.append(check,' Unibrow');fields.append(label)}
     for(const [key,title,max,empty]of [['hair','Hair style',170,'Bald'],['fHair','Facial hair',31,'None']])if(key in player.appearance){
      const options=Array.from({length:max+1},(_,index)=>[String(index).padStart(4,'0'),index?`Style ${index}`:empty]);
      const control=optionStepper(fields,title,player.appearance[key],options,value=>update(key,value));control.classList.add('roster-compact-select');control.parentElement?.parentElement?.classList.add('roster-style-field')
     }
     const accessories=node('details','roster-accessories'),accessorySummary=node('summary','','Accessories'),copyRow=node('div','roster-accessory-copy'),copyDestination=node('select'),copyButton=node('button','','Copy to'),accessoryGroups=node('div','roster-accessory-groups');
     copyDestination.setAttribute('aria-label','Copy accessories destination');copyButton.type='button';copyButton.className='roster-copy-accessories';
     copyButton.onclick=()=>{const gear=player.accessories?.[uniformIndex];if(!gear)return;const destination=copyDestination.value,targets=destination==='all'?(player.accessories||[]).map((_,index)=>index).filter(index=>index!==uniformIndex):[Number(destination)].filter(index=>Number.isInteger(index)&&index!==uniformIndex);
      for(const target of targets)change([...base,'accessories',target],JSON.parse(JSON.stringify(gear)))
     };
     copyRow.append(copyDestination,copyButton);accessories.append(accessorySummary,copyRow,accessoryGroups);editor.append(accessories);
     const drawAccessories=()=>{copyDestination.replaceChildren();for(const [index,title]of outfits)if(index!==uniformIndex){const option=node('option','',title);option.value=String(index);copyDestination.append(option)}
      if(outfits.length>2){const all=node('option','','All other uniforms');all.value='all';copyDestination.append(all)}copyButton.disabled=!copyDestination.options.length;
      accessoryGroups.replaceChildren();const gear=player.accessories?.[uniformIndex];if(!gear)return;
      const groups=[
       ['Head',[['headAcc','Head accessory','none'],['headAcc2','Second head accessory','0000']],[['headAccC','Head accessory color'],['headAcc2C','Second head accessory color']]],
       ['Arms',[],[['L_Shoulder','Left shoulder'],['R_Shoulder','Right shoulder'],['L_Elbow','Left elbow'],['R_Elbow','Right elbow'],['L_Wrist','Left wrist'],['R_Wrist','Right wrist']]],
       ['Legs',[],[['L_Knee','Left knee'],['R_Knee','Right knee'],['L_Shin','Left shin'],['R_Shin','Right shin']]],
       ['Shoes',[],[['sockC','Socks'],['shoeC','Shoes'],['laceC','Laces'],['soleC','Soles']]]
      ];
      for(const [title,styles,colors]of groups){
       if(!styles.some(([key])=>key in gear)&&!colors.some(([key])=>key in gear))continue;
       const section=node('details','roster-accessory-group'),summary=node('summary','',title),groupFields=node('div','roster-appearance-fields');section.append(summary,groupFields);accessoryGroups.append(section);
       for(const [key,label,empty]of styles)if(key in gear){
        const options=[[empty,'None'],...Array.from({length:25},(_,i)=>[String(i+1).padStart(4,'0'),`Style ${i+1}`])];
        const control=optionStepper(groupFields,label,gear[key],options,value=>{change([...base,'accessories',uniformIndex,key],value);redraw()});control.classList.add('roster-compact-select')
       }
       for(const [key,label]of colors)if(key in gear)colorInput(groupFields,label,gear[key],value=>{change([...base,'accessories',uniformIndex,key],value);redraw()},team)
      }
     };drawAccessories();
     redraw=window.HLSPlayerPreview.mount(canvas,()=>({player,team,uniformIndex}));
    }
    const attributeSection=node('details','roster-editor-section roster-attributes-section'),attributeSummary=node('summary','','Attributes'),attributeContent=node('div','roster-editor-section-content'),attributes=node('div','roster-attributes');
    attributeContent.append(node('p','','Edit the stored current and potential values. The game calculates the displayed rating.'),attributes);attributeSection.append(attributeSummary,attributeContent);editor.append(attributeSection);
    for(const [key,levels]of Object.entries(player.attributes||{})){if(!Array.isArray(levels)||levels.length<2)continue;const group=node('div','roster-attribute');group.append(node('strong','',attributeNames[key]||key));
     for(const [index,title]of ['Current','Potential'].entries())input(group,title,levels[index],value=>change([...base,'attributes',key,index],value),{type:'number',min:index===1?levels[0]:0,max:index===0?levels[1]:20,step:1});attributes.append(group)}
    const skillSection=node('details','roster-editor-section roster-skills-section'),skillSummary=node('summary','','Skills'),skills=node('div','roster-skills roster-editor-section-content');skillSection.append(skillSummary,skills);editor.append(skillSection);
    const refreshSkills=()=>{skills.replaceChildren();for(const [index,skill]of (player.skills||[]).entries()){
     const group=node('div','roster-skill');const available=[...new Set([...skillIds.filter(id=>!(player.skills||[]).some((entry,i)=>i!==index&&entry.id===id)),skill.id])].sort();
     const description=node('p','roster-skill-description',skillDescriptions[skill.id]||'Description unavailable for this imported skill.');
     optionStepper(group,'Skill',skill.id,available.map(id=>[id,skillNames[id]||id]),value=>{change([...base,'skills',index,'id'],value);description.textContent=skillDescriptions[value]||'Description unavailable for this imported skill.'});group.append(description);
     input(group,'Level',skill.level,value=>change([...base,'skills',index,'level'],value),{type:'number',min:0,max:99,step:1});
     input(group,'XP Available',skill.xp,value=>change([...base,'skills',index,'xp'],value),{type:'number',min:0,max:999999,step:1});
     const equipped=node('label','roster-check'),check=node('input');check.type='checkbox';check.checked=!!skill.equipped;check.onchange=()=>change([...base,'skills',index,'equipped'],check.checked);equipped.append(check,' Equipped');group.append(equipped);
     const remove=node('button','','Remove skill');remove.type='button';remove.onclick=()=>{change([...base,'skills'],player.skills.filter((_,i)=>i!==index));refreshSkills()};group.append(remove);skills.append(group)
    }const add=node('button','','Add skill');add.type='button';const nextSkill=skillIds.find(id=>!(player.skills||[]).some(skill=>skill.id===id));add.disabled=!nextSkill;add.onclick=()=>{change([...base,'skills'],[...(player.skills||[]),{id:nextSkill,xp:0,level:1,equipped:false}]);refreshSkills()};skills.append(add)};refreshSkills();
    if(creating){const actions=node('div','roster-draft-actions'),create=node('button','primary','Create Free Agent'),cancel=node('button','','Cancel');
     create.type=cancel.type='button';create.onclick=()=>onCreatePlayer?.(player);cancel.onclick=()=>onCancelPlayer?.();actions.append(create,cancel);editor.append(actions)}
   };
   search.oninput=drawList;drawList();drawEditor();
  }
 };
})();
