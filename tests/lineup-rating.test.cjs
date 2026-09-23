const {test}=require('node:test');
const assert=require('node:assert/strict');
const ratings=require('../star-rating.js');
const fixtures=require('./fixtures/native-lineups.json');

test('exhibition lineup repair matches native order for 32 teams and six position extremes',()=>{
 for(const [index,fixture] of fixtures.entries()){
  const before=JSON.stringify(fixture.team),result=ratings.prepareTeam(fixture.team);
  assert.deepEqual(result.roster.map(p=>p.id),fixture.nativeOrder,`native lineup ${index}`);
  assert.equal(JSON.stringify(fixture.team),before,'derived ratings must not change exports');
  assert.deepEqual(result.roster.map(p=>p.linePos),result.roster.map((_,i)=>i));
 }
});

test('depth-chart rebuild uses current overall for existing valid lineups',()=>{
 const keys=['LAY','DNK','INS','MID','TPT','FTS','DRB','PAS','ORE','DRE','STL','BLK'];
 const attributes=value=>Object.fromEntries(keys.map(key=>[key,[value,value]]));
 const makePlayer=(id,pos,current,pot,linePos)=>({id,pos,ht:78,pot,linePos,teamPos:pos,posRnk:0,minutes:[0,0,0,0,0,0],attributes:attributes(current)});
 const team={roster:[
  makePlayer(2,0,5,10,0),
  makePlayer(3,2,10,5,1),
  makePlayer(4,4,10,5,2),
  makePlayer(5,6,10,5,3),
  makePlayer(6,8,10,5,4),
  makePlayer(1,0,15,1,5)
 ],startingLineup:[]};
 assert.equal(ratings.rebuildLineups({teams:[team]}),1);
 assert(team.roster.find(player=>player.id===1).linePos<5,'higher current overall should replace a weaker valid starter');
 assert(team.roster.find(player=>player.id===2).linePos>4,'higher potential alone should not keep a valid starting spot');
 const saved=JSON.stringify(team);assert.equal(ratings.rebuildLineups({teams:[team]}),0);assert.equal(JSON.stringify(team),saved);
});

test('Ashland ranks consistently against the entire prepared league',()=>{
 const teams=fixtures.slice(0,32).map(f=>f.team),ashland=teams[1];
 assert.deepEqual(ratings.rankings(teams,ashland),{offense:17,defense:10,overall:10});
 const detail=ratings.exhibitionDetails(ashland);
 assert(Math.abs(detail.offense*5-4.5541665)<1e-6);
 assert(Math.abs(detail.defense*5-4.1916665)<1e-6);
 assert(Math.abs(detail.overall*5-4.4635415)<1e-6);
});

test('valid lineups are preserved, edits recompute, and missing preparation data remains safe',()=>{
 const team=structuredClone(fixtures[1].team),prepared=ratings.prepareTeam(team);
 assert.deepEqual(ratings.prepareTeam(prepared).roster.map(p=>p.id),prepared.roster.map(p=>p.id));
 const before=ratings.team(team);
 for(const p of team.roster)for(const pair of Object.values(p.attributes))pair[0]=1;
 assert.notEqual(ratings.team(team),before);
 delete team.roster[0].ht;
 assert.equal(ratings.prepareTeam(team),team);
 assert.equal(ratings.team({roster:[]}),0);
});

test('league rebuilding persists coherent lineup slots and is stable on reload',()=>{
 const data={teams:structuredClone(fixtures.slice(0,32).map(f=>f.team))};
 assert.equal(ratings.rebuildLineups(data),32);
 for(const team of data.teams){
  assert.deepEqual(team.startingLineup.map(s=>[s.pid,s.linePos]),team.roster.map(p=>[p.id,p.linePos]));
  assert.equal(team.roster.filter(p=>p.linePos<5).length,5);
 }
 const saved=JSON.stringify(data);assert.equal(ratings.rebuildLineups(data),0);assert.equal(JSON.stringify(data),saved);
 const rebuiltRanks=ratings.rankings(data.teams,data.teams[1]);assert(rebuiltRanks);for(const rank of Object.values(rebuiltRanks))assert(rank>=1&&rank<=data.teams.length);
 const generated=structuredClone(fixtures[1].team);generated.roster.forEach((p,i)=>p.linePos=i);
 assert(ratings.rebuildLineups({teams:[generated]},true)>0);
});
