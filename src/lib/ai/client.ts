import OpenAI from "openai";

// ---------------------------------------------------------------------------
// OpenRouter AI Client — centralized for the whole app
// ---------------------------------------------------------------------------

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Default model — fast & cheap for most tasks
const DEFAULT_MODEL = "anthropic/claude-3.5-haiku";
// Smarter model for complex tasks (roleplay, analysis)
const SMART_MODEL = "anthropic/claude-3.5-sonnet";

export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Simple text completion — for one-shot tasks (corrections, summaries, tips)
 */
export async function aiComplete(
  prompt: string,
  options?: {
    system?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<string> {
  const messages: AIMessage[] = [];

  if (options?.system) {
    messages.push({ role: "system", content: options.system });
  }
  messages.push({ role: "user", content: prompt });

  const response = await openrouter.chat.completions.create({
    model: options?.model || DEFAULT_MODEL,
    messages,
    max_tokens: options?.maxTokens || 1024,
    temperature: options?.temperature ?? 0.7,
  });

  return response.choices[0]?.message?.content || "";
}

/**
 * Chat completion — for multi-turn conversations (roleplay)
 */
export async function aiChat(
  messages: AIMessage[],
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<string> {
  const response = await openrouter.chat.completions.create({
    model: options?.model || SMART_MODEL,
    messages,
    max_tokens: options?.maxTokens || 512,
    temperature: options?.temperature ?? 0.8,
  });

  return response.choices[0]?.message?.content || "";
}

/**
 * JSON completion — returns parsed JSON for structured outputs
 */
export async function aiJSON<T>(
  prompt: string,
  options?: {
    system?: string;
    model?: string;
    maxTokens?: number;
  }
): Promise<T> {
  const system = `${options?.system || ""}\n\nIMPORTANT: Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks, sans texte avant ou après.`.trim();

  const result = await aiComplete(prompt, {
    ...options,
    system,
    temperature: 0.3,
  });

  // Clean potential markdown wrapping
  const cleaned = result
    .replace(/^```json?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();

  return JSON.parse(cleaned) as T;
}

export { DEFAULT_MODEL, SMART_MODEL };
