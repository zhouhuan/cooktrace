#!/usr/bin/env node
/**
 * check-zh — validate the Simplified Chinese locale for the zh-only edition.
 *
 * Usage:  node scripts/check-zh.js   (or: npm run check:zh)
 *
 * Fails (exit 1) when:
 *   1. zh.json cannot be parsed as JSON.
 *   2. The set of keys differs from en.json (missing or orphaned, any depth).
 *   3. A zh value's {placeholder} set differs from the en value's.
 *   4. A zh value contains Latin-letter runs that are not on the whitelist
 *      (brand names / standard unit symbols / URLs / i18n links / HTML tags).
 */
const fs = require('fs');
const path = require('path');

const I18N_DIR = path.join(__dirname, '..', 'src', 'i18n');

// Brand names and standard symbols that may appear in Latin letters.
const WHITELIST = new Set([
  // brands / products
  'CookTrace', 'Trace', 'NutriTrace', 'NoteTrace', 'LiftTrace', 'DeepSeek', 'Kimi',
  'Moonshot', 'GLM', 'Qwen', 'Doubao', 'GitHub', 'OpenAI', 'Gemini', 'Claude',
  'USDA', 'OpenFoodFacts', 'Mealie', 'Mealime', 'Paprika', 'Tandoor', 'Android',
  'Wear', 'OS', 'PWA', 'APK', 'OCR', 'SMTP', 'OIDC', 'API', 'MCP', 'JWT', 'TOTP',
  'Wi-Fi', 'SQLite', 'Docker', 'CSV', 'AI', 'ID', 'IP', 'UUID', 'PIN', 'QR',
  'URL', 'JSON', 'HTML', 'CSS', 'Nginx', 'YAML', 'Markdown', 'Webhook',
  'OAuth', 'Apprise', 'Gotify', 'ntfy', 'sh', 'npm', 'DMS',
  // unit symbols & misc standard tokens
  'g', 'kg', 'mg', 'ug', 'ml', 'cl', 'dl', 'l', 'oz', 'lb', 'lbs', 'cup', 'cups',
  'tsp', 'tbsp', 'pt', 'qt', 'gal', 'fl', 'kcal', 'kJ', 'C', 'F', 'cm', 'mm',
  'km', 'in', 'pcs', 'pc', 'kg',
]);

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else out[key] = v;
  }
  return out;
}

function placeholders(s) {
  return (String(s).match(/\{[^}]+\}/g) || []).sort().join(',');
}

/** Latin-letter runs in a zh value that the whitelist doesn't cover. */
function foreignRuns(value) {
  const text = String(value);
  const out = [];
  // Strip URLs, @:i18n links and HTML tags before scanning.
  const stripped = text
    .replace(/https?:\/\/[^\s<>"{}]+/gi, ' ')
    .replace(/@:[\w.]+/g, ' ')
    .replace(/<\/?[a-zA-Z][^>]*>/g, ' ');
  for (const m of stripped.matchAll(/[A-Za-z][A-Za-z0-9'’-]*/g)) {
    if (!WHITELIST.has(m[0])) out.push(m[0]);
  }
  return out;
}

function main() {
  const errors = [];
  const zhPath = path.join(I18N_DIR, 'zh.json');
  if (!fs.existsSync(zhPath)) {
    console.error('✗ src/i18n/zh.json not found');
    process.exit(1);
  }
  let zh, en;
  try { zh = JSON.parse(fs.readFileSync(zhPath, 'utf8')); }
  catch (e) { console.error(`✗ zh.json is not valid JSON: ${e.message}`); process.exit(1); }
  en = JSON.parse(fs.readFileSync(path.join(I18N_DIR, 'en.json'), 'utf8'));

  const zhKeys = flatten(zh);
  const enKeys = flatten(en);

  const missing = Object.keys(enKeys).filter(k => !(k in zhKeys));
  const orphaned = Object.keys(zhKeys).filter(k => !(k in enKeys));
  if (missing.length) { errors.push(`${missing.length} missing keys`); for (const k of missing.slice(0, 20)) console.error(`        missing: ${k}`); }
  if (orphaned.length) { errors.push(`${orphaned.length} orphaned keys`); for (const k of orphaned.slice(0, 20)) console.error(`        orphaned: ${k}`); }

  let phBad = 0;
  for (const [k, v] of Object.entries(enKeys)) {
    if (k in zhKeys && placeholders(v) !== placeholders(zhKeys[k])) {
      if (phBad === 0) console.error('  ✗ placeholder mismatches:');
      console.error(`        ${k}: en(${placeholders(v)}) zh(${placeholders(zhKeys[k])})`);
      phBad++;
    }
  }
  if (phBad) errors.push(`${phBad} placeholder mismatches`);

  let foreign = 0;
  for (const [k, v] of Object.entries(zhKeys)) {
    const runs = foreignRuns(v);
    if (runs.length) {
      if (foreign === 0) console.error('  ✗ non-whitelisted Latin text:');
      console.error(`        ${k}: ${runs.join(', ')}`);
      foreign++;
    }
  }
  if (foreign) errors.push(`${foreign} values with foreign text`);

  console.log(`\nzh check — ${Object.keys(zhKeys).length} keys vs en's ${Object.keys(enKeys).length}`);
  if (errors.length) {
    console.error(`\n  FAILED: ${errors.join('; ')}\n`);
    process.exit(1);
  }
  console.log('  ✓ key parity, placeholders, and Latin whitelist all pass\n');
}

main();
