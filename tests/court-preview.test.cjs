const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');

test('court preview renders extracted layers and updates colors, patterns and lines',async()=>{
 const server=http.createServer((req,res)=>{
  const filename=path.join(root,new URL(req.url,'http://localhost').pathname);
  if(!filename.startsWith(root+path.sep)){res.writeHead(403).end();return}
  try{res.setHeader('Content-Type',filename.endsWith('.png')?'image/png':filename.endsWith('.js')?'text/javascript':'text/html');res.end(fs.readFileSync(filename))}catch{res.writeHead(404).end()}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});
  const page=await browser.newPage({viewport:{width:1200,height:850}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  // Use a real exported court with local images to make the rendering check deterministic.
  const sample=JSON.parse(fs.readFileSync(path.join(root,'templates/pro/ProTemplate1.txt'),'utf8'));
  const team=sample.teams[0];team.logoURL='';team.court.overlayURL='';
  await page.evaluate(team=>{
   window.previewTeam=team;const host=document.createElement('div');host.id='test-preview';host.style='width:1000px;background:#071b2e;padding:20px;color:white';document.body.prepend(host);
   window.preview=HLSCourtPreview.mount(host,()=>previewTeam);
  },team);
  await page.waitForFunction(()=>document.querySelector('#test-preview p').textContent.startsWith('Court preview'));
  const canvasImage=()=>page.locator('#test-preview canvas').evaluate(canvas=>canvas.toDataURL());
  assert(await page.locator('#test-preview canvas').evaluate(canvas=>canvas.width>=1024),'Builder should preserve source resolution');
  await page.evaluate(async()=>{previewTeam.name='Warriors';previewTeam.court.logoSize=2;previewTeam.court.logoLayer=1;await preview.syncCourtPreview()});
  const withLetter=await canvasImage();
  await page.evaluate(async()=>{previewTeam.court.logoSize=0;await preview.syncCourtPreview()});
  assert.notEqual(await canvasImage(),withLetter,'Generated letter should appear at center court');
  await page.evaluate(async()=>{previewTeam.court.logoSize=2;previewTeam.teamColors=['FF0000','00FF00','0000FF'];await preview.syncCourtPreview()});
  assert.notEqual(await canvasImage(),withLetter,'Generated court logo should update with team colors');
  await page.evaluate(async team=>{window.previewTeam=team;await preview.syncCourtPreview()},team);
  const before=await canvasImage();
  await page.evaluate(async()=>{previewTeam.court.outerWood='flat';previewTeam.court.outerWoodC='FF0000';await preview.syncCourtPreview()});
  const after=await canvasImage();assert.notEqual(before,after);
  for(const pattern of ['flat','lines','tiled','parquet','combs']){
   for(const style of [0,1,2]){
    const status=await page.evaluate(async({pattern,style})=>{
     for(const key of ['outerWood','innerWood','outerFT','innerFT','outerKey','innerKey'])previewTeam.court[key]=pattern;
     previewTeam.court.threePointLine=style;await preview.syncCourtPreview();return document.querySelector('#test-preview p').textContent;
    },{pattern,style});
    assert(status.startsWith('Court preview'),`${pattern}/${style}: ${status}`);
   }
  }
  await page.evaluate(async team=>{window.previewTeam=team;await preview.syncCourtPreview()},team);
  const beforeHoopColor=await page.locator('#test-preview canvas').evaluate(canvas=>canvas.toDataURL());
  await page.evaluate(async()=>{previewTeam.court.hoopBase='00FF00';await preview.syncCourtPreview()});
  assert.notEqual(await page.locator('#test-preview canvas').evaluate(canvas=>canvas.toDataURL()),beforeHoopColor);
  await page.evaluate(async team=>{window.previewTeam=team;await preview.syncCourtPreview()},team);
  await page.locator('#test-preview').screenshot({path:path.join(root,'artifacts/court-reference/preview.png')});
  await page.locator('#import').setInputFiles({name:'court-test.txt',mimeType:'text/plain',buffer:Buffer.from(JSON.stringify(sample))});
  await page.waitForTimeout(300);
  assert((await page.locator('#teams button').count())>0,JSON.stringify({errors,toast:await page.locator('#toast').textContent()}));
  await page.locator('#teams button').first().click();
  await page.locator('#content summary').filter({hasText:/^Court$/}).click();
  await page.waitForFunction(()=>document.querySelector('#content .court-preview-note')?.textContent.startsWith('Court preview'));
  const beforeChange=await page.locator('#content .court-preview canvas').evaluate(canvas=>canvas.toDataURL());
  await page.locator('#content select').filter({has:page.locator('option', {hasText:'College'})}).evaluateAll(selects=>{
   const input=selects.find(node=>{const path=JSON.parse(node.dataset.path||'[]');return path.at(-2)==='court'&&path.at(-1)==='threePointLine'});
   if(!input)throw Error('Court setting missing');input.value='1';input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.waitForFunction(()=>document.querySelector('#content .court-preview-note')?.textContent.startsWith('Court preview'));
  assert.notEqual(await page.locator('#content .court-preview canvas').evaluate(canvas=>canvas.toDataURL()),beforeChange);
  const beforeOverlay=await page.locator('#content .court-preview canvas').evaluate(canvas=>canvas.toDataURL());
  const overlayData='data:image/png;base64,'+fs.readFileSync(path.join(root,'court/outer-court.png')).toString('base64');
  await page.locator('#content input[data-path]').evaluateAll((inputs,url)=>{
   const input=inputs.find(node=>{const path=JSON.parse(node.dataset.path);return path.at(-1)==='overlayURL'&&path.at(-2)==='court'});
   if(!input)throw Error('Court overlay URL field missing');input.value=url;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
  },overlayData);
  assert.equal(await page.locator('#content .court-overlay-image-preview').count(),0);
  await page.waitForFunction(previous=>document.querySelector('#content .court-preview canvas')?.toDataURL()!==previous,beforeOverlay);
  const overlayBefore=await page.locator('#content .court-preview canvas').evaluate(canvas=>canvas.toDataURL());
  await page.locator('#content input[data-path]').evaluateAll(inputs=>{
   const input=inputs.find(node=>{const path=JSON.parse(node.dataset.path);return path.at(-1)==='hoopBase'&&path.at(-2)==='court'});
   if(!input)throw Error('Hoop base field missing');input.value='00FF00';input.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.waitForFunction(previous=>document.querySelector('#content .court-preview canvas')?.toDataURL()!==previous,overlayBefore);
  await page.locator('#content .court-preview').screenshot({path:path.join(root,'artifacts/court-reference/overlay-preview.png')});
  await page.setViewportSize({width:1800,height:1000});
  await page.locator('.court-editor-tabs').getByRole('button',{name:'Court text',exact:true}).click();
  const textPanel=page.locator('.court-editor-panel[aria-label="Court text"]');
  assert(await textPanel.isVisible());
  const boxes=await textPanel.locator(':scope > .field').evaluateAll(fields=>fields.map(field=>{const r=field.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width}}));
  assert.equal(boxes[0].y,boxes[1].y);assert(boxes[1].x>boxes[0].x);
  assert.equal(await page.locator('.court-editor-nav').isVisible(),false);
  await page.locator('.court-editor').screenshot({path:path.join(root,'artifacts/court-reference/desktop-builder.png')});
  await page.setViewportSize({width:390,height:844});
  assert(await page.locator('.court-editor-nav').isVisible());
  assert.equal(await page.locator('.court-editor-tabs').isVisible(),false);
  assert.equal(await page.getByRole('combobox',{name:'Court settings group',exact:true}).inputValue(),'6');
  await page.keyboard.press('Escape');await page.waitForTimeout(350);
  await page.locator('.court-editor').evaluate(editor=>editor.scrollIntoView({block:'start'}));
  await page.screenshot({path:path.join(root,'artifacts/court-reference/mobile-builder.png')});
  const [width,height]=await page.locator('#content .court-preview canvas').evaluate(canvas=>{const rect=canvas.getBoundingClientRect();return [rect.width,rect.height]});
  assert(width>0&&width<=321);assert(Math.abs(width/height-321/161)<0.01);
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
});
