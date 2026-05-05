import { env } from '@/utils/env';

import { buildQuestionPrompt } from './prompt';
import {
  streamBriefOpenAICompatible,
  streamQuestionOpenAICompatible,
} from './streamOpenAI';
import { AiProvider } from './types';

export const openrouterProvider: AiProvider = {
  enabled: Boolean(env.openrouterApiKey),
  id: 'openrouter',
  modelId: env.openrouterModel,
  name: 'OpenRouter',
  streamBrief: (article, options) =>
    streamBriefOpenAICompatible(article, options, {
      apiKey: env.openrouterApiKey,
      baseUrl: env.openrouterApiBaseUrl,
      extraHeaders: {
        'HTTP-Referer': 'https://crednews.app',
        'X-Title': 'CredNews',
      },
      modelId: env.openrouterModel,
      providerId: 'openrouter',
      temperature: 0.3,
    }),
  streamQuestion: (article, question, options) =>
    streamQuestionOpenAICompatible(buildQuestionPrompt(article, question), options, {
      apiKey: env.openrouterApiKey,
      baseUrl: env.openrouterApiBaseUrl,
      extraHeaders: {
        'HTTP-Referer': 'https://crednews.app',
        'X-Title': 'CredNews',
      },
      modelId: env.openrouterModel,
      providerId: 'openrouter',
      temperature: 0.2,
    }),
};
