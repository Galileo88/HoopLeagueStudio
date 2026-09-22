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
 function body(ctx,frame,player,team,uniformIndex){
  const image=images.idle;if(!image.complete||!image.naturalWidth)return;
  const off=document.createElement('canvas');off.width=off.height=32;
  const layer=off.getContext('2d',{willReadFrequently:true});layer.drawImage(image,frame*32,32,32,32,0,0,32,32);
  const pixels=layer.getImageData(0,0,32,32),skin=rgb(hex(player.appearance?.skinC,'#dc8158'));
  const uniform=team?.uniforms?.[uniformIndex]||team?.uniforms?.[0]||{};
  const jersey=rgb(color(uniform.jersey,team,'#147dff')),shorts=rgb(color(uniform.shorts,team,'#147dff'));
  const trim=rgb(color(uniform.jerseyStripe,team,'#32af00'));
  const skinShades={'220,129,88':1,'215,85,66':.78,'225,174,120':1.15,'195,36,58':.65};
  for(let i=0;i<pixels.data.length;i+=4){if(!pixels.data[i+3])continue;
   const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2],y=Math.floor(i/4/32);
   let next;if(skinShades[`${r},${g},${b}`]!==undefined)next=shade(skin,skinShades[`${r},${g},${b}`]);
   else if(b===255&&r<=40)next=shade(y<17?jersey:shorts,Math.max(.55,Math.min(1.3,g/150)));
   else if(b===0&&g>=120)next=shade(trim,Math.max(.6,Math.min(1.2,g/175)));
   if(next){pixels.data[i]=next[0];pixels.data[i+1]=next[1];pixels.data[i+2]=next[2]}
  }
  layer.putImageData(pixels,0,0);ctx.drawImage(off,0,0)
 }
 function draw(canvas,player,team,uniformIndex,frame){const ctx=canvas.getContext('2d');ctx.clearRect(0,0,32,32);
  const appearance=player.appearance||{},gear=player.accessories?.[uniformIndex]||player.accessories?.[0]||{};
  body(ctx,frame,player,team,uniformIndex);
  const side=(frame%2)*32;
  paint(ctx,images.head,side,0,hex(appearance.skinC,'#dc8158'));
  paint(ctx,images['eye-white'],side,0);
  paint(ctx,images['eye-color'],side,0,hex(appearance.eyeC,'#472d3c'));
  paint(ctx,images['brow-color'],side,0,hex(appearance.browC,'#262539'));
  if(appearance.unibrow)paint(ctx,images['unibrow-color'],side,0,hex(appearance.browC,'#262539'));
  atlas(ctx,images['facial-hair'],appearance.fHair,8,hex(appearance.fHairC,'#262539'),frame);
  atlas(ctx,images.hair,appearance.hair,16,hex(appearance.hairC,'#262539'),frame);
  if(gear.headAcc!=='none')atlas(ctx,images['head-accessories'],gear.headAcc,8,color(gear.headAccC,team,'#ffffff'),frame);
  atlas(ctx,images['head-accessories'],gear.headAcc2,8,color(gear.headAcc2C,team,'#ffffff'),frame)
 }
 window.HLSPlayerPreview={
  mount(canvas,state){let frame=0;
   const redraw=()=>{if(canvas.isConnected){const {player,team,uniformIndex}=state();draw(canvas,player,team,uniformIndex,frame)}};
   const tick=()=>{if(!canvas.isConnected)return;redraw();frame=(frame+1)%4;setTimeout(tick,220)};
   tick();return redraw
  }
 };
})();
