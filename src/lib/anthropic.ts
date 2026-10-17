import { supabase } from './supabase'

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
  const { data, error } = await supabase.functions.invoke('chat', {
    body: { messages, systemPrompt },
  });

  if (error) {
    // FunctionsHttpError — extract the Anthropic error message if present
    const context = (error as any)?.context;
    if (context) {
      try {
        const body = await context.json();
        throw new Error(body?.error?.message ?? body?.error ?? String(error));
      } catch {
        // body already consumed or not JSON — fall through
      }
    }
    throw error;
  }

  // Edge Function forwarded an Anthropic error body with 2xx (shouldn't happen, but guard anyway)
  if (data?.error) {
    const msg = data.error?.message ?? (typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
    throw new Error(msg);
  }

  const textBlock = (data?.content as any[])?.find((b: any) => b.type === 'text');
  if (typeof textBlock?.text !== 'string') {
    throw new Error(`Unexpected response from chat: ${JSON.stringify(data)}`);
  }
  return textBlock.text;
}
