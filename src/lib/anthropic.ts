export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const PROTAGONIST_PROMPT =
  'You are the protagonist agent for Wildcard — a personal AI assistant that helps the user stay on top of their day. ' +
  'You help with tasks, scheduling, and anything they bring to you. Be direct, practical, and concise.';

export async function sendChatMessage(
  messages: ChatMessage[],
  systemPrompt = PROTAGONIST_PROMPT,
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Missing EXPO_PUBLIC_ANTHROPIC_API_KEY. Add it to your .env file.',
    );
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.content[0].text as string;
}
