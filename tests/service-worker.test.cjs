const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync(require('node:path').join(__dirname,'../sw.js'),'utf8');
const url='https://raw.githubusercontent.com/galileo88/theleaguedepot/main/Leagues/NCSA_Classic/Logos/birmingham_logo.png';
function response(type){return {type,ok:type!=='opaque',clone(){return response(type)}}}
function worker(cached,{offline=false}={}){
  const handlers={},requests=[],writes=[];
  vm.runInNewContext(source,{
    URL,
    self:{location:{origin:'https://galileo88.github.io'},addEventListener:(name,fn)=>handlers[name]=fn},
    caches:{match:async()=>cached,open:async()=>({put:async(request,value)=>{cached=value;writes.push(value)}})},
    fetch:async request=>{
      requests.push(request);
      if(offline)throw new TypeError('Failed to fetch');
      return response(request.mode==='no-cors'?'opaque':'cors');
    }
  });
  return {requests,writes,async load(mode,cache='default'){
    let result;
    handlers.fetch({request:{url,method:'GET',mode,cache},respondWith:p=>{result=p}});
    const value=await result;
    await Promise.resolve();
    return value;
  }};
}

test('preview followed by color picking refetches an opaque cached logo with CORS',async()=>{
  const app=worker();
  assert.equal((await app.load('no-cors')).type,'opaque');
  assert.equal((await app.load('cors')).type,'cors');
  assert.deepEqual(app.requests.map(r=>r.mode),['no-cors','cors']);
  assert.equal((await app.load('cors')).type,'cors');
  assert.equal(app.requests.length,2);
});

test('ordinary image previews can reuse an opaque response offline',async()=>{
  const app=worker(response('opaque'),{offline:true});
  assert.equal((await app.load('no-cors')).type,'opaque');
  assert.equal(app.requests.length,0);
});

test('a failed CORS fetch never falls back to an incompatible opaque response',async()=>{
  const app=worker(response('opaque'),{offline:true});
  await assert.rejects(app.load('cors'),/Failed to fetch/);
});

test('the color picker reload request bypasses even a compatible cached response',async()=>{
  const app=worker(response('cors'));
  assert.equal((await app.load('cors','reload')).type,'cors');
  assert.equal(app.requests.length,1);
  assert.equal(app.writes.length,1);
});

test('no-store requests neither reuse nor update the cache',async()=>{
  const app=worker(response('cors'));
  await app.load('cors','no-store');
  assert.equal(app.requests.length,1);
  assert.equal(app.writes.length,0);
});
