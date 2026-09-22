/* Player and roster editing for an imported or generated Hoop Land league. */
(()=>{
 const positionNames=['PG','G','SG','GF','SF','F','PF','FC','C'];
 const archetypes=['All-Around','Athletic Finisher','Interior Defender','Perimeter Defender','Playmaker','Post Scorer','Rebounder','Sharpshooter','Shot Creator','Slasher'];
 const skillIds=['BAL','BUL','CHE','CLA','CLE','CLU','CRA','DIM','DUN','FOO','HIG','HOT','LIM','LOC','MAG','SNA','SOF','SPA','SPO','STE','TEA','TWO','UNF','VOL'];
 const skillNames={BAL:'Ball Hawk',BUL:'Bully',CHE:'Chef',CLA:'Clamps',CLE:'Cleanup Crew',CLU:'Clutch Gene',CRA:'Crafty',DIM:'Dimer',DUN:'Dunk Artist',FOO:'Foot Surgeon',HIG:'Highlight Reel',HOT:'Hot Potato',LIM:'Limitless',LOC:'Locked In',MAG:'Magnet',SNA:'Snatcher',SOF:'Soft Touch',SPA:'Spark Plug',SPO:'Spot Up',STE:'Step Dancer',TEA:'Tear Dropper',TWO:'Two Way',UNF:'Unfazed',VOL:'Volume Shooter'};
 const attributeNames={LAY:'Layup',DNK:'Dunk',INS:'Inside',MID:'Midrange',TPT:'Three-point',FTS:'Free throw',DRB:'Dribbling',PAS:'Passing',ORE:'Offensive rebounding',DRE:'Defensive rebounding',STL:'Steal',BLK:'Block',STR:'Strength',SPD:'Speed',STM:'Stamina'};
 function node(tag,className='',label){const item=document.createElement(tag);if(className)item.className=className;if(label!==undefined)item.textContent=label;return item}
 function name(player){return [player.fn,player.ln].filter(Boolean).join(' ')||'Player '+player.id}
 function row(parent,title,control,hint){const label=node('label','roster-field');label.append(node('span','',title),control);if(hint)label.append(node('small','',hint));parent.append(label);return label}
 function input(parent,title,value,change,{type='text',min,max,step}={}){
  const control=node('input');control.type=type;control.value=value??'';if(min!==undefined)control.min=String(min);if(max!==undefined)control.max=String(max);if(step!==undefined)control.step=String(step);
  control.setAttribute('aria-label',title);
  control.onchange=()=>{const next=type==='number'?Number(control.value):control.value;if(type==='number'&&(!control.value||!Number.isFinite(next)||!control.checkValidity())){control.setCustomValidity('Enter a valid number.');control.reportValidity();return}control.setCustomValidity('');change(next)};
  row(parent,title,control);return control;
 }
 function select(parent,title,value,options,change){const control=node('select');control.setAttribute('aria-label',title);
  for(const [id,label]of options){const option=node('option','',label);option.value=String(id);control.append(option)}
  if(!options.some(([id])=>String(id)===String(value))){const option=node('option','',`Imported value ${value}`);option.value=String(value);control.append(option)}
  control.value=String(value);control.onchange=()=>change(control.value);row(parent,title,control);return control;
 }
 window.HLSRosterManager={
  focusId:null,
  render(parent,{league,teamIndex,change,move}){
   const team=league.teams[teamIndex],roster=Array.isArray(team?.roster)?team.roster:[];
   if(!team){parent.append(node('p','','Choose a team to manage its roster.'));return}
   const shell=node('div','roster-manager'),listPanel=node('section','card roster-list-panel'),editor=node('section','card roster-player-panel');
   const search=node('input');search.type='search';search.placeholder='Search roster';search.setAttribute('aria-label','Search roster');
   const list=node('div','roster-list');listPanel.append(node('h2','',`${team.city?team.city+' ':''}${team.name} Roster`),node('p','',`${roster.length} players`),search,list);
   shell.append(listPanel,editor);parent.append(shell);
   let active=roster.find(player=>player.id===this.focusId)||roster[0]||null;
   const path=(player,...keys)=>['teams',teamIndex,'roster',roster.indexOf(player),...keys];
   const commit=(player,key,value)=>{change(path(player,key),value);drawList()};
   const drawList=()=>{list.replaceChildren();const query=search.value.trim().toLocaleLowerCase();for(const player of roster.filter(player=>name(player).toLocaleLowerCase().includes(query)||String(player.num??'').includes(query))){
    const button=node('button','roster-player',`${player.num??'—'} · ${name(player)} · ${positionNames[player.pos]||(player.pos??'—')}`);button.type='button';button.classList.toggle('active',player===active);button.setAttribute('aria-pressed',String(player===active));button.onclick=()=>{active=player;this.focusId=player.id;drawList();drawEditor()};list.append(button)
   }if(!list.children.length)list.append(node('p','','No matching players.'))};
   const drawEditor=()=>{
    editor.replaceChildren();if(!active){editor.append(node('h2','','No players on this team'));return}
    const player=active,base=path(player);editor.append(node('h2','',name(player)),node('p','roster-player-id',`Player ID ${player.id} · Team ID ${player.tid}`));
    const moveRow=node('div','roster-move'),target=node('select'),button=node('button','primary','Move player');target.setAttribute('aria-label','Destination team');
    for(const [index,other]of league.teams.entries())if(index!==teamIndex){const option=node('option','',`${other.city?other.city+' ':''}${other.name}`);option.value=String(index);target.append(option)}
    button.type='button';button.disabled=!target.options.length;button.onclick=()=>move(teamIndex,Number(target.value),player.id);
    moveRow.append(target,button);editor.append(node('h3','','Move to another team'),moveRow);
    const identity=node('div','roster-fields');editor.append(node('h3','','Player Details'),identity);
    for(const [key,title]of [['fn','First name'],['ln','Last name'],['tag','Nickname']])if(key in player)input(identity,title,player[key],value=>commit(player,key,value));
    for(const [key,title]of [['num','Jersey number'],['age','Age'],['ht','Height (inches)'],['wt','Weight (pounds)'],['yrs','Years of experience'],['pot','Potential']])if(key in player)input(identity,title,player[key],value=>commit(player,key,value),{type:'number',min:0,max:key==='num'?99:999,step:1});
    if('pos'in player)select(identity,'Position',player.pos,positionNames.map((title,id)=>[id,title]),value=>commit(player,'pos',Number(value)));
    const archetypeOptions=[[0,'None'],...archetypes.map((title,index)=>[index+1,title])];
    for(const [key,title]of [['pri','Primary archetype'],['sec','Secondary archetype']])if(key in player)select(identity,title,player[key],archetypeOptions,value=>{commit(player,key,Number(value));drawEditor()});
    const attributes=node('div','roster-attributes');editor.append(node('h3','','Attributes'),node('p','','Edit the stored current and potential values. The game calculates the displayed rating.'),attributes);
    for(const [key,levels]of Object.entries(player.attributes||{})){if(!Array.isArray(levels)||levels.length<2)continue;const group=node('div','roster-attribute');group.append(node('strong','',attributeNames[key]||key));
     for(const [index,title]of ['Current','Potential'].entries())input(group,title,levels[index],value=>change([...base,'attributes',key,index],value),{type:'number',min:index===1?levels[0]:0,max:index===0?levels[1]:20,step:1});attributes.append(group)}
    const skills=node('div','roster-skills');editor.append(node('h3','','Skills'),skills);
    const refreshSkills=()=>{skills.replaceChildren();for(const [index,skill]of (player.skills||[]).entries()){
     const group=node('div','roster-skill');const available=[...new Set([...skillIds.filter(id=>!(player.skills||[]).some((entry,i)=>i!==index&&entry.id===id)),skill.id])].sort();select(group,'Skill',skill.id,available.map(id=>[id,skillNames[id]||id]),value=>change([...base,'skills',index,'id'],value));
     input(group,'Level',skill.level,value=>change([...base,'skills',index,'level'],value),{type:'number',min:0,max:99,step:1});
     input(group,'XP Available',skill.xp,value=>change([...base,'skills',index,'xp'],value),{type:'number',min:0,max:999999,step:1});
     const equipped=node('label','roster-check'),check=node('input');check.type='checkbox';check.checked=!!skill.equipped;check.onchange=()=>change([...base,'skills',index,'equipped'],check.checked);equipped.append(check,' Equipped');group.append(equipped);
     const remove=node('button','','Remove skill');remove.type='button';remove.onclick=()=>{change([...base,'skills'],player.skills.filter((_,i)=>i!==index));refreshSkills()};group.append(remove);skills.append(group)
    }const add=node('button','','Add skill');add.type='button';const nextSkill=skillIds.find(id=>!(player.skills||[]).some(skill=>skill.id===id));add.disabled=!nextSkill;add.onclick=()=>{change([...base,'skills'],[...(player.skills||[]),{id:nextSkill,xp:0,level:1,equipped:false}]);refreshSkills()};skills.append(add)};refreshSkills();
   };
   search.oninput=drawList;drawList();drawEditor();
  }
 };
})();
