const fs = require('fs');
const p = 'src/entities/Fighter.js';
const lines = fs.readFileSync(p, 'utf8').split('\n');
// Line 951 (index 950) has a stray '}' - remove it
lines.splice(950, 1);
fs.writeFileSync(p, lines.join('\n'));
console.log('Removed stray brace at line 951. New total:', lines.length);
