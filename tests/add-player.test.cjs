const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');

test('Add Player creates an editable free agent that survives export',async()=>{
 const server=http.createServer((req,res)=>{
  const filename=path.join(root,new URL(req.url,'http://localhost').pathname);
  if(!filename.startsWith(root+path.sep)){res.writeHead(403).end();return}
  try{res.setHeader('Content-Type',filename.endsWith('.js')?'text/javascript':filename.endsWith('.css')?'text/css':filename.endsWith('.png')?'image/png':filename.endsWith('.json')?'application/json':'text/html');res.end(fs.readFileSync(filename))}catch{res.writeHead(404).end()}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  const template=JSON.parse(fs.readFileSync(path.join(root,'templates/pro/ProTemplate1.txt'),'utf8'));
  await page.locator('#import').setInputFiles({name:'add-player-test.txt',mimeType:'text/plain',buffer:Buffer.from(JSON.stringify(template))});
  await page.waitForFunction(()=>document.querySelector('#teams button'));
  await page.locator('#leagueNav').evaluate(button=>button.click());
  const order=await page.locator('.configuration-card').evaluate(card=>{
   const summaries=[...card.querySelectorAll(':scope > details > summary')];
   return summaries.map(summary=>summary.textContent.trim()).filter(name=>/Simulation Sliders|Free Agents|Retired Numbers/.test(name));
  });
  assert.match(order[0],/Simulation Sliders/);
  assert.match(order[1],/Free Agents/);
  assert.match(order[2],/Retired Numbers/);
  await page.locator('.free-agents-editor > summary').click();
  await page.getByRole('button',{name:'Add Player'}).click();
  await page.locator('.add-player-form .roster-player-panel').waitFor();
  await page.getByLabel('First name',{exact:true}).fill('Jordan');
  await page.getByLabel('Last name',{exact:true}).fill('Example');
  await page.getByLabel('Position',{exact:true}).selectOption('2');
  await page.getByLabel('Hair style').selectOption('0002');
  await page.getByLabel('Skin').fill('#a36342');
  await page.getByLabel('Skin').dispatchEvent('input');
  await page.locator('.add-player-form .roster-attributes input[aria-label="Current"]').first().fill('9');
  await page.locator('.add-player-form .roster-attributes input[aria-label="Current"]').first().dispatchEvent('change');
  await page.locator('.add-player-form').getByRole('button',{name:'Add skill'}).click();
  await page.locator('.add-player-form .roster-skill').first().getByLabel('Skill').selectOption('BUL');
  await page.getByRole('button',{name:'Create Free Agent'}).click();
  await page.getByText('Jordan Example').first().waitFor();
  assert.match(await page.locator('#subtitle').textContent(),/unsigned players/);
  const canvas=page.locator('.roster-appearance canvas').first();
  await canvas.waitFor();
  await page.waitForFunction(()=>{const c=document.querySelector('.roster-appearance canvas');return c&&[...c.getContext('2d').getImageData(0,0,c.width,c.height).data].some((v,i)=>i%4===3&&v>0)});
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export').evaluate(button=>button.click())]);
  const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  const added=exported.freeAgents.find(player=>player.fn==='Jordan'&&player.ln==='Example');
  assert(added);
  assert(added.id>0);
  assert(!template.teams.some(team=>team.roster.some(player=>player.id===added.id)));
  assert.equal(added.tid,0);
  assert.equal(added.pos,2);
  assert.equal(added.appearance.hair,'0002');
  assert.equal(added.appearance.skinC,'A36342');
  assert.equal(added.attributes.LAY[0],9);
  assert.equal(added.skills[0].id,'BUL');
  assert(added.attributes&&added.contract&&added.accessories);
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
});
