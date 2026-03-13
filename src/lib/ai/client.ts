import OpenAI from "openai";

// ---------------------------------------------------------------------------
// OpenRouter AI Client — centralized for the whole app
// Resolves API key dynamically via getApiKey() (env → org_settings fallback)
// ---------------------------------------------------------------------------

let _openrouter: OpenAI | null = null;
let _cachedKey: string | null = null;

async function getOpenRouterClient(): Promise<OpenAI> {
  // Dynamic import to avoid "use server" module boundary issues
  const { getApiKey } = await import("@/lib/api-keys");
  const key = await getApiKey("OPENROUTER_API_KEY");

  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY non configurée. Ajoutez-la dans les variables d'environnement ou dans Paramètres > Intégrations."
    );
  }

  // Re-create client if key changed
  if (!_openrouter || _cachedKey !== key) {
    _openrouter = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: key,
    });
    _cachedKey = key;
  }

  return _openrouter;
}

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

  const client = await getOpenRouterClient();
  const response = await client.chat.completions.create({
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
  const client = await getOpenRouterClient();
  const response = await client.chat.completions.create({
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
