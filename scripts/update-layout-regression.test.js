import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const updates = read('../src/lib/updates.js');
const server = read('../server/routes/updates.js');
const editor = read('../src/routes/RecipeEditor.svelte');
const diary = read('../src/routes/CookDiary.svelte');
const zh = JSON.parse(read('../src/i18n/zh.json'));
const zhCheck = read('../scripts/check-zh.js');

test('update requests have a timeout and always clear their timer', () => {
  for (const source of [updates, server]) {
    assert.match(source, /UPDATE_FETCH_TIMEOUT_MS = 12000/);
    assert.match(source, /new AbortController\(\)/);
    assert.match(source, /clearTimeout\(timer\)/);
  }
});

test('update response payloads are validated before use', () => {
  assert.match(updates, /Array\.isArray\(list\)/);
  assert.match(updates, /invalid release payload/);
  assert.match(updates, /Update status API returned an invalid response/);
  assert.match(server, /Array\.isArray\(list\)/);
  assert.match(server, /invalid release payload/);
});

test('server response snake_case metadata is normalized by the client', () => {
  assert.match(updates, /status\.notesUrl \|\| status\.notes_url/);
  assert.match(updates, /status\.publishedAt \|\| status\.published_at/);
});

test('recipe time labels use min and remain single-line in responsive columns', () => {
  assert.equal(zh.editor.prep_min, '准备 min');
  assert.equal(zh.editor.cook_min, '烹饪 min');
  assert.equal(zh.editor.rest_min, '静置 min');
  assert.equal(zh.editor.total_min, '总计 min');
  assert.match(zhCheck, /'min'/, 'the requested Latin unit is explicitly allowed');
  assert.match(editor, /class="field-row time-fields"/);
  assert.match(editor, /\.time-fields \.field-label\s*\{\s*white-space: nowrap/);
  assert.match(editor, /@media \(max-width: 640px\)[\s\S]*?\.time-fields \{ grid-template-columns: repeat\(2/);
});

test('diary segmented tabs keep their labels on one line at narrow widths', () => {
  assert.match(diary, /\.seg\s*\{[\s\S]*?white-space: nowrap/);
  assert.match(diary, /\.view-chips\s*\{[\s\S]*?max-width: 100%/);
});

test('recipe search keeps a compact filter control on narrow phones', () => {
  const recipes = read('../src/routes/Recipes.svelte');
  assert.match(recipes, /\.search-row \.search \{ flex: 1 1 auto; min-width: 0/);
  assert.match(recipes, /\.filter-trigger\s*\{[\s\S]*?white-space: nowrap/);
  assert.match(recipes, /@media \(max-width: 380px\)[\s\S]*?\.filter-trigger > span:not\(\.material-symbols-rounded\):not\(\.filter-count\) \{ display: none; \}/);
});
