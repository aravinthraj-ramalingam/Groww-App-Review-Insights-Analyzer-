import Groq from 'groq-sdk';
import { config } from '../config/env';

export const groq =
  config.groqApiKey
    ? new Groq({ apiKey: config.groqApiKey })
    : null;

/**
 * Extract JSON object from a string that may be wrapped in markdown code fences
 * or have extra text before/after the JSON.
 */
function extractJson(raw: string): string {
  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  // Find the first { and the matching last }
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1);
  }

  return raw.trim();
}

export async function groqJson<T>(params: {
  system: string;
  user: string;
  schemaHint: string;
}): Promise<T> {
  if (!groq) {
    throw new Error('GROQ_API_KEY is not set');
  }

  const MAX_RETRIES = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model: config.groqModel,
        temperature: 0.2 + (attempt * 0.1), // slightly increase temp on retry
        messages: [
          { role: 'system', content: params.system },
          { role: 'user', content: `${params.user}\n\nReturn ONLY valid JSON. No markdown fences, no extra explanation.\nSchema:\n${params.schemaHint}` }
        ]
      });

      const content = completion.choices?.[0]?.message?.content ?? '';
      const jsonText = extractJson(content);

      return JSON.parse(jsonText) as T;
    } catch (err: any) {
      lastError = err;
      console.warn(`[Retry ${attempt}/${MAX_RETRIES}] Groq JSON parse or API error: ${err.message}`);
    }
  }

  console.error('--- GROQ JSON PARSE ERROR (Final Attempt) ---');
  throw lastError;
}

