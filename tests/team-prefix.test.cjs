const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');

test('City Name is independent of team location and survives serialization',async()=>{
 const server=http.createServer((req,res)=>{
  const filename=path.join(root,new URL(req.url,'http://localhost').pathname);
  if(!filename.startsWith(root+path.sep)){res.writeHead(403).end();return}
  try{res.setHeader('Content-Type',filename.endsWith('.js')?'text/javascript':filename.endsWith('.css')?'text/css':filename.endsWith('.png')?'image/png':filename.endsWith('.json')?'application/json':'text/html');res.end(filename.endsWith('index.html')?fs.readFileSync(filename,'utf8').replace('})().catch(error=>','window.testPrefix=source=>eval(source);})().catch(error=>'):fs.readFileSync(filename))}catch{res.writeHead(404).end()}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);

  const result=await page.evaluate(()=>window.testPrefix(`(()=>{
   const team={city:'Northern Colorado',name:'Bears',location:{x:3375,y:-8439}};
   league={teams:[team],divisions:[],conferences:[]};view='team';locationSelections.clear();
   const host=document.createElement('div');document.body.append(host);renderTeamLocation(host,team,['teams',0]);
   const input=host.querySelector('input'),selects=host.querySelectorAll('select');
   const original={...team.location};input.value='Custom Prefix';input.oninput();
   const afterName={city:team.city,location:{...team.location},name:teamDisplayName(team)};
   const city=selects[2],option=[...city.options].find(o=>o.value&&Number(o.dataset.x)!==original.x);city.value=option.value;city.onchange();
   const afterLocation=JSON.parse(JSON.stringify(team));
   input.value='';input.oninput();
   return {original,afterName,afterLocation,fallback:teamDisplayName(team),selected:option.dataset.city};
  })()`));
  assert.equal(result.afterName.city,'Custom Prefix');
  assert.deepEqual(result.afterName.location,result.original);
  assert.equal(result.afterName.name,'Custom Prefix Bears');
  assert.equal(result.afterLocation.city,'Custom Prefix');
  assert.notDeepEqual(result.afterLocation.location,result.original);
  assert.equal(result.fallback,result.selected+' Bears');
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
});
