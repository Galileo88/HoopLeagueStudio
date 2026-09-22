const {test}=require('node:test');
const assert=require('node:assert/strict');
const ratings=require('../star-rating.js');
const native=require('./fixtures/native-ratings.json');
test('team ranks use raw component scores without changing league order',()=>{
 const make=n=>({roster:Array.from({length:5},(_,linePos)=>({linePos,attributes:Object.fromEntries(Object.keys(native.players[0].player.attributes).map(key=>[key,[n,n]]))}))});
 const weak=make(6),strong=make(20),good=make(15),teams=[weak,good,strong];
 assert.equal(ratings.team(good),5);assert.equal(ratings.team(strong),5);
 assert.deepEqual(ratings.rankings(teams,strong),{offense:1,defense:1,overall:1});
 assert.deepEqual(ratings.rankings(teams,good),{offense:2,defense:2,overall:2});
 assert.deepEqual(teams,[weak,good,strong]);assert.equal(ratings.rankings(teams,make(10)),null);
 for(const fixture of native.players){
  const t={roster:Array.from({length:5},(_,linePos)=>({...fixture.player,linePos}))},detail=ratings.teamDetails(t);
  assert(Math.abs(detail.offense-fixture.nativeOffense)<1e-6);
  assert(Math.abs(detail.defense-fixture.nativeDefense)<1e-6);
 }
});
test('player and team stars match isolated native Hoop Land calculations',()=>{
 for(const fixture of native.players)assert(Math.abs(ratings.player(fixture.player)-fixture.nativePlayerStars)<1e-6);
 for(const fixture of native.teams){
  const expected=Math.fround(Math.max(0,Math.min(1,fixture.nativeTeamFraction))*5);
  assert(Math.abs(ratings.team(fixture.team)-expected)<1e-6);
 }
});
test('ratings handle missing data, caps, physical fields and excluded reserves',()=>{
 const p=structuredClone(native.players[0].player);
 for(const pair of Object.values(p.attributes))pair[0]=0;
 assert.equal(ratings.player(p),.5);
 for(const pair of Object.values(p.attributes))pair[0]=20;
 assert.equal(ratings.player(p),5);
 p.attributes.STR=[0,0];p.attributes.SPD=[20,20];p.attributes.STM=[10,10];
 assert.equal(ratings.player(p),5);
 delete p.attributes.LAY;assert.equal(ratings.player(p),null);
 assert.equal(ratings.team({roster:[]}),0);
 const t=structuredClone(native.teams[0].team),before=ratings.team(t);
 t.roster.push({linePos:10,attributes:{}});assert.equal(ratings.team(t),before);
 delete t.roster[0].linePos;assert.equal(ratings.team(t),null);
});
