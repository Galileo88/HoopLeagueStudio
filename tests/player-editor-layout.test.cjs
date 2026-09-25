const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');

test('player preview follows scrolling and accessory boxes retain independent heights',async()=>{
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

  await page.setViewportSize({width:1900,height:1000});
  await page.locator('.roster-accessories > summary').click();
  const arms=page.locator('.roster-accessory-group').filter({has:page.locator('summary',{hasText:/^Arms$/})});
  await arms.locator('summary').click();
  const head=page.locator('.roster-accessory-group').filter({has:page.locator('summary',{hasText:/^Head$/})});
  assert((await head.boundingBox()).height<70);
  assert((await arms.boundingBox()).height>100);
  await arms.evaluate(el=>el.scrollIntoView({block:'center'}));
  const preview=page.locator('.roster-appearance-preview');
  assert((await preview.locator('canvas').boundingBox()).width>=280);
  const desktop=await preview.boundingBox();assert(desktop.y>=0&&desktop.y+desktop.height<=1000);
  assert((await preview.boundingBox()).x<(await page.locator('.roster-player-controls').boundingBox()).x);
  await page.screenshot({path:path.join(root,'artifacts/player-editor-desktop.png')});
  await page.setViewportSize({width:390,height:844});await page.keyboard.press('Escape');await page.waitForTimeout(350);
  await arms.evaluate(el=>el.scrollIntoView({block:'center'}));
  assert((await preview.locator('canvas').boundingBox()).width>=140);
  const mobile=await preview.boundingBox(),header=await page.locator('header').boundingBox();
  assert(mobile.y>=header.y+header.height-1);assert(mobile.y+mobile.height<844);
  assert(await page.getByRole('button',{name:'Home',exact:true}).isVisible());
  await page.screenshot({path:path.join(root,'artifacts/player-editor-mobile.png')});
  await page.locator('.roster-attributes-section > summary').click();
  for(const width of [1900,390]){
   await page.setViewportSize({width,height:1000});
   await page.locator('.roster-attributes-section').evaluate(section=>window.scrollTo(0,section.getBoundingClientRect().top+window.scrollY+350));
   const bounds=await preview.boundingBox(),accessories=await page.locator('.roster-accessories').boundingBox();
   assert(bounds.y+bounds.height<=accessories.y+accessories.height+1,'Preview must stop at the end of Accessories');
   assert(bounds.y<0,'Preview must scroll away when editing Attributes');
  }
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
});
