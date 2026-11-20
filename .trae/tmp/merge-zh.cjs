// Merge .trae/tmp/zh-p*.json parts into src/i18n/zh.json and verify parity
// against src/i18n/en.json (same key sets at every level).
const fs = require('fs');
const path = require('path');
const TMP = __dirname;
const OUT = path.join(TMP, '..', '..', 'src', 'i18n', 'zh.json');

const en = JSON.parse(fs.readFileSync(path.join(TMP, '..', '..', 'src', 'i18n', 'en.json'), 'utf8'));
const merged = {};
let parts = 0;
for (let i = 1; i <= 6; i++) {
  const f = path.join(TMP, `zh-p${i}.json`);
  if (!fs.existsSync(f)) { console.log(`part ${i}: MISSING FILE`); continue; }
  const part = JSON.parse(fs.readFileSync(f, 'utf8'));
  Object.assign(merged, part);
  parts++;
  console.log(`part ${i}: ${Object.keys(part).length} namespaces`);
}
console.log(`merged from ${parts} parts, ${Object.keys(merged).length} namespaces total`);

// key parity check
const flat = (o, p = '') => {
  const out = [];
  for (const [k, v] of Object.entries(o)) {
    const key = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object') out.push(...flat(v, key));
    else out.push(key);
  }
  return out;
};
const enKeys = new Set(flat(en));
const zhKeys = new Set(flat(merged));
const missing = [...enKeys].filter(k => !zhKeys.has(k));
const orphan = [...zhKeys].filter(k => !enKeys.has(k));
console.log(`missing in zh: ${missing.length}`);
if (missing.length) console.log(missing.slice(0, 30).map(k => '  ' + k).join('\n'));
console.log(`orphaned in zh: ${orphan.length}`);
if (orphan.length) console.log(orphan.slice(0, 30).map(k => '  ' + k).join('\n'));

if (parts < 6 || missing.length > 0) {
  console.log('\nNOT writing zh.json yet — gaps remain.');
  process.exit(1);
}
fs.writeFileSync(OUT, JSON.stringify(merged, null, 1), 'utf8');
console.log(`\nwrote ${OUT}`);
