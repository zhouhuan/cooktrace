/**
 * OpenAI-compatible tool responses used by the Simplified Chinese edition.
 * This suite replaces the former Gemini-only integration coverage while
 * retaining and broadening tool-loop coverage for the supported providers.
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';

const seen = [];
const endpoint = http.createServer((req, res) => {
  let raw = '';
  req.on('data', chunk => { raw += chunk; });
  req.on('end', () => {
    const body = JSON.parse(raw || '{}');
    seen.push(body);
    const hasToolResults = (body.messages || []).some(m => m.role === 'tool');
    const message = hasToolResults
      ? { role: 'assistant', content: 'answer after tools' }
      : {
          role: 'assistant',
          content: null,
          tool_calls: ['get_one', 'get_two', 'get_list'].map((name, i) => ({
            id: `call_${i + 1}`,
            type: 'function',
            function: { name, arguments: '{}' },
          })),
        };
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({
      choices: [{ index: 0, finish_reason: hasToolResults ? 'stop' : 'tool_calls', message }],
    }));
  });
});
await new Promise(resolve => endpoint.listen(0, '127.0.0.1', resolve));
test.after(() => endpoint.close());

const ENDPOINT = `http://127.0.0.1:${endpoint.address().port}`;
const realFetch = globalThis.fetch;
globalThis.fetch = (url, options) => {
  const value = String(url);
  if (value.startsWith('https://dashscope.aliyuncs.com/')) return realFetch(`${ENDPOINT}/qwen`, options);
  if (value.startsWith(ENDPOINT)) return realFetch(url, options);
  return realFetch(url, options);
};
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };

const client = await import('../src/lib/aiChat.js');
const answers = {};
client.setToolHandler(async name => answers[name]);
const tools = ['get_one', 'get_two', 'get_list'].map(name => ({
  name,
  description: name,
  parameters: { type: 'object', properties: {} },
}));

for (const provider of [
  { provider: 'qwen', apiKey: 'sk-test', model: 'qwen-plus' },
  { provider: 'oai-compat', apiKey: '', model: 'qwen3-local', baseUrl: ENDPOINT },
]) {
  test(`${provider.provider}: tool results of every JSON type round-trip through Chat Completions`, async () => {
    const values = [
      [],
      [{ id: 1, name: 'Soup' }],
      'done',
      '',
      0,
      42,
      true,
      false,
      null,
      undefined,
      { error: 'Recipe not found' },
    ];
    for (const value of values) {
      answers.get_one = { ok: true };
      answers.get_two = { active: false };
      answers.get_list = value;
      seen.length = 0;
      const answer = await client.callAI({
        ...provider,
        messages: [{ role: 'user', content: 'Import these recipes.' }],
        systemPrompt: 'You are CookTrace.',
        tools,
      });
      assert.equal(answer, 'answer after tools', JSON.stringify(value));
      assert.equal(seen.length, 2, 'one tool round, then one final answer');
      const toolMessages = seen[1].messages.filter(message => message.role === 'tool');
      assert.equal(toolMessages.length, 3);
      assert.deepEqual(JSON.parse(toolMessages[0].content), { ok: true });
      assert.deepEqual(JSON.parse(toolMessages[1].content), { active: false });
      if (value === undefined) assert.equal(toolMessages[2].content, undefined);
      else assert.deepEqual(JSON.parse(toolMessages[2].content), value);
    }
  });
}

test('Gemini is rejected before making a request in the Simplified Chinese edition', async () => {
  seen.length = 0;
  await assert.rejects(client.callAI({
    provider: 'gemini',
    apiKey: 'k',
    messages: [{ role: 'user', content: 'Hello' }],
    systemPrompt: 'You are CookTrace.',
  }), /Unknown AI provider: gemini/);
  assert.equal(seen.length, 0, 'unsupported providers never receive a request');
});

test.after(() => { globalThis.fetch = realFetch; });
