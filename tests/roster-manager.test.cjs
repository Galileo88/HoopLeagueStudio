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
  // Use a unique number color so the preview test can distinguish the drawn jersey digits
  // from the team's other uniform colors.
  for(const team of template.teams)if(team.uniforms?.[0]){team.uniforms[0].jerseyNumber='01FE7A';team.uniforms[0].jerseyStripe='FE01A9';team.uniforms[0].shortsStripe='7A01FE'}
  await page.locator('#import').setInputFiles({name:'roster-test.txt',mimeType:'text/plain',buffer:Buffer.from(JSON.stringify(template))});
  await page.waitForFunction(()=>document.querySelector('#teams button'));
  await page.locator('#teams button').first().evaluate(button=>button.click());
  await page.locator('#pageNav button').filter({hasText:'Manage Roster'}).click();
  assert.equal(await page.getByText('Archetype and position values').count(),0);
  const appearanceSettings=page.locator('.roster-appearance-settings');
  assert.equal(await appearanceSettings.locator('summary').textContent(),'Skin, eyes & hair');
  assert.equal(await appearanceSettings.evaluate(details=>details.open),false);
  await appearanceSettings.locator('summary').click();
  assert.equal(await appearanceSettings.evaluate(details=>details.open),true);
  assert(await page.getByLabel('Skin',{exact:true}).isVisible());
  const teamTitle=await page.locator('#subtitle').textContent();
  const teamIndex=template.teams.findIndex(team=>teamTitle.includes(team.name)&&teamTitle.includes(team.city));
  assert(teamIndex>=0,`Team not found: ${teamTitle}`);
  const playerId=Number((await page.locator('.roster-player-id').textContent()).match(/Player ID (\d+)/)?.[1]);
  const original={teamIndex,playerId,targetIndex:Number(await page.getByLabel('Destination team').inputValue()),sourceCount:template.teams[teamIndex].roster.length};
  await page.setViewportSize({width:1200,height:850});
  assert(await page.locator('#pageNav button').filter({hasText:'Manage Roster'}).isHidden());
  assert(await page.locator('#pageNav button').filter({hasText:'Team Configuration'}).isVisible());
  await page.locator('#toast').evaluate(toast=>toast.style.display='none');
  const faceFrames=await page.locator('.roster-appearance canvas').evaluate(async canvas=>{
   const samples=[];
   for(let frame=0;frame<5;frame++){
    const pixels=canvas.getContext('2d').getImageData(20,10,26,18).data;
    let eyeWhite=0;
    for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]&&pixels[i]>215&&pixels[i+1]>215&&pixels[i+2]>215)eyeWhite++;
    samples.push(eyeWhite);
    await new Promise(resolve=>setTimeout(resolve,230));
   }
   return samples;
  });
  assert(faceFrames.every(count=>count>0),`Front-facing eyes should remain visible in every idle frame: ${faceFrames}`);
  const previewColors=await page.locator('.roster-appearance canvas').evaluate(canvas=>{
   const pixels=canvas.getContext('2d').getImageData(0,28,64,32).data;
   let jerseyNumber=0,jerseyStripe=0,shortsStripe=0,rawPalette=0,minX=64,maxX=-1,minY=64,maxY=-1;
   for(let i=0;i<pixels.length;i+=4){
    const r=pixels[i],g=pixels[i+1],b=pixels[i+2],a=pixels[i+3];if(!a)continue;
    if(r===1&&g===254&&b===122){jerseyNumber++;const p=i/4,x=p%64,y=Math.floor(p/64)+28;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
    if(r===254&&g===1&&b===169)jerseyStripe++;
    if(r===122&&g===1&&b===254)shortsStripe++;
    if((g===0&&b>=100)||(b===150&&(g===100||g===150))||(r===200&&g===255&&b===255))rawPalette++;
   }
   return {jerseyNumber,jerseyStripe,shortsStripe,rawPalette,numberWidth:maxX>=minX?maxX-minX+1:0,numberHeight:maxY>=minY?maxY-minY+1:0,numberTop:minY<64?minY:null,canvasWidth:canvas.width};
  });
  assert.equal(previewColors.canvasWidth,64);
  assert(previewColors.jerseyNumber>0,`Jersey number color should be visible in preview: ${JSON.stringify(previewColors)}`);
  assert(previewColors.numberWidth<=7&&previewColors.numberHeight<=5,`High-resolution jersey number should stay compact: ${JSON.stringify(previewColors)}`);
  assert(previewColors.numberTop===null||previewColors.numberTop>=34,`Jersey number should sit below the collar area: ${JSON.stringify(previewColors)}`);
  assert(previewColors.jerseyStripe>0,`Jersey stripe color should be visible in preview: ${JSON.stringify(previewColors)}`);
  assert(previewColors.shortsStripe>0,`Shorts stripe color should be visible in preview: ${JSON.stringify(previewColors)}`);
  assert.equal(previewColors.rawPalette,0,`Untinted sprite palette colors should not leak into uniform preview: ${JSON.stringify(previewColors)}`);
  const uniformCanvas=page.locator('.roster-appearance canvas');
  const homePreview=await uniformCanvas.evaluate(canvas=>canvas.toDataURL());
  await page.locator('.roster-uniform-tabs').getByRole('button',{name:'Road'}).click();
  assert.equal(await page.locator('.roster-accessories > summary').textContent(),'Road accessories');
  assert.notEqual(await uniformCanvas.evaluate(canvas=>canvas.toDataURL()),homePreview);
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
  const ballHawk=page.locator('.roster-skill').filter({has:page.locator('option[value="BAL"]')}).first();
  await ballHawk.getByLabel('Skill').selectOption('BAL');
  assert.match(await ballHawk.locator('.roster-skill-description').textContent(),/catching a deflected pass/);
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
