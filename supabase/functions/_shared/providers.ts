/**
 * LLM provider abstraction. The gateway only talks to `LlmProvider`, so a
 * different vendor can be added without touching retrieval, validation,
 * storage or the app. Selection and model choice are server-side env vars:
 *   AI_PROVIDER = anthropic | disabled
 *   AI_MODEL    = model id (default below)
 *   AI_EFFORT   = low | medium | high (default low — conversational answers)
 */
import Anthropic from 'npm:@anthropic-ai/sdk@1.8.0';

export interface GenerateRequest {
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  jsonSchema: Record<string, unknown>;
  maxTokens: number;
  timeoutMs: number;
}

export interface GenerateResult {
  /** Parsed JSON from the model, or null when the model declined. */
  data: unknown | null;
  refused: boolean;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface LlmProvider {
  readonly name: string;
  generateStructured(req: GenerateRequest): Promise<GenerateResult>;
}

export class ProviderUnavailableError extends Error {}

class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  private client: Anthropic;
  constructor(private model: string, private effort: 'low' | 'medium' | 'high') {
    // Key comes only from the server environment — never from the app.
    this.client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY'), maxRetries: 1 });
  }

  async generateStructured(req: GenerateRequest): Promise<GenerateResult> {
    try {
      const response = await this.client.beta.messages.create(
        {
          model: this.model,
          max_tokens: req.maxTokens,
          system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
          messages: req.messages,
          output_config: { effort: this.effort, format: { type: 'json_schema', schema: req.jsonSchema } },
          // On a safety decline, let the API re-route to a suitable model in the same call.
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
        },
        { timeout: req.timeoutMs },
      );
      const usage = { model: response.model, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
      if (response.stop_reason === 'refusal') return { data: null, refused: true, ...usage };
      if (response.stop_reason === 'max_tokens') throw new ProviderUnavailableError('response truncated');
      const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
      return { data: JSON.parse(text), refused: false, ...usage };
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) throw new ProviderUnavailableError('rate_limited');
      if (err instanceof Anthropic.APIConnectionError) throw new ProviderUnavailableError('connection');
      if (err instanceof Anthropic.APIError) throw new ProviderUnavailableError(`api_${err.status ?? 'error'}`);
      if (err instanceof SyntaxError) throw new ProviderUnavailableError('invalid_json');
      throw err;
    }
  }
}

export function getProvider(): LlmProvider | null {
  const provider = Deno.env.get('AI_PROVIDER') ?? 'disabled';
  const effort = (Deno.env.get('AI_EFFORT') ?? 'low') as 'low' | 'medium' | 'high';
  if (provider === 'anthropic' && Deno.env.get('ANTHROPIC_API_KEY')) {
    return new AnthropicProvider(Deno.env.get('AI_MODEL') ?? 'claude-opus-5-5', effort);
  }
  return null;
}
