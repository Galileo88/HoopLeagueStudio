const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync('standalone/Hoopland League Studio.html','utf8');
function el(tag,cls,text){return {tag,textContent:text||'',value:'',children:[],events:{},append(...xs){this.children.push(...xs)},replaceChildren(){this.children=[]},setAttribute(){},addEventListener(k,f){this.events[k]=f},focus(){}}}
const data='data:image/png;base64,'+'A'.repeat(100000);
const assets=[{name:'A',path:'One/Logos/a.png',group:'One',kind:'Logos',url:data,local:data},{name:'B',path:'One/Courts/b.png',group:'One',kind:'Courts',url:'https://example.com/b.png'},{name:'C',path:'Two/Logos/c.png',group:'Two',kind:'Logos',url:'https://example.com/c.png'}];
const a=html.indexOf('function attachArchiveDropdown('),b=html.indexOf('function attachImagePreview(',a);
const attach=vm.runInNewContext(html.slice(a,b)+';attachArchiveDropdown',{el,assets,publicAssetURL:a=>!a.isLocal&&/^https?:/.test(a.url||'')?a.url:'',archiveLeague:a=>a.group,Event:class{constructor(type){this.type=type}},toast(){}});
const parent=el('div'),input=el('input'),events=[];input.dispatchEvent=e=>events.push(e.type);attach(parent,input,'logoURL');const dropdown=parent.children[0];dropdown.open=true;dropdown.events.toggle();
const [summary,search,league,type,count,layout]=dropdown.children;const [list,preview]=layout.children;
assert.equal(list.children.length,2);league.value='One';league.onchange();assert.equal(list.children.length,1);assert.match(count.textContent,/1 asset shown/);list.children[0].onclick();assert.equal(input.value,data);assert.deepEqual(events,['input','change']);
type.value='Courts';type.onchange();assert.equal(list.children[0].children[0].textContent,'B');search.value='missing';search.oninput();assert.match(count.textContent,/0 assets/);
function textTree(n){return n.textContent+n.children.map(textTree).join('')};assert.ok(!textTree(dropdown).includes('data:image'));assert.ok(!textTree(dropdown).includes('https://'));
console.log('Passed dropdown league/type/search filters, counts, hidden URL text, and local image selection.');
