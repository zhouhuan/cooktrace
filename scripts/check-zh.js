#!/usr/bin/env node
/**
 * check-zh — validate the Simplified Chinese locale for the zh-only edition.
 *
 * Usage: node scripts/check-zh.js (or: npm run check:zh)
 *
 * Fails when the locale is missing/invalid, its keys or placeholders differ
 * from en.json, or a value contains non-whitelisted Latin text.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const I18N_DIR = path.join(__dirname, '..', 'src', 'i18n');

// Brand names and standard symbols that may appear in Latin letters.
const WHITELIST = new Set([
  'CookTrace', 'Trace', 'NutriTrace', 'NoteTrace', 'LiftTrace', 'DeepSeek', 'Kimi',
  'Moonshot', 'GLM', 'Qwen', 'Doubao', 'GitHub', 'OpenAI', 'Gemini', 'Claude',
  'USDA', 'OpenFoodFacts', 'Mealie', 'Mealime', 'Paprika', 'Tandoor', 'Android',
  'Wear', 'OS', 'PWA', 'APK', 'OCR', 'SMTP', 'OIDC', 'API', 'MCP', 'JWT', 'TOTP',
  'Wi-Fi', 'SQLite', 'Docker', 'CSV', 'AI', 'ID', 'IP', 'UUID', 'PIN', 'QR',
  'URL', 'JSON', 'HTML', 'CSS', 'Nginx', 'YAML', 'Markdown', 'Webhook',
  'OAuth', 'PKCE', 'Apprise', 'Gotify', 'ntfy', 'Weblate', 'sh', 'npm', 'DMS',
  'Cursor', 'Codex', 'Auth0', 'Authelia', 'Authentik', 'Keycloak', 'Google', 'Pocket',
  'Open', 'Food', 'Facts', 'OFF', 'paprikarecipes', 'PDF', 'RTF', 'TXT', 'MD', 'ZIP',
  'HTTP', 'MB', 'KB', 'Esc', 'A', 'D', 'E', 'K', 'B1', 'B2', 'B3', 'B5', 'B6', 'B9', 'B12',
  'g', 'kg', 'mg', 'ug', 'ml', 'cl', 'dl', 'l', 'oz', 'lb', 'lbs', 'cup', 'cups',
  'tsp', 'tbsp', 'pt', 'qt', 'gal', 'fl', 'kcal', 'kJ', 'C', 'F', 'cm', 'mm',
  'km', 'in', 'pcs', 'pc',
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
  const source = String(s);
  // Compare interpolation names and ICU expression structure separately.
  // A greedy "{...}" match breaks on ICU's nested plural/select branches.
  const variables = [...source.matchAll(/\\{\\s*([A-Za-z_][\\w.-]*)/g)].map(m => m[1]).sort();
  const icu = [...source.matchAll(/\\{\\s*([A-Za-z_][\\w.-]*)\\s*,\\s*(plural|select|selectordinal)\\s*,/g)]
    .map(m => `${m[1]}:${m[2]}`).sort();
  const selectors = [...source.matchAll(/(?:^|[\\s,])((?:=\\d+)|zero|one|two|few|many|other)\\s*\\{/g)]
    .map(m => m[1]).sort();
  return JSON.stringify({ variables, icu, selectors });
}

function foreignRuns(value) {
  const stripped = String(value)
    .replace(/https?:\\/\\/[^\\s<>"{}]+/gi, ' ')
    .replace(/@:[\\w.]+/g, ' ')
    .replace(/<\\/?[a-zA-Z][^>]*>/g, ' ')
    // Ignore interpolation identifiers and ICU control syntax, but keep the
    // human-readable text inside plural/select branches for translation checks.
    .replace(/\\{\\s*[A-Za-z_][\\w.-]*(?:\\s*,\\s*(?:plural|select|selectordinal)\\s*,)?/g, ' ')
    .replace(/\\b(?:zero|one|two|few|many|other|=\\d+)\\s*(?=\\{)/g, ' ')
    .replace(/[{}]/g, ' ')
    // Environment variable names and other all-caps configuration tokens.
    .replace(/\\b[A-Z][A-Z0-9_]{2,}\\b/g, ' ');
  const out = [];
  for (const m of stripped.matchAll(/[A-Za-z][A-Za-z0-9'’-]*/g)) {
    if (!WHITELIST.has(m[0])) out.push(m[0]);
  }
  return out;
}

function main() {
  const errors = [];
  const zhPath = path.join(I18N_DIR, 'zh.json');
  if (!fs.existsSync(zhPath)) {
    console.error('✗ src/i18n/zh.json not found. Complete all six translated parts before merging.');
    process.exit(1);
  }

  let zh;
  try {
    zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
  } catch (e) {
    console.error(`✗ zh.json is not valid JSON: ${e.message}`);
    process.exit(1);
  }
  const en = JSON.parse(fs.readFileSync(path.join(I18N_DIR, 'en.json'), 'utf8'));
  const zhKeys = flatten(zh);
  const enKeys = flatten(en);

  const missing = Object.keys(enKeys).filter(k => !(k in zhKeys));
  const orphaned = Object.keys(zhKeys).filter(k => !(k in enKeys));
  if (missing.length) {
    errors.push(`${missing.length} missing keys`);
    for (const k of missing.slice(0, 20)) console.error(`  missing: ${k}`);
  }
  if (orphaned.length) {
    errors.push(`${orphaned.length} orphaned keys`);
    for (const k of orphaned.slice(0, 20)) console.error(`  orphaned: ${k}`);
  }

  let phBad = 0;
  for (const [k, v] of Object.entries(enKeys)) {
    if (k in zhKeys && placeholders(v) !== placeholders(zhKeys[k])) {
      if (phBad === 0) console.error('✗ placeholder mismatches:');
      console.error(`  ${k}: en(${placeholders(v)}) zh(${placeholders(zhKeys[k])})`);
      phBad++;
    }
  }
  if (phBad) errors.push(`${phBad} placeholder mismatches`);

  let foreign = 0;
  for (const [k, v] of Object.entries(zhKeys)) {
    const runs = foreignRuns(v);
    if (runs.length) {
      if (foreign === 0) console.error('✗ non-whitelisted Latin text:');
      console.error(`  ${k}: ${runs.join(', ')}`);
      foreign++;
    }
  }
  if (foreign) errors.push(`${foreign} values with foreign text`);

  console.log(`\nzh check — ${Object.keys(zhKeys).length} keys vs en's ${Object.keys(enKeys).length}`);
  if (errors.length) {
    console.error(`\nFAILED: ${errors.join('; ')}\n`);
    process.exit(1);
  }
  console.log('✓ key parity, placeholders, and Latin whitelist all pass\n');
}

main();
