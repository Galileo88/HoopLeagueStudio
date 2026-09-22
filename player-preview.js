/* Small animated player preview assembled from Hoop Land's sprite layers. */
(()=>{
 const root='./player-assets/';
 const files=['idle','head','eye-white','eye-color','brow-color','unibrow-color','hair','facial-hair','head-accessories'];
 const images={};
 for(const file of files){const image=new Image();image.src=root+file+'.png';images[file]=image}
 const hex=(value,fallback)=>/^#?[\da-f]{6}$/i.test(String(value||''))?'#'+String(value).replace('#',''):fallback;
 const color=(value,team,fallback)=>{
  const slot={PRI:0,SEC:1,TER:2}[String(value||'').toUpperCase()];
  return hex(slot===undefined?value:team?.teamColors?.[slot],fallback);
 };
 const rgb=value=>{const v=hex(value,'#ffffff');return [1,3,5].map(i=>parseInt(v.slice(i,i+2),16))};
 function shade(base,scale){return base.map(channel=>Math.max(0,Math.min(255,Math.round(channel*scale))))}
 function paint(ctx,image,sx,sy,tint){
  if(!image.complete||!image.naturalWidth)return;
  const off=document.createElement('canvas');off.width=off.height=32;
  const layer=off.getContext('2d',{willReadFrequently:true});layer.drawImage(image,sx,sy,32,32,0,0,32,32);
  if(tint){const data=layer.getImageData(0,0,32,32),base=rgb(tint);
   for(let i=0;i<data.data.length;i+=4){if(!data.data[i+3])continue;
    const [r,g,b]=data.data.slice(i,i+3);if(r<25&&g<25&&b<25)continue;
    const next=shade(base,r>230?1.1:r<190?.75:1);
    data.data[i]=next[0];data.data[i+1]=next[1];data.data[i+2]=next[2]
   }layer.putImageData(data,0,0)
  }ctx.drawImage(off,0,0)
 }
 function atlas(ctx,image,code,columns,tint,frame){const number=Number(code);if(!Number.isInteger(number)||number<1)return;
  const x=number%columns*64+(frame%2)*32,y=Math.floor(number/columns)*64;
  paint(ctx,image,x,y,tint)
 }
 const skinShades={'220,129,88':1,'215,85,66':.78,'225,174,120':1.15,'195,36,58':.65};
 const shortsStarts=[21,22,23,22];
 const numberGlyphs={
  '0':['111','101','101','101','111'],'1':['010','110','010','010','111'],
  '2':['111','001','111','100','111'],'3':['111','001','111','001','111'],
  '4':['101','101','111','001','001'],'5':['111','100','111','001','111'],
  '6':['111','100','111','101','111'],'7':['111','001','010','010','010'],
  '8':['111','101','111','101','111'],'9':['111','101','111','001','111']
 };
 function body(ctx,frame,player,team,uniformIndex){
  const image=images.idle;if(!image.complete||!image.naturalWidth)return null;
  const off=document.createElement('canvas');off.width=off.height=32;
  const layer=off.getContext('2d',{willReadFrequently:true});layer.drawImage(image,frame*32,0,32,32,0,0,32,32);
  const pixels=layer.getImageData(0,0,32,32),source=new Uint8ClampedArray(pixels.data);
  const skinColor=hex(player.appearance?.skinC,'#dc8158'),skin=rgb(skinColor);
  const uniform=team?.uniforms?.[uniformIndex]||team?.uniforms?.[0]||{};
  const gear=player.accessories?.[uniformIndex]||player.accessories?.[0]||{};
  const jersey=rgb(color(uniform.jersey,team,'#147dff')),shorts=rgb(color(uniform.shorts,team,'#147dff'));
  const jerseyStripe=rgb(color(uniform.jerseyStripe,team,color(uniform.jersey,team,'#147dff')));
  const shortsStripe=rgb(color(uniform.shortsStripe,team,color(uniform.shorts,team,'#147dff')));
  const shortsStart=shortsStarts[frame]??22;
  const uniformRows=Array.from({length:32},()=>({min:32,max:-1}));
  for(let i=0;i<source.length;i+=4){const r=source[i],b=source[i+2],a=source[i+3];if(!a||b!==255||r>40)continue;const pixel=Math.floor(i/4),x=pixel%32,y=Math.floor(pixel/32),row=uniformRows[y];row.min=Math.min(row.min,x);row.max=Math.max(row.max,x)}
  const gearRgb=(key,fallback)=>rgb(color(gear[key],team,fallback));
  const accessory={
   L_Shoulder:gearRgb('L_Shoulder',skinColor),R_Shoulder:gearRgb('R_Shoulder',skinColor),
   L_Elbow:gearRgb('L_Elbow',skinColor),R_Elbow:gearRgb('R_Elbow',skinColor),
   L_Wrist:gearRgb('L_Wrist',skinColor),R_Wrist:gearRgb('R_Wrist',skinColor),
   L_Knee:gearRgb('L_Knee',skinColor),R_Knee:gearRgb('R_Knee',skinColor),
   L_Shin:gearRgb('L_Shin',skinColor),R_Shin:gearRgb('R_Shin',skinColor),
   sockC:gearRgb('sockC','#ffffff'),shoeC:gearRgb('shoeC','#ffffff'),soleC:gearRgb('soleC','#202020')
  };
  for(let i=0;i<pixels.data.length;i+=4){if(!pixels.data[i+3])continue;
   const r=source[i],g=source[i+1],b=source[i+2],pixel=Math.floor(i/4),x=pixel%32,y=Math.floor(pixel/32);
   let next;
   const skinScale=skinShades[`${r},${g},${b}`];
   if(skinScale!==undefined)next=shade(skin,skinScale);
   else if(b===255&&r<=40){
    const isShorts=y>=shortsStart,row=uniformRows[y],width=row.max-row.min+1;
    const stripe=width>=4&&(x===row.min||x===row.max);
    const target=stripe?(isShorts?shortsStripe:jerseyStripe):(isShorts?shorts:jersey);
    next=stripe?target:shade(target,Math.max(.55,Math.min(1.3,g/150)));
   }else if(b===0&&g>=120){
    const key=r<75?'L_Shoulder':r<120?'R_Shoulder':r<150?'L_Knee':'R_Knee';
    next=shade(accessory[key],Math.max(.6,Math.min(1.2,g/175)));
   }else if(g===0&&b>=100){
    const key=r<90?'L_Elbow':r<130?'R_Elbow':r<160?'L_Shin':'R_Shin';
    next=shade(accessory[key],Math.max(.6,Math.min(1.2,b/200)));
   }else if(b===150&&g>=100){
    const key=r<100?'L_Wrist':r<150?'R_Wrist':'sockC';
    next=shade(accessory[key],Math.max(.6,Math.min(1.1,g/150)));
   }else if(r===200&&g===255&&b===255)next=accessory.shoeC;
   else if(r===205&&g===172&&b===190)next=accessory.soleC;
   if(next){pixels.data[i]=next[0];pixels.data[i+1]=next[1];pixels.data[i+2]=next[2]}
  }
  layer.putImageData(pixels,0,0);ctx.drawImage(off,0,0);
  return {uniform,shortsStart}
 }
 function jerseyNumber(ctx,player,team,uniform,shortsStart,scale){
  const value=Number(player.num);if(!Number.isInteger(value)||value<0)return;
  const text=String(value).slice(-2),width=text.length*3+(text.length-1);
  // The player sprite is rendered at 2x internally, but the number uses 1px
  // high-resolution cells. This keeps the chest number half the old visual size
  // while remaining crisp when the preview is enlarged with pixel rendering.
  const startX=Math.floor((ctx.canvas.width-width)/2),startY=shortsStart*scale-7.5;
  ctx.fillStyle=color(uniform?.jerseyNumber,team,color(uniform?.jerseyStripe,team,'#ffffff'));
  for(const [index,digit]of [...text].entries()){
   const glyph=numberGlyphs[digit];if(!glyph)continue;
   for(let y=0;y<glyph.length;y++)for(let x=0;x<3;x++)if(glyph[y][x]==='1')ctx.fillRect(startX+index*4+x,startY+y,1,1)
  }
 }
 function draw(canvas,player,team,uniformIndex,frame){
  const ctx=canvas.getContext('2d'),scene=document.createElement('canvas');scene.width=scene.height=32;
  const sceneCtx=scene.getContext('2d'),appearance=player.appearance||{},gear=player.accessories?.[uniformIndex]||player.accessories?.[0]||{};
  const bodyState=body(sceneCtx,frame,player,team,uniformIndex);
  // The idle sheet has four front-facing motion frames across its first row.
  // Head layers are anchored eight pixels lower in their own 32px cells.
  sceneCtx.save();sceneCtx.translate(0,[-8,-7,-6,-7][frame]);
  paint(sceneCtx,images.head,0,0,hex(appearance.skinC,'#dc8158'));
  paint(sceneCtx,images['eye-white'],0,0);
  paint(sceneCtx,images['eye-color'],0,0,hex(appearance.eyeC,'#472d3c'));
  paint(sceneCtx,images['brow-color'],0,0,hex(appearance.browC,'#262539'));
  if(appearance.unibrow)paint(sceneCtx,images['unibrow-color'],0,0,hex(appearance.browC,'#262539'));
  atlas(sceneCtx,images['facial-hair'],appearance.fHair,8,hex(appearance.fHairC,'#262539'),0);
  atlas(sceneCtx,images.hair,appearance.hair,16,hex(appearance.hairC,'#262539'),0);
  if(gear.headAcc!=='none')atlas(sceneCtx,images['head-accessories'],gear.headAcc,8,color(gear.headAccC,team,'#ffffff'),0);
  atlas(sceneCtx,images['head-accessories'],gear.headAcc2,8,color(gear.headAcc2C,team,'#ffffff'),0);
  sceneCtx.restore();
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
  ctx.drawImage(scene,0,0,32,32,0,0,canvas.width,canvas.height);
  if(bodyState)jerseyNumber(ctx,player,team,bodyState.uniform,bodyState.shortsStart,canvas.width/32)
 }
 window.HLSPlayerPreview={
  mount(canvas,state){let frame=0;
   const redraw=()=>{if(canvas.isConnected){const {player,team,uniformIndex}=state();draw(canvas,player,team,uniformIndex,frame)}};
   const tick=()=>{if(!canvas.isConnected)return;redraw();frame=(frame+1)%4;setTimeout(tick,220)};
   tick();return redraw
  }
 };
})();
