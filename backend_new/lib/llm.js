'use strict';

const OpenAI = require('openai');

let _client = null;

function getClient() {
  if (!_client) {
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
    const baseURL = process.env.LLM_BASE_URL
      || (process.env.DEEPSEEK_API_KEY ? 'https://api.deepseek.com' : undefined);

    _client = new OpenAI({ apiKey: apiKey || 'demo', baseURL });
  }
  return _client;
}

function isDemoMode() {
  return !process.env.DEEPSEEK_API_KEY && !process.env.OPENAI_API_KEY;
}

/**
 * Call the LLM with a system prompt + user message.
 * history: [{role:'user'|'assistant', content: string}] — actual multi-turn messages
 * Returns the raw string response.
 */
async function chat(systemPrompt, userMessage, { json = false, temperature = 0.7, maxTokens = 1200, history = [] } = {}) {
  if (isDemoMode()) {
    return null; // callers should fall back to deterministic output
  }

  const client = getClient();
  const model = process.env.LLM_MODEL
    || (process.env.DEEPSEEK_API_KEY ? 'deepseek-chat' : 'gpt-4o-mini');

  // Build multi-turn messages: system + history + current user message
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: userMessage },
  ];

  const res = await client.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    ...(json ? { response_format: { type: 'json_object' } } : {}),
  });

  return res.choices[0]?.message?.content ?? '';
}

/**
 * Parse JSON from LLM output, tolerating markdown fences.
 */
function parseJSON(raw) {
  if (!raw) return null;
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

module.exports = { chat, parseJSON, isDemoMode };
