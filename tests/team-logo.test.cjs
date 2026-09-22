const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');

test('letter sprites map all three palette entries exactly and refresh team colors',async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage();
  const root=path.resolve(__dirname,'..');
  const sprite='data:image/png;base64,'+fs.readFileSync(path.join(root,'player-assets/team-letters.png')).toString('base64');
  await page.addScriptTag({content:fs.readFileSync(path.join(root,'team-logo.js'),'utf8').replace('./player-assets/team-letters.png',sprite)});
  const result=await page.evaluate(async sprite=>{
   const source=new Image();source.src=sprite;await source.decode();
   const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
   const ctx=canvas.getContext('2d');ctx.drawImage(source,0,0);
   const team={name:'A',teamColors:['E12345','32C678','9876AB']};
   const icon=HLSTeamLogo.create(team);document.body.append(icon);
   await new Promise(resolve=>setTimeout(resolve,100));
   const seen=new Set();let mismatches=0;
   for(const colors of [team.teamColors,['ABCDEF','FEDCBA','123456']]){
    team.teamColors=colors;
    for(let letter=0;letter<26;letter++){
     team.name=String.fromCharCode(65+letter);icon.syncTeamLogo();
     const original=ctx.getImageData(letter%8*32,Math.floor(letter/8)*32,32,32).data;
     const actual=icon.querySelector('canvas').getContext('2d').getImageData(0,0,32,32).data;
     const palette={'147dff':colors[0],'0aafff':colors[1],'05c8ff':colors[2]};
     for(let i=0;i<original.length;i+=4){
      if(!original[i+3])continue;
      const hex=Array.from(original.slice(i,i+3),x=>x.toString(16).padStart(2,'0')).join('');
      seen.add(hex);
      const expected=palette[hex]||hex;
      const rendered=Array.from(actual.slice(i,i+3),x=>x.toString(16).padStart(2,'0')).join('');
      if(rendered!==expected.toLowerCase()||actual[i+3]!==original[i+3])mismatches++;
     }
    }
   }
   return {seen:[...seen],mismatches};
  },sprite);
  assert.equal(result.mismatches,0);
  for(const color of ['147dff','0aafff','05c8ff'])assert(result.seen.includes(color),`Sprite must include ${color}`);
 }finally{await browser.close()}
});
