import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync('standalone/Hoopland League Studio.html','utf8');
assert.deepEqual(JSON.parse(html.match(/const standaloneAssets=([^\n]+);/)[1]),[]);
assert.ok(!/Galileo88|HL_IMAGES|UBA|NCSA/.test(html));
console.log('Passed: no personal repository references, categories, or bundled archive images.');
