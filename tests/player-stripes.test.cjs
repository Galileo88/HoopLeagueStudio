const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');

test('shorts stripe follows every mask pixel without coloring the jersey hem',async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();
  await page.route('http://preview.test/**',route=>{
   const name=new URL(route.request().url()).pathname;
   if(name==='/')return route.fulfill({contentType:'text/html',body:'<html></html>'});
   return route.fulfill({contentType:'image/png',body:fs.readFileSync(path.join(__dirname,'..',name))});
  });
  await page.goto('http://preview.test/');
  const script=fs.readFileSync(path.join(__dirname,'../player-preview.js'),'utf8');
  await page.addScriptTag({content:script.replace('window.HLSPlayerPreview={','window.stripeTest={body,images};window.HLSPlayerPreview={')});
  const results=await page.evaluate(async()=>{
   await Promise.all(Object.values(stripeTest.images).map(image=>image.decode()));
   const results=[];
   for(let frame=0;frame<4;frame++){
    const source=document.createElement('canvas');source.width=source.height=32;
    const ctx=source.getContext('2d');ctx.drawImage(stripeTest.images.idle,frame*32,0,32,32,0,0,32,32);
    const mask=ctx.getImageData(0,0,32,32).data;
    const output=document.createElement('canvas');output.width=output.height=32;
    stripeTest.body(output.getContext('2d'),frame,{}, {uniforms:[{jersey:'808080',shorts:'606060',jerseyStripe:'00FF00',shortsStripe:'FF00FF'}]},0);
    const pixels=output.getContext('2d').getImageData(0,0,32,32).data;
    const stripe=[],expected=[];
    for(let i=0;i<mask.length;i+=4){
     if(mask[i]===15&&mask[i+1]===150&&mask[i+2]===255&&mask[i+3])expected.push(i/4);
     if(pixels[i]===255&&pixels[i+1]===0&&pixels[i+2]===255&&pixels[i+3])stripe.push(i/4);
    }
    const hem=(32*([21,22,23,22][frame]-2)+18)*4;
    results.push({stripe,expected,hem:Array.from(pixels.slice(hem,hem+3))});
   }
   return results;
  });
  results.forEach((result,frame)=>{
   assert(result.expected.length>=4);
   assert.deepEqual(result.stripe,result.expected,`Frame ${frame}: complete stripe mask`);
   assert.deepEqual(result.hem,[70,70,70],`Frame ${frame}: jersey hem stays shaded jersey color`);
  });
 }finally{await browser.close()}
});
