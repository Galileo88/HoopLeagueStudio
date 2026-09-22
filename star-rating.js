/* Hoop Land 1.09.75 league-editor ratings; see docs/ratings.md. */
(()=>{
 const keys=['LAY','DNK','INS','MID','TPT','FTS','DRB','PAS','ORE','DRE','STL','BLK'];
 const f=Math.fround,clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 const value=(p,key,index)=>p?.attributes?.[key]?.[index];
 const valid=(p,index)=>keys.every(key=>Number.isInteger(value(p,key,index))&&value(p,key,index)>=0&&value(p,key,index)<=20);
 function player(p,index=0){
  if(!valid(p,index))return null;
  const total=keys.reduce((n,key)=>n+value(p,key,index),0);
  return f(clamp(f(f(clamp(total,0,168)-28)/140),.1,1)*5);
 }
 function component(p,index,weights){
  let total=0;
  for(const [key,weight]of weights)total=f(total+f(f(value(p,key,index)/20)*weight));
  return f(total/6);
 }
 const offense=[['LAY',.5],['DNK',1.5],['INS',1],['MID',1],['TPT',2],['FTS',.5],['DRB',1.5],['PAS',1],['ORE',1]];
 const defense=[['DRE',3],['STL',3],['BLK',4]];
 function teamDetails(t,index=0){
  const roster=t?.roster;
  if(!Array.isArray(roster))return null;
  if(roster.length<5)return {offense:0,defense:0,overall:0};
  let off=0,def=0,weightSum=0;
  for(const p of roster){
   if(!Number.isInteger(p.linePos))return null;
   const weight=p.linePos<5?66:p.linePos<10?33:0;
   if(!weight)continue;
   if(!valid(p,index))return null;
   off=f(off+f(component(p,index,offense)*weight));
   def=f(def+f(component(p,index,defense)*weight));
   weightSum=f(weightSum+weight);
  }
  if(!weightSum)return null;
  off=f(off/weightSum);def=f(def/weightSum);
  return {offense:off,defense:def,overall:f(f(f(off*3)+def)*.25)};
 }
 const stars=rating=>Number.isFinite(rating)?f(clamp(rating,0,1)*5):null;
 const team=(t,index=0)=>stars(teamDetails(t,index)?.overall);
 function rankings(teams,t){
  if(!teams.includes(t))return null;
  const entries=teams.map((team,index)=>({team,index,ratings:teamDetails(team)}));
  if(entries.some(entry=>!entry.ratings))return null;
  return Object.fromEntries(['offense','defense','overall'].map(key=>{
   const sorted=[...entries].sort((a,b)=>b.ratings[key]-a.ratings[key]||a.index-b.index);
   return [key,sorted.findIndex(entry=>entry.team===t)+1];
  }));
 }
 const ordinal=n=>n+((n%100>=11&&n%100<=13)?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th'));
 function createTeamSummary(t,getTeams){
  const root=document.createElement('div');root.className='team-ratings';root.dataset.starRating='true';
  const fields=['offense','defense','overall'].map(key=>{
   const card=document.createElement('div');card.className='team-rating-card';
   const label=document.createElement('strong');label.textContent=key[0].toUpperCase()+key.slice(1);
   const rating=create(()=>stars(teamDetails(t)?.[key]),label.textContent+' rating');
   const rank=document.createElement('span');rank.className='team-rating-rank';card.append(label,rating,rank);root.append(card);
   return {key,rating,rank};
  });
  root.syncRating=()=>{const teams=getTeams(),ranks=rankings(teams,t);for(const field of fields){field.rating.syncRating();field.rank.textContent=ranks?ordinal(ranks[field.key]):'—';field.rank.title=ranks?`${ordinal(ranks[field.key])} of ${teams.length} league teams · Saved lineup`:teams.includes(t)?'Rank unavailable':'Not league-ranked'}};
  root.syncRating();return root;
 }
 function create(getRating,label='Rating'){
  const root=document.createElement('span');root.className='star-rating';root.dataset.starRating='true';root.setAttribute('role','img');
  const track=document.createElement('span');track.className='star-rating-track';track.textContent='★★★★★';track.setAttribute('aria-hidden','true');
  const fill=document.createElement('span');fill.className='star-rating-fill';fill.textContent='★★★★★';track.append(fill);root.append(track);
  root.syncRating=()=>{const rating=getRating(),known=Number.isFinite(rating);root.hidden=!known;fill.style.width=(known?clamp(rating,0,5)*20:0)+'%';const text=`${label}: ${known?Number(rating.toFixed(2))+' out of 5':'unavailable'}`;root.setAttribute('aria-label',text);root.title=text+(label==='Team rating'?' · Saved lineup':'')};
  root.syncRating();return root;
 }
 const api={player,team,teamDetails,rankings,create,createTeamSummary};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(typeof window!=='undefined')window.HLSRatings=api;
})();
