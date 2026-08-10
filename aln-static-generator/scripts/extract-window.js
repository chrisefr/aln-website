const fs = require('fs');
const file = process.argv[2];
const needle = process.argv[3];
const text = fs.readFileSync(file, 'utf8');
const idx = text.indexOf(needle);
console.log('index:', idx, 'length:', text.length);
if (idx >= 0) {
  console.log(text.slice(Math.max(0, idx - 2500), idx + 2500));
}
