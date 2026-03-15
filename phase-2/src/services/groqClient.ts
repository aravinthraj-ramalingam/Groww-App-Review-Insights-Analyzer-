import Groq from 'groq-sdk';
import { config } from '../config/env';

export const groq =
  config.groqApiKey
    ? new Groq({ apiKey: config.groqApiKey })
    : null;

/**
 * Extract JSON object from a string that may be wrapped in markdown code fences
 * or have extra text before/after the JSON.
 * Also removes control characters that break JSON parsing.
 */
function extractJson(raw: string): string {
  // Remove ALL control characters and non-printable characters
  // Keep only printable ASCII (32-126) and common whitespace (\n=10, \r=13, \t=9)
  let cleaned = raw
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Control chars
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width spaces
    .replace(/\uFFFD/g, ''); // Replacement character
  
  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  } else {
    // Find the first { and the matching last }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
  }
  
  // Fix unescaped newlines inside JSON strings (common LLM issue)
  // Replace actual newlines inside string values with escaped \n
  cleaned = cleaned.replace(/:\s*"([^"]*)"/g, (match, content) => {
    // Escape unescaped newlines and carriage returns within the string content
    const escaped = content
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/\n/g, '\\n')   // Escape newlines
      .replace(/\r/g, '\\r');  // Escape carriage returns
    return ': "' + escaped + '"';
  });

  return cleaned.trim();
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

      // Debug: log first 200 chars if parse fails
      try {
        return JSON.parse(jsonText) as T;
      } catch (parseErr: any) {
        console.error(`[DEBUG] JSON parse error at position: ${parseErr.message}`);
        console.error(`[DEBUG] Content preview (first 300 chars): ${jsonText.slice(0, 300)}`);
        console.error(`[DEBUG] Raw content preview (first 300 chars): ${content.slice(0, 300)}`);
        throw parseErr;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Retry ${attempt}/${MAX_RETRIES}] Groq JSON parse or API error: ${err.message}`);
    }
  }

  console.error('--- GROQ JSON PARSE ERROR (Final Attempt) ---');
  throw lastError;
}

