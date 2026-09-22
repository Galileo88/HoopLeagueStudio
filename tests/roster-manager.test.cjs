const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');

test('roster editor changes player data and moves the player without changing their ID',async()=>{
 const server=http.createServer((req,res)=>{
  const filename=path.join(root,new URL(req.url,'http://localhost').pathname);
  if(!filename.startsWith(root+path.sep)){res.writeHead(403).end();return}
  try{res.setHeader('Content-Type',filename.endsWith('.js')?'text/javascript':filename.endsWith('.css')?'text/css':filename.endsWith('.png')?'image/png':'text/html');res.end(fs.readFileSync(filename))}catch{res.writeHead(404).end()}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  const template=JSON.parse(fs.readFileSync(path.join(root,'templates/pro/ProTemplate1.txt'),'utf8'));
  await page.locator('#import').setInputFiles({name:'roster-test.txt',mimeType:'text/plain',buffer:Buffer.from(JSON.stringify(template))});
  await page.waitForFunction(()=>document.querySelector('#teams button'));
  await page.locator('#teams button').first().evaluate(button=>button.click());
  await page.locator('#pageNav button').filter({hasText:'Manage Roster'}).click();
  assert.equal(await page.getByText('Archetype and position values').count(),0);
  const teamTitle=await page.locator('#subtitle').textContent();
  const teamIndex=template.teams.findIndex(team=>teamTitle.includes(team.name)&&teamTitle.includes(team.city));
  assert(teamIndex>=0,`Team not found: ${teamTitle}`);
  const playerId=Number((await page.locator('.roster-player-id').textContent()).match(/Player ID (\d+)/)?.[1]);
  const original={teamIndex,playerId,targetIndex:Number(await page.getByLabel('Destination team').inputValue()),sourceCount:template.teams[teamIndex].roster.length};
  await page.setViewportSize({width:1200,height:850});
  assert(await page.locator('#pageNav button').filter({hasText:'Manage Roster'}).isHidden());
  assert(await page.locator('#pageNav button').filter({hasText:'Team Configuration'}).isVisible());
  await page.locator('#toast').evaluate(toast=>toast.style.display='none');
  await page.screenshot({path:path.join(root,'artifacts/roster-manager.png'),fullPage:true});
  await page.getByLabel('First name',{exact:true}).fill('Roster');
  await page.getByLabel('First name',{exact:true}).dispatchEvent('change');
  await page.locator('.roster-attributes input[aria-label="Current"]').first().fill('15');
  await page.locator('.roster-attributes input[aria-label="Current"]').first().dispatchEvent('change');
  await page.getByLabel('Primary archetype').selectOption('2');
  await page.getByLabel('Level',{exact:true}).first().fill('2');
  await page.getByLabel('Level',{exact:true}).first().dispatchEvent('change');
  await page.getByRole('button',{name:'Add skill'}).click();
  assert(await page.locator('.roster-skill select option').filter({hasText:'Ball Hawk'}).count());
  assert.equal(await page.getByLabel('First name',{exact:true}).inputValue(),'Roster');
  await page.getByLabel('Destination team').selectOption(String(original.targetIndex));
  await page.getByRole('button',{name:'Move player'}).click();
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export').evaluate(button=>button.click())]);
  const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  const moved=exported.teams[original.targetIndex].roster.find(player=>player.id===original.playerId);
  assert.equal(exported.teams[original.teamIndex].roster.length,original.sourceCount-1);
  assert.equal(exported.teams[original.teamIndex].roster.some(player=>player.id===original.playerId),false);
  assert.equal(moved.id,original.playerId);assert.equal(moved.tid,template.teams[original.targetIndex].id);
  assert.equal(moved.fn,'Roster');assert.equal(moved.attributes.LAY[0],15);assert.equal(moved.pri,2);assert.equal(moved.skills[0].level,2);
  assert.equal(moved.skills.length,3);assert.equal(new Set(moved.skills.map(skill=>skill.id)).size,3);
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
});
