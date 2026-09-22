/* Top-down court preview. PNG layers live in ./court/ and can be replaced independently. */
(()=>{
 const images=new Map(),pixels=new Map();
 function load(url){
  if(!images.has(url))images.set(url,new Promise((resolve,reject)=>{const image=new Image();const fail=()=>{clearTimeout(timer);images.delete(url);reject(Error('Image unavailable'))};const timer=setTimeout(fail,10000);image.onload=()=>{clearTimeout(timer);resolve(image)};image.onerror=fail;image.src=url}));
  return images.get(url);
 }
 function sourcePixels(image){
  if(!pixels.has(image.src)){const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);pixels.set(image.src,ctx.getImageData(0,0,image.width,image.height))}
  return pixels.get(image.src);
 }
 function rgb(value,team,fallback='FFFFFF'){
  const index=['PRI','SEC','TER'].indexOf(value);if(index>=0)value=team.teamColors?.[index];
  const hex=/^[\da-f]{6}$/i.test(value)?value:fallback;return [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));
 }
 function recolor(image,color,palette){
  const source=sourcePixels(image),canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
  const ctx=canvas.getContext('2d'),output=ctx.createImageData(source.width,source.height),s=source.data,d=output.data;
  for(let i=0;i<s.length;i+=4){
   const mapped=palette?.[s[i]+','+s[i+1]+','+s[i+2]];
   const c=mapped||color||[s[i],s[i+1],s[i+2]];
   // Keep the extracted wood grain while applying the selected surface color.
   const shade=color&&!palette?Math.max(s[i],s[i+1],s[i+2])/255:1;
   d[i]=c[0]*shade;d[i+1]=c[1]*shade;d[i+2]=c[2]*shade;d[i+3]=s[i+3];
  }
  ctx.putImageData(output,0,0);return canvas;
 }
 const outerColors={'38,36,58':'outerFloor','65,182,230':'outerBorder','219,62,177':'innerBorder','123,207,92':'mediaLines'};
 const lineColors={'13,47,109':'outerLine','80,155,75':'halfCourtLine','19,178,242':'outerKeyLine','26,69,59':'innerKeyLine','15,77,163':'outerFTCircle','14,130,206':'innerFTCircle'};
 function palette(mapping,court,team){return Object.fromEntries(Object.entries(mapping).map(([color,key])=>[color,rgb(court[key],team)]))}
 function validURL(value){return typeof value==='string'&&/^(https?:\/\/|data:image\/|blob:)/i.test(value)}
 window.HLSCourtPreview={mount(parent,getTeam){
  const wrapper=document.createElement('section');wrapper.className='court-preview';wrapper.dataset.courtPreview='true';
  const heading=document.createElement('h3');heading.textContent='Court Preview';
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Top-down court color and layout preview');
  const note=document.createElement('p');note.className='court-preview-note';note.setAttribute('role','status');
  wrapper.append(heading,canvas,note);parent.append(wrapper);let revision=0;
  wrapper.syncCourtPreview=async()=>{
   const current=++revision,team=getTeam(),court={...team.court};
   note.textContent='Loading court preview…';
   const college=Number(court.threePointLine)===1;
   const surfaces=['outerWood','innerWood','outerFT','outerKey','innerKey','innerFT'];
   const filenames=surfaces.map(key=>{
    const pattern=['flat','lines','tiled','parquet','combs'].includes(court[key])?court[key]:'flat';
    return key+(key==='innerWood'?(college?'-college':'-pro'):'')+'-'+pattern+'.png';
   });
   try{
    const textures=await Promise.all(['outer-court.png',...filenames,'court-lines.png',college?'three-point-college.png':'three-point-pro.png'].map(file=>load('./court/'+file)));
    const custom=await Promise.allSettled([court.overlayURL,team.logoURL].map(url=>validURL(url)?load(url):Promise.resolve(null)));
    if(current!==revision||!wrapper.isConnected)return;
    const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,1024,512);
    ctx.drawImage(recolor(textures[0],null,palette(outerColors,court,team)),0,0);
    surfaces.forEach((key,i)=>ctx.drawImage(recolor(textures[i+1],rgb(court[key+'C'],team)),191,95));
    const drawCustom=layer=>{
     const overlay=custom[0].status==='fulfilled'?custom[0].value:null,logo=custom[1].status==='fulfilled'?custom[1].value:null;
     if(overlay&&Number(court.overlayLayer)===layer)ctx.drawImage(overlay,0,0,1024,512);
     const scale=[0,.5,1,1.5,2][Number(court.logoSize)]??0;
     if(logo&&scale&&Number(court.logoLayer)===layer){const size=128*scale,ratio=Math.min(size/logo.width,size/logo.height);ctx.drawImage(logo,512-logo.width*ratio/2,256-logo.height*ratio/2,logo.width*ratio,logo.height*ratio)}
    };
    drawCustom(0);
    ctx.drawImage(recolor(textures[7],null,palette(lineColors,court,team)),0,0);
    if(Number(court.threePointLine)!==2)ctx.drawImage(recolor(textures[8],rgb(court.threePointLineC,team)),0,0);
    drawCustom(1);
    const text=(key,x,y,rotation,max)=>{if(!court[key])return;ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.fillStyle='#'+rgb(court[key+'C'],team).map(n=>n.toString(16).padStart(2,'0')).join('');ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 22px sans-serif';ctx.fillText(String(court[key]),0,0,max);ctx.restore()};
    text('baseline1',176,256,-Math.PI/2,280);text('baseline2',848,256,Math.PI/2,280);text('sideline1',512,80,0,580);text('sideline2',512,432,Math.PI,580);
    note.textContent='Floor preview · Text and custom-image sizing are approximate. Hoops are not shown.'+(team.logoURL&&!validURL(team.logoURL)?' Built-in team logos are not shown.':'')+(custom.some(r=>r.status==='rejected')?' A custom image could not be loaded.':'');
   }catch{if(current===revision){canvas.getContext('2d').clearRect(0,0,1024,512);note.textContent='Court preview unavailable. Check that the court image files are present, then change a court setting to retry.'}}
  };
  wrapper.syncCourtPreview();return wrapper;
 }};
})();
