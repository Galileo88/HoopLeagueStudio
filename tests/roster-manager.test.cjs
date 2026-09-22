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
  for(const team of template.teams)if(team.uniforms?.[0]){team.uniforms[0].jerseyNumber='01FE7A';team.uniforms[0].jerseyStripe='FE01A9';team.uniforms[0].jerseyCollar='11CCEE';team.uniforms[0].shortsStripe='7A01FE'}
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
  const skinBox=await page.getByLabel('Skin',{exact:true}).boundingBox(),hairStyleBox=await page.getByLabel('Hair style').boundingBox();
  assert(skinBox&&skinBox.width<=64,`Skin color picker should be a compact box: ${JSON.stringify(skinBox)}`);
  assert(hairStyleBox&&hairStyleBox.width>220,`Hair style selector should use the available field length: ${JSON.stringify(hairStyleBox)}`);
  const colorLayout=await Promise.all(['Skin','Eyes','Eyebrows','Hair color','Facial hair color'].map(async label=>({label,box:await page.getByLabel(label,{exact:true}).locator('..').boundingBox()})));
  const [skinField,eyeField,browField,hairColorField,facialColorField]=colorLayout.map(item=>item.box);
  assert(skinField&&eyeField&&browField&&Math.abs(skinField.y-eyeField.y)<=2&&Math.abs(skinField.y-browField.y)<=2,`Skin, Eyes, and Eyebrows should share a compact row: ${JSON.stringify(colorLayout)}`);
  assert(hairColorField&&facialColorField&&Math.abs(hairColorField.y-facialColorField.y)<=2&&hairColorField.x<facialColorField.x,`Hair color fields should sit side-by-side instead of stacking: ${JSON.stringify(colorLayout)}`);
  const hairStepper=page.getByLabel('Hair style').locator('..');
  assert.equal(await hairStepper.locator('button').count(),2);
  const hairBefore=await page.getByLabel('Hair style').inputValue(),hairNext=page.getByRole('button',{name:'Next Hair style'});
  if(await hairNext.isEnabled()){await hairNext.click();assert.notEqual(await page.getByLabel('Hair style').inputValue(),hairBefore);await page.getByRole('button',{name:'Previous Hair style'}).click()}
  const positionStepper=page.getByLabel('Position',{exact:true}).locator('..');
  assert.equal(await positionStepper.locator('button').count(),2);
  const archetypeStepper=page.getByLabel('Primary archetype').locator('..');
  assert.equal(await archetypeStepper.locator('button').count(),2);
  const attributesSection=page.locator('.roster-attributes-section'),skillsSection=page.locator('.roster-skills-section');
  assert.equal(await attributesSection.locator('summary').textContent(),'Attributes');
  assert.equal(await skillsSection.locator('summary').textContent(),'Skills');
  assert.equal(await attributesSection.evaluate(details=>details.open),false);
  assert.equal(await skillsSection.evaluate(details=>details.open),false);
  const numericFields=page.locator('.roster-player-panel input[type="number"]');
  const steppedNumericFields=page.locator('.roster-player-panel .number-control > input[type="number"]');
  assert.equal(await steppedNumericFields.count(),await numericFields.count(),'Every numeric player field should use a minus/plus stepper');
  const teamTitle=await page.locator('#subtitle').textContent();
  const teamIndex=template.teams.findIndex(team=>teamTitle.includes(team.name)&&teamTitle.includes(team.city));
  assert(teamIndex>=0,`Team not found: ${teamTitle}`);
  const playerId=Number((await page.locator('.roster-player-id').textContent()).match(/Player ID (\d+)/)?.[1]);
  const original={teamIndex,playerId,targetIndex:Number(await page.getByLabel('Destination team').inputValue()),sourceCount:template.teams[teamIndex].roster.length};
  await page.setViewportSize({width:1200,height:850});
  assert(await page.locator('#pageNav button').filter({hasText:'Manage Roster'}).isHidden());
  assert(await page.locator('#pageNav button').filter({hasText:'Team Configuration'}).isVisible());
  const teamLogoBackground=await page.locator('#teams button').first().locator('[data-team-logo="true"]').evaluate(icon=>getComputedStyle(icon).backgroundColor);
  assert.equal(teamLogoBackground,'rgba(0, 0, 0, 0)','Team logo background should be transparent');
  await page.locator('#toast').evaluate(toast=>toast.style.display='none');
  const faceFrames=await page.locator('.roster-appearance canvas').evaluate(async canvas=>{
   const samples=[];
   for(let frame=0;frame<5;frame++){
    const pixels=canvas.getContext('2d').getImageData(20,28,26,18).data;
    let eyeWhite=0;
    for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]&&pixels[i]>215&&pixels[i+1]>215&&pixels[i+2]>215)eyeWhite++;
    samples.push(eyeWhite);
    await new Promise(resolve=>setTimeout(resolve,230));
   }
   return samples;
  });
  assert(faceFrames.every(count=>count>0),`Front-facing eyes should remain visible in every idle frame: ${faceFrames}`);
  const fastAnimation=await page.locator('.roster-appearance canvas').evaluate(async canvas=>{
   const before=canvas.toDataURL();await new Promise(resolve=>setTimeout(resolve,135));return before!==canvas.toDataURL();
  });
  assert.equal(fastAnimation,true,'Player preview should advance within about 135ms');
  const previewColors=await page.locator('.roster-appearance canvas').evaluate(canvas=>{
   const pixels=canvas.getContext('2d').getImageData(0,46,64,32).data;
   let jerseyNumber=0,jerseyStripe=0,jerseyCollar=0,shortsStripe=0,rawPalette=0,minX=64,maxX=-1,minY=64,maxY=-1;
   let collarMinX=64,collarMaxX=-1,collarMinY=84,collarMaxY=-1;
   let jerseyStripeLeftLower=0,jerseyStripeRight=0,shortsStripeLeft=0,shortsStripeRight=0,shortsStripeHip=0;
   for(let i=0;i<pixels.length;i+=4){
    const r=pixels[i],g=pixels[i+1],b=pixels[i+2],a=pixels[i+3];if(!a)continue;
    const p=i/4,x=p%64,y=Math.floor(p/64)+46;
    if(r===1&&g===254&&b===122){jerseyNumber++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
    if(r===254&&g===1&&b===169){jerseyStripe++;if(x>=32)jerseyStripeRight++;else if(y>=56)jerseyStripeLeftLower++}
    if(r===17&&g===204&&b===238){jerseyCollar++;collarMinX=Math.min(collarMinX,x);collarMaxX=Math.max(collarMaxX,x);collarMinY=Math.min(collarMinY,y);collarMaxY=Math.max(collarMaxY,y)}
    if(r===122&&g===1&&b===254){shortsStripe++;if(x>=32){shortsStripeRight++;if(y>=58&&y<=66)shortsStripeHip++}else shortsStripeLeft++}
    if((g===0&&b>=100)||(b===150&&(g===100||g===150))||(r===200&&g===255&&b===255))rawPalette++;
   }
   return {jerseyNumber,jerseyStripe,jerseyCollar,shortsStripe,rawPalette,jerseyStripeLeftLower,jerseyStripeRight,shortsStripeLeft,shortsStripeRight,shortsStripeHip,collarWidth:collarMaxX>=collarMinX?collarMaxX-collarMinX+1:0,collarHeight:collarMaxY>=collarMinY?collarMaxY-collarMinY+1:0,numberWidth:maxX>=minX?maxX-minX+1:0,numberHeight:maxY>=minY?maxY-minY+1:0,numberTop:minY<84?minY:null,canvasWidth:canvas.width,canvasHeight:canvas.height};
  });
  assert.equal(previewColors.canvasWidth,64);
  assert.equal(previewColors.canvasHeight,84);
  assert(previewColors.jerseyNumber>0,`Jersey number color should be visible in preview: ${JSON.stringify(previewColors)}`);
  assert(previewColors.numberWidth<=7&&previewColors.numberHeight<=5,`High-resolution jersey number should stay compact: ${JSON.stringify(previewColors)}`);
  assert(previewColors.numberTop===null||previewColors.numberTop>=52,`Jersey number should sit below the collar area: ${JSON.stringify(previewColors)}`);
  assert(previewColors.jerseyStripe>0,`Jersey stripe color should be visible in preview: ${JSON.stringify(previewColors)}`);
  assert(previewColors.jerseyStripeRight>0,`Right jersey stripe should use the stripe color: ${JSON.stringify(previewColors)}`);
  assert.equal(previewColors.jerseyCollar,12,`Collar should contain exactly the three 2x2 sprite pixels from the collar mask: ${JSON.stringify(previewColors)}`);
  assert.equal(previewColors.collarWidth,6,`Collar should stay aligned to the six-pixel high-resolution mask width: ${JSON.stringify(previewColors)}`);
  assert.equal(previewColors.collarHeight,4,`Collar should stay aligned to the four-pixel high-resolution mask height: ${JSON.stringify(previewColors)}`);
  assert.equal(previewColors.jerseyStripeLeftLower,0,`Left jersey body stripe should match the jersey color: ${JSON.stringify(previewColors)}`);
  assert(previewColors.shortsStripe>0,`Shorts stripe color should be visible in preview: ${JSON.stringify(previewColors)}`);
  assert(previewColors.shortsStripeRight>0,`Right shorts stripe should use the stripe color: ${JSON.stringify(previewColors)}`);
  assert(previewColors.shortsStripeHip>0,`Right hip should use the shorts stripe color: ${JSON.stringify(previewColors)}`);
  assert.equal(previewColors.shortsStripeLeft,0,`Left shorts stripe should match the shorts color: ${JSON.stringify(previewColors)}`);
  assert.equal(previewColors.rawPalette,0,`Untinted sprite palette colors should not leak into uniform preview: ${JSON.stringify(previewColors)}`);
  const previewEdges=await page.locator('.roster-appearance canvas').evaluate(canvas=>{
   const context=canvas.getContext('2d'),top=context.getImageData(0,0,canvas.width,2).data,bottom=context.getImageData(0,canvas.height-2,canvas.width,2).data;
   const alpha=data=>{let count=0;for(let i=3;i<data.length;i+=4)if(data[i])count++;return count};
   return {top:alpha(top),bottom:alpha(bottom)};
  });
  assert.deepEqual(previewEdges,{top:0,bottom:0},`Player art should fit inside the taller preview without clipping: ${JSON.stringify(previewEdges)}`);
  const uniformCanvas=page.locator('.roster-appearance canvas');
  const homePreview=await uniformCanvas.evaluate(canvas=>canvas.toDataURL());
  await page.locator('.roster-uniform-tabs').getByRole('button',{name:'Road'}).click();
  assert.equal(await page.locator('.roster-accessories > summary').textContent(),'Accessories');
  assert.deepEqual(await page.locator('.roster-accessory-group > summary').allTextContents(),['Head','Arms','Legs','Shoes']);
  assert((await page.locator('.roster-accessory-group').evaluateAll(groups=>groups.every(group=>!group.open))),'Accessory subgroups should be collapsed by default');
  await page.locator('.roster-accessories > summary').click();
  assert.deepEqual(await page.getByLabel('Copy accessories destination').locator('option').allTextContents(),['Home','Alt 1','Alt 2','All other uniforms']);
  const shoesGroup=page.locator('.roster-accessory-group').filter({has:page.getByText('Shoes',{exact:true})});
  await shoesGroup.locator('summary').click();
  await page.getByLabel('Socks custom color').fill('#123456');
  await page.getByLabel('Socks custom color').dispatchEvent('input');
  await page.getByLabel('Copy accessories destination').selectOption('all');
  await page.getByRole('button',{name:'Copy to'}).click();
  const headGroup=page.locator('.roster-accessory-group').filter({has:page.getByText('Head',{exact:true})});
  await headGroup.locator('summary').click();
  assert.equal(await page.getByLabel('Head accessory').locator('..').locator('button').count(),2);
  assert.equal(await page.getByLabel('Second head accessory').locator('..').locator('button').count(),2);
  assert.notEqual(await uniformCanvas.evaluate(canvas=>canvas.toDataURL()),homePreview);
  await page.screenshot({path:path.join(root,'artifacts/roster-manager.png'),fullPage:true});
  await page.getByLabel('First name',{exact:true}).fill('Roster');
  await page.getByLabel('First name',{exact:true}).dispatchEvent('change');
  await attributesSection.locator('summary').click();
  assert.equal(await attributesSection.evaluate(details=>details.open),true);
  const jerseyNumberStepper=page.getByLabel('Jersey number').locator('..');
  assert.equal(await jerseyNumberStepper.locator('button').count(),2);
  await page.locator('.roster-attributes input[aria-label="Current"]').first().fill('15');
  await page.locator('.roster-attributes input[aria-label="Current"]').first().dispatchEvent('change');
  await page.getByLabel('Primary archetype').selectOption('2');
  await skillsSection.locator('summary').click();
  assert.equal(await skillsSection.evaluate(details=>details.open),true);
  assert.equal(await page.getByLabel('Skill',{exact:true}).first().locator('..').locator('button').count(),0);
  const skillSelect=page.getByLabel('Skill',{exact:true}).first(),skillBefore=await skillSelect.inputValue();
  if(await skillSelect.locator('option').count()>1){const nextIndex=await skillSelect.evaluate(select=>(select.selectedIndex+1)%select.options.length);await skillSelect.selectOption({index:nextIndex});assert.notEqual(await skillSelect.inputValue(),skillBefore)}
  await page.getByLabel('Level',{exact:true}).first().fill('2');
  await page.getByLabel('Level',{exact:true}).first().dispatchEvent('change');
  await page.getByRole('button',{name:'Add skill'}).click();
  assert(await page.locator('.roster-skill select option').filter({hasText:'Ball Hawk'}).count());
  const ballHawk=page.locator('.roster-skill').filter({has:page.locator('option[value="BAL"]')}).first();
  await ballHawk.getByLabel('Skill',{exact:true}).selectOption('BAL');
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
  assert(moved.accessories.every(accessory=>accessory.sockC==='123456'),`Copy to all uniforms should copy Road accessories: ${JSON.stringify(moved.accessories)}`);
  assert.equal(moved.skills.length,3);assert.equal(new Set(moved.skills.map(skill=>skill.id)).size,3);
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
});
