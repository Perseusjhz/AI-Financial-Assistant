import OpenAI from 'openai';

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
    _client = new OpenAI({
      apiKey: apiKey || 'demo-mode',
      baseURL: process.env.DEEPSEEK_API_KEY
        ? 'https://api.deepseek.com'
        : undefined,
    });
  }
  return _client;
}

export async function callLLM(
  systemPrompt: string,
  userMessage: string,
  expectJSON = false
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return JSON.stringify({ _demo: true, message: '演示模式' });
  }

  const client = getClient();
  const model = process.env.DEEPSEEK_API_KEY ? 'deepseek-chat' : 'gpt-4o-mini';

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    ...(expectJSON ? { response_format: { type: 'json_object' } } : {}),
    temperature: 0.7,
    max_tokens: 1200,
  });

  return response.choices[0]?.message?.content || '';
}

export function isDemoMode(): boolean {
  return !process.env.DEEPSEEK_API_KEY && !process.env.OPENAI_API_KEY;
}
