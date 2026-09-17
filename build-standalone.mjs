// Validate the shareable standalone application. Never bundle repository images.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url));
const html=fs.readFileSync(path.join(root,'standalone','Hoopland League Studio.html'),'utf8');
assert.deepEqual(JSON.parse(html.match(/const standaloneAssets=([^\n]+);/)[1]),[]);
new vm.Script(html.match(/<script>([\s\S]*)<\/script>/)[1]);
console.log('Standalone validated; no personal repository assets bundled.');
