import Groq from 'groq-sdk';
import { config } from '../config/env';

export const groq =
  config.groqApiKey
    ? new Groq({ apiKey: config.groqApiKey })
    : null;

export async function groqJson<T>(params: {
  system: string;
  user: string;
  schemaHint: string;
}): Promise<T> {
  if (!groq) {
    throw new Error('GROQ_API_KEY is not set');
  }

  const completion = await groq.chat.completions.create({
    model: config.groqModel,
    temperature: 0.2,
    messages: [
      { role: 'system', content: params.system },
      { role: 'user', content: `${params.user}\n\nReturn ONLY valid JSON.\nSchema:\n${params.schemaHint}` }
    ]
  });

  const content = completion.choices?.[0]?.message?.content ?? '';
  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');
  const jsonText =
    firstBrace !== -1 && lastBrace !== -1 ? content.slice(firstBrace, lastBrace + 1) : content;

  return JSON.parse(jsonText) as T;
}

