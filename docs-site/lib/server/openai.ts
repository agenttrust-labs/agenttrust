import 'server-only';

import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

export const ASK_AI_MODEL = 'gpt-4o-mini';

export interface OpenAIProvider {
  chatModel(modelId?: string): LanguageModel;
}

export class MissingOpenAIKeyError extends Error {
  constructor() {
    super('OPENAI_API_KEY is not configured');
    this.name = 'MissingOpenAIKeyError';
  }
}

class EnvironmentOpenAIProvider implements OpenAIProvider {
  constructor(private readonly apiKey: string) {}

  chatModel(modelId: string = ASK_AI_MODEL): LanguageModel {
    const provider = createOpenAI({ apiKey: this.apiKey });
    return provider(modelId);
  }
}

export function createOpenAIProvider(): OpenAIProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new MissingOpenAIKeyError();
  return new EnvironmentOpenAIProvider(apiKey);
}
