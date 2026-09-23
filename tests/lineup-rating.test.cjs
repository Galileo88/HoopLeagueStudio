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

test('Ashland reference reproduces offense 2nd, defense 2nd and overall 1st',()=>{
 const teams=fixtures.slice(0,32).map(f=>f.team),ashland=teams[1];
 assert.deepEqual(ratings.rankings(teams,ashland),{offense:2,defense:2,overall:1});
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
