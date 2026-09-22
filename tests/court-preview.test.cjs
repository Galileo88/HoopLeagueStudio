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
  const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const sample=JSON.parse(source.split('const standaloneSample=')[1].split(';')[0]);
  const team=sample.teams[0];team.logoURL='';team.court.overlayURL='';
  await page.evaluate(team=>{
   window.previewTeam=team;const host=document.createElement('div');host.id='test-preview';host.style='width:1000px;background:#071b2e;padding:20px;color:white';document.body.prepend(host);
   window.preview=HLSCourtPreview.mount(host,()=>previewTeam);
  },team);
  await page.waitForFunction(()=>document.querySelector('#test-preview p').textContent.startsWith('Floor preview'));
  const pixel=()=>page.evaluate(()=>Array.from(document.querySelector('#test-preview canvas').getContext('2d').getImageData(200,110,1,1).data));
  const before=await pixel();assert.equal(before[3],255);
  await page.evaluate(async()=>{previewTeam.court.outerWood='flat';previewTeam.court.outerWoodC='FF0000';await preview.syncCourtPreview()});
  const after=await pixel();assert(after[0]>0);assert.equal(after[1],0);assert.equal(after[2],0);assert.notDeepEqual(before,after);
  for(const pattern of ['flat','lines','tiled','parquet','combs']){
   for(const style of [0,1,2]){
    const status=await page.evaluate(async({pattern,style})=>{
     for(const key of ['outerWood','innerWood','outerFT','innerFT','outerKey','innerKey'])previewTeam.court[key]=pattern;
     previewTeam.court.threePointLine=style;await preview.syncCourtPreview();return document.querySelector('#test-preview p').textContent;
    },{pattern,style});
    assert(status.startsWith('Floor preview'),`${pattern}/${style}: ${status}`);
   }
  }
  await page.evaluate(async team=>{window.previewTeam=team;await preview.syncCourtPreview()},team);
  await page.locator('#test-preview').screenshot({path:path.join(root,'artifacts/court-reference/preview.png')});
  await page.locator('#import').setInputFiles({name:'court-test.txt',mimeType:'text/plain',buffer:Buffer.from(JSON.stringify(sample))});
  await page.locator('#teams button').first().click();
  await page.locator('#content summary').filter({hasText:/^Court$/}).click();
  await page.waitForFunction(()=>document.querySelector('#content .court-preview-note')?.textContent.startsWith('Floor preview'));
  const beforeChange=await page.locator('#content .court-preview canvas').evaluate(canvas=>canvas.toDataURL());
  await page.locator('#content select').filter({has:page.locator('option', {hasText:'College'})}).evaluateAll(selects=>{
   const input=selects.find(node=>{const path=JSON.parse(node.dataset.path||'[]');return path.at(-2)==='court'&&path.at(-1)==='threePointLine'});
   if(!input)throw Error('Court setting missing');input.value='1';input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.waitForFunction(()=>document.querySelector('#content .court-preview-note')?.textContent.startsWith('Floor preview'));
  assert.notEqual(await page.locator('#content .court-preview canvas').evaluate(canvas=>canvas.toDataURL()),beforeChange);
  await page.setViewportSize({width:390,height:844});
  assert.deepEqual(await page.locator('#content .court-preview canvas').evaluate(canvas=>{const rect=canvas.getBoundingClientRect();return [rect.width,rect.height]}),[642,322]);
  assert(await page.locator('#content .court-preview-viewport').evaluate(node=>node.clientWidth<=window.innerWidth&&node.scrollWidth>node.clientWidth));
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
});
