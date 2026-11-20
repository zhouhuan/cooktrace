/**
 * The Simplified Chinese edition ships one locale only: zh. These checks pin
 * the wiring that guarantees that — the language setting defaults to 'zh'
 * (not the old browser-dependent pick, and never 'en'), and the i18n layer
 * initialises and falls back to 'zh'.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('the language setting defaults to Simplified Chinese', () => {
  const s = read('../src/stores/settings.js');
  assert.match(s, /createSettingStore\('language',\s+'zh'\)/);
  assert.doesNotMatch(s, /createSettingStore\('language',\s+'en'\)/);
});

test('i18n initialises and falls back to zh only', () => {
  const i = read('../src/i18n/index.js');
  assert.match(i, /fallbackLocale:\s*'zh'/);
  assert.match(i, /initialLocale:\s*'zh'/);
  assert.match(i, /register\('zh',/);
  assert.doesNotMatch(i, /register\('en',/);
});

test('the only offered locale is zh', () => {
  const i = read('../src/i18n/index.js');
  const m = i.match(/AVAILABLE_LOCALES\s*=\s*\[([^\]]*)\]/s);
  assert.ok(m, 'AVAILABLE_LOCALES array not found');
  const ids = [...m[1].matchAll(/code:\s*'([^']+)'/g)].map(x => x[1]);
  assert.deepEqual(ids, ['zh']);
});
