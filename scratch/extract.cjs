const fs = require('fs');

const eu = fs.readFileSync('src/data/countries/eurostat.ts', 'utf8');
const rw = fs.readFileSync('src/data/countries/restOfWorld.ts', 'utf8');

const codes = [];
const re = /code:\s*"([A-Z]{2})"/g;
let m;
while (m = re.exec(eu)) codes.push(m[1]);
while (m = re.exec(rw)) codes.push(m[1]);

const displayNames = new Intl.DisplayNames(['es-ES'], { type: 'region' });

const map = {};
for (const code of codes) {
  // Fixes or overrides for specific codes
  let name = displayNames.of(code);
  // manual overrides if needed
  if (code === 'XK') name = 'Kosovo';
  if (code === 'VA') name = 'Ciudad del Vaticano';
  
  map[code] = name;
}

const out = `export const countryNamesES: Record<string, string> = ${JSON.stringify(map, null, 2)};\n`;
fs.writeFileSync('src/i18n/countryNamesES.ts', out);
console.log('Wrote to src/i18n/countryNamesES.ts');
