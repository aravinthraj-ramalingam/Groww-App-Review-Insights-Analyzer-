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
  
  // Fix unescaped newlines inside JSON strings using a state machine
  // This properly handles nested quotes and escaped characters
  let result = '';
  let inString = false;
  let escaped = false;
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const nextChar = cleaned[i + 1];
    
    if (escaped) {
      // Previous char was a backslash, preserve this char as-is
      result += char;
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      // This is an escape character
      result += char;
      escaped = true;
      continue;
    }
    
    if (char === '"' && !inString) {
      // Starting a string
      inString = true;
      result += char;
      continue;
    }
    
    if (char === '"' && inString) {
      // Ending a string
      inString = false;
      result += char;
      continue;
    }
    
    if (inString) {
      // Inside a string - escape newlines
      if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else {
        result += char;
      }
    } else {
      // Outside a string - keep as-is
      result += char;
    }
  }

  return result.trim();
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
        console.error(`[DEBUG] JSON parse error: ${parseErr.message}`);
        // Extract position from error message
        const posMatch = parseErr.message.match(/position (\d+)/);
        const pos = posMatch ? parseInt(posMatch[1]) : 0;
        console.error(`[DEBUG] Error around position ${pos}:`);
        console.error(`[DEBUG] Context: ...${jsonText.slice(Math.max(0, pos-50), pos+50)}...`);
        console.error(`[DEBUG] Full content length: ${jsonText.length}`);
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

