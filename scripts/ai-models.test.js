/**
 * The AI model picker and the IDs the app sends, in the browser/app
 * (src/lib/aiChat.js), in the server's proxy (server/routes/ai.js) and in
 * recipe imports (server/lib/recipe-ai-fallback.js), both through
 * server/lib/ai-models.js.
 *
 * 简体中文专属版: the built-in providers are the Chinese model services
 * (DeepSeek, Kimi, Zhipu GLM, Tongyi Qwen, Doubao), all on OpenAI-compatible
 * Chat Completions endpoints. These tests keep the copies identical, keep
 * saved model IDs working for anyone who saved them, and keep the picker to
 * models a new user can actually use.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';

globalThis.BroadcastChannel = undefined;
const client = await import('../src/lib/aiChat.js');
const server = await import('../server/lib/ai-models.js');
const { aiExtractRecipe } = await import('../server/lib/recipe-ai-fallback.js');

// The server's proxy, mounted on a scratch database (server/db.js opens
// DB_PATH when imported).
let db = null, dir = null, app = null, base = null;
const req = createRequire(new URL('../server/package.json', import.meta.url));
let sqlite = true;
try { req('better-sqlite3'); } catch { sqlite = false; /* not built for this Node: the proxy half skips */ }
if (sqlite) {
  dir = mkdtempSync(join(tmpdir(), 'ct-ai-models-'));
  process.env.DB_PATH = join(dir, 'test.db');
  db = (await import('../server/db.js')).default;
  const { default: aiRoutes } = await import('../server/routes/ai.js');
  const express = req('express');
  const web = express();
  web.use(express.json());
  web.use('/api/ai', aiRoutes);
  app = web.listen(0);
  base = `http://127.0.0.1:${app.address().port}`;
}
test.after(() => { app?.close(); try { db?.close(); } catch {} if (dir) rmSync(dir, { recursive: true, force: true }); });

const ids = provider => client.AI_MODELS[provider].filter(v => v !== client.AI_MODEL_CUSTOM);

test('the picker lists the current models', () => {
  assert.deepEqual(ids('deepseek'), ['deepseek-chat', 'deepseek-reasoner']);
  assert.deepEqual(ids('kimi'), ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k', 'kimi-k2-0711-preview', 'kimi-k2-turbo-preview']);
  assert.deepEqual(ids('zhipu'), ['glm-4-flash', 'glm-4-air', 'glm-4-plus']);
  assert.deepEqual(ids('qwen'), ['qwen-turbo', 'qwen-plus', 'qwen-max']);
  // Doubao (Volcano Ark) serves each deployment behind an inference
  // endpoint ID (ep-…): no preset models, the user types it in instead.
  assert.deepEqual(client.AI_MODELS.doubao, []);
  for (const p of ['deepseek', 'kimi', 'zhipu', 'qwen']) assert.equal(client.AI_MODELS[p].at(-1), client.AI_MODEL_CUSTOM);
  assert.deepEqual(client.AI_MODELS.custom, []);
});

test('no foreign provider is left in the picker', () => {
  assert.deepEqual(client.AI_PROVIDERS.map(p => p.id), ['deepseek', 'kimi', 'zhipu', 'qwen', 'doubao', 'custom']);
});

test('the picker names each model in Chinese, not by its ID', () => {
  for (const p of ['deepseek', 'kimi', 'zhipu', 'qwen']) {
    const labels = ids(p).map(m => client.AI_MODEL_LABELS[m]);
    assert.ok(labels.every(Boolean), `${p}: every model has a label`);
    assert.equal(labels.filter(l => /最便宜/.test(l)).length, 1, `${p}: one cheapest`);
    assert.equal(labels.filter(l => /最强/.test(l)).length, 1, `${p}: one most capable`);
  }
  assert.equal(client.AI_MODEL_LABELS['deepseek-chat'], 'DeepSeek Chat（V3，均衡，最便宜）');
  assert.equal(client.AI_MODEL_LABELS['qwen-max'], '通义千问 Max（最强）');
  // Settings > Trace shows them, a model the server sets too; a custom one by its ID.
  const ui = readFileSync(new URL('../src/components/settings/SettingsTrace.svelte', import.meta.url), 'utf8');
  assert.match(ui, /AI_MODEL_LABELS\[m\] \|\| m/);
  assert.match(ui, /<option value=\{m\}>\{_modelLabel\(m\)\}<\/option>/);
  assert.match(ui, /envLocks\.ai_model \? _modelLabel\(envLocks\.ai_model\)/);
});

test("defaults: the provider's first-choice model when none is chosen; a chosen model is kept", () => {
  const { custom: _custom, doubao, ...defaults } = client.AI_DEFAULT_MODELS;
  assert.deepEqual(defaults, { deepseek: 'deepseek-chat', kimi: 'moonshot-v1-32k', zhipu: 'glm-4-flash', qwen: 'qwen-plus' });
  // Doubao's model is the user's Ark inference endpoint ID, so there is
  // no default: the Settings UI shows a free-text input for it.
  assert.equal(doubao, '');
  for (const p of ['deepseek', 'kimi', 'zhipu', 'qwen']) assert.ok(ids(p).includes(client.AI_DEFAULT_MODELS[p]), `${p} default is in the picker`);
  // Settings shows a saved model that isn't listed as a custom one, so it
  // keeps working; an empty preset list (doubao) means the free-text input
  // instead, so the escape hatch doesn't apply to it.
  const trace = readFileSync(new URL('../src/components/settings/SettingsTrace.svelte', import.meta.url), 'utf8');
  assert.match(trace, /if \(saved && !isPreset && _pm\.length > 0 && \$aiProvider !== 'custom'\) \{\s*aiModelSelectVal = AI_MODEL_CUSTOM;\s*aiCustomModelVal = saved;/);
  assert.match(trace, /if \(\$aiProvider !== 'custom' && \$aiProvider !== 'oai-compat' && \$aiModel && renamedModel\(\$aiModel\) !== \$aiModel\) \{\s*aiModel\.set\(renamedModel\(\$aiModel\)\);\s*\}\s*const saved = \$aiModel;/);
  assert.match(trace, /placeholder=\{\$aiProvider === 'doubao' \? 'ep-…（火山方舟推理接入点 ID）' : AI_DEFAULT_MODELS\[\$aiProvider\] \|\| ''\}/);
});

test('saved models: every provider keeps IDs exactly as saved (no renames in this edition)', () => {
  assert.deepEqual(client.AI_MODEL_RENAMES, {});
  // OpenAI-compatible endpoints (custom, oai-compat) name their own
  // models — and an Ark endpoint ID is one — so nothing is ever renamed.
  assert.equal(server.modelFor('deepseek', 'deepseek-chat'), 'deepseek-chat');
  assert.equal(server.modelFor('custom', 'ep-20240903-12345678-abcde'), 'ep-20240903-12345678-abcde');
  assert.equal(server.modelFor('oai-compat', 'my-model'), 'my-model');
  // The built-in providers go through the shared OpenAI-compatible path
  // with their own official base URL; custom keeps requiring what it did.
  const src = readFileSync(new URL('../src/lib/aiChat.js', import.meta.url), 'utf8');
  assert.match(src, /return _callOpenAIWithTools\(apiKey, model \|\| AI_DEFAULT_MODELS\[provider\], messages, systemPrompt, tools, cb, AI_PROVIDER_BASE_URLS\[provider\]\);/);
  assert.match(src, /_callOpenAIWithTools\(apiKey \|\| 'no-key', model,/);
});

test("the server's copy (proxy and recipe imports) uses the same defaults, renames and addresses", () => {
  const { custom: _custom, doubao, ...clientDefaults } = client.AI_DEFAULT_MODELS;
  assert.deepEqual(server.AI_DEFAULT_MODELS, { ...clientDefaults, doubao });
  assert.deepEqual(server.AI_MODEL_RENAMES, client.AI_MODEL_RENAMES);
  assert.deepEqual(server.AI_PROVIDER_BASE_URLS, client.AI_PROVIDER_BASE_URLS);
  const src = readFileSync(new URL('../server/routes/ai.js', import.meta.url), 'utf8');
  assert.match(src, /const model\s+= modelFor\(provider, cfg\.ai_model \|\| AI_DEFAULT_MODELS\[provider\] \|\| ''\);/);
  assert.doesNotMatch(src, /claude-haiku|gemini-\d|anthropic\.com|generativelanguage|api\.openai\.com/, 'no foreign provider left in the proxy');
  const fallback = readFileSync(new URL('../server/lib/recipe-ai-fallback.js', import.meta.url), 'utf8');
  assert.match(fallback, /const model\s+= modelFor\(provider, cfg\.model \|\| _defaultModel\(provider\)\);/);
  assert.doesNotMatch(fallback, /claude-haiku|gemini-\d|anthropic\.com|generativelanguage|api\.openai\.com/, 'no foreign provider left in recipe imports');
});

test('the Chat Completions address keeps a versioned base path (Ark /v3, Zhipu /v4); a bare origin gets /v1', async () => {
  const { openAIChatUrl } = await import('../src/lib/openai-chat-params.js');
  assert.equal(openAIChatUrl(client.AI_PROVIDER_BASE_URLS.deepseek), 'https://api.deepseek.com/v1/chat/completions');
  assert.equal(openAIChatUrl(client.AI_PROVIDER_BASE_URLS.kimi), 'https://api.moonshot.cn/v1/chat/completions');
  assert.equal(openAIChatUrl(client.AI_PROVIDER_BASE_URLS.zhipu), 'https://open.bigmodel.cn/api/paas/v4/chat/completions');
  assert.equal(openAIChatUrl(client.AI_PROVIDER_BASE_URLS.qwen), 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions');
  assert.equal(openAIChatUrl(client.AI_PROVIDER_BASE_URLS.doubao), 'https://ark.cn-beijing.volces.com/api/v3/chat/completions');
  // A custom base a user typed gets the same treatment.
  assert.equal(openAIChatUrl('https://example.com/'), 'https://example.com/v1/chat/completions');
  assert.equal(openAIChatUrl('https://example.com/v1/chat/completions'), 'https://example.com/v1/chat/completions');
});

// Every model CookTrace's picker offers, and none at all, as the vendor is
// asked for it now: kept as saved, the provider's default filling in for
// none. Doubao always has its endpoint ID saved (it has no default).
const SAVED_BEFORE = [
  ['deepseek', 'deepseek-chat', 'deepseek-chat'],
  ['deepseek', 'deepseek-reasoner', 'deepseek-reasoner'],
  ['deepseek', '', 'deepseek-chat'],
  ['kimi', 'moonshot-v1-8k', 'moonshot-v1-8k'],
  ['kimi', 'moonshot-v1-32k', 'moonshot-v1-32k'],
  ['kimi', 'moonshot-v1-128k', 'moonshot-v1-128k'],
  ['kimi', 'kimi-k2-0711-preview', 'kimi-k2-0711-preview'],
  ['kimi', 'kimi-k2-turbo-preview', 'kimi-k2-turbo-preview'],
  ['kimi', '', 'moonshot-v1-32k'],
  ['zhipu', 'glm-4-flash', 'glm-4-flash'],
  ['zhipu', 'glm-4-air', 'glm-4-air'],
  ['zhipu', 'glm-4-plus', 'glm-4-plus'],
  ['zhipu', '', 'glm-4-flash'],
  ['qwen', 'qwen-turbo', 'qwen-turbo'],
  ['qwen', 'qwen-plus', 'qwen-plus'],
  ['qwen', 'qwen-max', 'qwen-max'],
  ['qwen', '', 'qwen-plus'],
  ['doubao', 'ep-20240903-12345678-abcde', 'ep-20240903-12345678-abcde'],
];
const VENDOR = /^https:\/\/(api\.deepseek\.com|api\.moonshot\.cn|open\.bigmodel\.cn|dashscope\.aliyuncs\.com|ark\.cn-beijing\.volces\.com)\//;
// Answers the vendors' APIs in-process and notes the model each was asked
// for; anything else (the test's own server) goes out for real.
function stubVendors(t, text = 'ok') {
  const asked = [], urls = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    urls.push(u);
    if (!VENDOR.test(u)) return real(url, init);
    const body = JSON.parse(init.body || '{}');
    asked.push(body.model);
    return new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content: text }, finish_reason: 'stop' }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  t.after(() => { globalThis.fetch = real; });
  return { asked, urls };
}

test('the app: a model saved is the model sent', async (t) => {
  const { asked, urls } = stubVendors(t);
  for (const [provider, saved, sent] of SAVED_BEFORE) {
    // Trace, imports and label scans pass the saved model, or the default when none is saved.
    const model = saved || client.AI_DEFAULT_MODELS[provider];
    const reply = await client.callAI({ provider, apiKey: 'k', model, messages: [{ role: 'user', content: 'hi' }], systemPrompt: 'You are Trace.' });
    assert.equal(reply, 'ok', `${provider} ${saved}`);
    assert.equal(asked.at(-1), sent, `${provider} ${saved || '(none)'}`);
  }
  // Each provider went to its own official address, version path intact.
  assert.ok(urls.includes('https://open.bigmodel.cn/api/paas/v4/chat/completions'), 'zhipu keeps its /v4 path');
  assert.ok(urls.includes('https://ark.cn-beijing.volces.com/api/v3/chat/completions'), 'doubao keeps its /v3 path');
  // An OpenAI-compatible server is asked for exactly what was saved.
  await client.callAI({ provider: 'custom', apiKey: 'k', model: 'my-model', baseUrl: 'https://api.deepseek.com/v1', messages: [{ role: 'user', content: 'hi' }], systemPrompt: 'x' });
  assert.equal(asked.at(-1), 'my-model');
  assert.equal(urls.at(-1), 'https://api.deepseek.com/v1/chat/completions');
});

test('the app: doubao without a model says so instead of calling', async (t) => {
  const { asked } = stubVendors(t);
  await assert.rejects(() => client.callAI({ provider: 'doubao', apiKey: 'k', model: '', messages: [{ role: 'user', content: 'hi' }], systemPrompt: 'x' }), /豆包/);
  assert.equal(asked.length, 0);
});

test("the server's proxy: a model an admin set is the model sent", async (t) => {
  if (!db) { t.skip('better-sqlite3 is not built for this Node'); return; }
  const { asked, urls } = stubVendors(t);
  const set = db.prepare('INSERT INTO app_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  const drop = db.prepare('DELETE FROM app_config WHERE key = ?');
  const post = () => fetch(`${base}/api/ai/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }], systemPrompt: 'You are Trace.' }) });
  // One request per row, plus two: keep the list under the proxy's 30 a minute.
  assert.ok(SAVED_BEFORE.length + 2 <= 30);
  for (const [provider, saved, sent] of SAVED_BEFORE) {
    set.run('ai_provider', provider); set.run('ai_api_key', 'k'); set.run('ai_env_locked', 'true');
    if (saved) set.run('ai_model', saved); else drop.run('ai_model');
    const r = await post();
    assert.deepEqual(await r.json(), { text: 'ok' }, `${provider} ${saved}`);
    assert.equal(asked.at(-1), sent, `${provider} ${saved || '(none)'}`);
  }
  // Doubao without a model (no default: the endpoint ID) says so.
  set.run('ai_provider', 'doubao'); drop.run('ai_model');
  assert.equal((await post()).status, 503, 'doubao without a model');
  // An OpenAI-compatible server (AI_PROVIDER=oai-compat) is asked for exactly what was set.
  set.run('ai_provider', 'oai-compat'); set.run('ai_base_url', 'https://api.deepseek.com'); set.run('ai_model', 'my-model');
  assert.deepEqual(await (await post()).json(), { text: 'ok' });
  assert.equal(asked.at(-1), 'my-model');
  assert.equal(urls.at(-1), 'https://api.deepseek.com/v1/chat/completions');
});

test('recipe imports: a saved model is the model sent', async (t) => {
  const { asked } = stubVendors(t, JSON.stringify({ name: 'Soup', ingredients: [], steps: [] }));
  for (const source of ['user', 'server']) {
    for (const [provider, saved, sent] of SAVED_BEFORE) {
      const recipe = await aiExtractRecipe('<h1>Soup</h1>', 'https://example.com/soup', { provider, apiKey: 'k', model: saved, baseUrl: '', source });
      assert.equal(recipe.name, 'Soup', `${source} ${provider} ${saved}`);
      assert.equal(asked.at(-1), sent, `${source} ${provider} ${saved || '(none)'}`);
    }
  }
});

test('Settings search finds the Trace section by the new model names', () => {
  const settings = readFileSync(new URL('../src/routes/Settings.svelte', import.meta.url), 'utf8');
  const ai = settings.match(/^\s*ai:\s*\[([^\]]*)\]/m)[1];
  for (const kw of ['deepseek', 'kimi', 'moonshot', 'glm', 'zhipu', 'qwen', 'doubao', '豆包', '智谱']) assert.match(ai, new RegExp(`'${kw}'`), kw);
  for (const gone of ['claude', 'sonnet', 'opus', 'gpt-6', 'gemini 3', 'fable']) assert.doesNotMatch(ai, new RegExp(`'${gone}'`), `stale keyword ${gone}`);
});
