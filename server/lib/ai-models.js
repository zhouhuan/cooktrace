// The server's copy of Trace's model defaults and provider base URLs,
// for the proxy (routes/ai.js) and recipe imports (lib/recipe-ai-fallback.js).
// Kept identical to src/lib/aiChat.js (scripts/ai-models.test.js checks).
//
// 简体中文专属版: every built-in provider is a Chinese model service on
// an OpenAI-compatible Chat Completions endpoint.

// Used when no model is chosen; an admin who set one keeps it. Doubao's
// model is an Ark inference endpoint ID (ep-…), so it has no default.
export const AI_DEFAULT_MODELS = {
  deepseek: 'deepseek-chat',
  kimi:     'moonshot-v1-32k',
  zhipu:    'glm-4-flash',
  qwen:     'qwen-plus',
  doubao:   '',
};

// Model IDs that changed name: a saved old name is sent as the new one.
// None so far in the Chinese-provider edition.
export const AI_MODEL_RENAMES = {};
export const renamedModel = (model) => AI_MODEL_RENAMES[model] || model;

// The official OpenAI-compatible API address of each built-in provider.
export const AI_PROVIDER_BASE_URLS = {
  deepseek: 'https://api.deepseek.com',
  kimi:     'https://api.moonshot.cn/v1',
  zhipu:    'https://open.bigmodel.cn/api/paas/v4',
  qwen:     'https://dashscope.aliyuncs.com/compatible-mode/v1',
  doubao:   'https://ark.cn-beijing.volces.com/api/v3',
};

/** The model to send on a vendor's own API; OpenAI-compatible ones keep theirs. */
export function modelFor(provider, model) {
  return renamedModel(model);
}
