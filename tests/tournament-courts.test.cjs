const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
test('college tournament cards reuse the editor, preserve rounds, fall back and resize',async()=>{
 const root=path.resolve(__dirname,'..');
 const server=http.createServer((req,res)=>{const file=path.join(root,new URL(req.url,'http://localhost').pathname);try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.png')?'image/png':'text/html');res.end(file.endsWith('index.html')?fs.readFileSync(file,'utf8').replace('function tournamentCourt(round)','window.__test={getLeague:()=>league,set,render};function tournamentCourt(round)'):fs.readFileSync(file))}catch{res.writeHead(404).end()}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  const data=JSON.parse(fs.readFileSync(path.join(root,'templates/pro/ProTemplate1.txt'),'utf8'));data.leagueType=1;data.logoURL='';data.teams[0].logoURL='';data.teams[0].court.overlayURL='';
  await page.locator('#import').setInputFiles({name:'college.txt',mimeType:'text/plain',buffer:Buffer.from(JSON.stringify(data))});
  const cards=page.locator('.tournament-court-card');await cards.first().waitFor({timeout:5000}).catch(async e=>{throw Error(JSON.stringify({errors,content:await page.locator('#content').innerText(),toast:await page.locator('#toast').innerText()})+e.message)});
  assert.deepEqual(await page.locator('.tournament-court-label').allTextContents(),['First Round','Second Round','Top 16','Top 8','Top 4','Championship']);
  for(const [width,columns]of [[1440,3],[900,2],[390,1]]){
   await page.setViewportSize({width,height:900});
   assert.equal(await page.locator('.tournament-court-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),columns);
   assert(await cards.first().locator('canvas').evaluate(c=>Math.abs(c.clientWidth/c.clientHeight-321/161)<.03));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.setViewportSize({width:1440,height:900});
  if(process.env.TOURNAMENT_SCREENSHOT)await page.locator('#tournament-courts').screenshot({path:process.env.TOURNAMENT_SCREENSHOT});
  for(const round of ['firstRound','secondRound','top16','top8','top4','championship']){
   const card=page.locator(`[data-round="${round}"]`);await card.scrollIntoViewIfNeeded();const before=await page.evaluate(()=>scrollY);await card.click();
   await page.locator('#tournament-courts summary').filter({hasText:/^Wood$/}).click();
   assert.equal(await page.evaluate(round=>window.__test.getLeague().tournamentCourts[round].outerWoodC,round),data.teams[0].court.outerWoodC);
   await page.locator('#tournament-courts [data-path]').evaluateAll((fields,round)=>{const input=fields.find(n=>n.dataset.path===JSON.stringify(['tournamentCourts',round,'outerWoodC']));input.value='123456';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}))},round);
   await page.getByRole('button',{name:'Save court',exact:true}).click();await cards.first().waitFor({timeout:5000}).catch(async e=>{throw Error(JSON.stringify({errors,content:await page.locator('#content').innerText(),toast:await page.locator('#toast').innerText()})+e.message)});
   assert.equal(await page.evaluate(round=>window.__test.getLeague().tournamentCourts[round].outerWoodC,round),'123456');
   assert(Math.abs(await page.evaluate(()=>scrollY)-before)<5);
  }
  assert.equal(await page.evaluate(()=>window.__test.getLeague().teams[0].court.outerWoodC),data.teams[0].court.outerWoodC);
  await cards.first().click();await page.getByRole('button',{name:'Back',exact:true}).click();
  assert.equal(await cards.count(),6);
  await page.evaluate(()=>{window.__test.set(['leagueType'],0);window.__test.render()});assert.equal(await cards.count(),0);
  await page.evaluate(()=>{window.__test.set(['leagueType'],1);window.__test.render()});assert.equal(await cards.count(),6);
  assert.equal(await page.evaluate(()=>JSON.parse(JSON.stringify(window.__test.getLeague())).tournamentCourts.championship.outerWoodC),'123456');
  await page.evaluate(()=>{delete window.__test.getLeague().tournamentCourts;window.__test.render()});await cards.first().click();await page.getByRole('button',{name:'Back',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__test.getLeague().tournamentCourts?.firstRound),undefined);
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
});


