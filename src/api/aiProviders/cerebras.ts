import { env } from '@/utils/env';

import { buildQuestionPrompt } from './prompt';
import {
  streamBriefOpenAICompatible,
  streamQuestionOpenAICompatible,
} from './streamOpenAI';
import { AiProvider } from './types';

export const cerebrasProvider: AiProvider = {
  enabled: Boolean(env.cerebrasApiKey),
  id: 'cerebras',
  modelId: env.cerebrasModel,
  name: 'Cerebras',
  streamBrief: (article, options) =>
    streamBriefOpenAICompatible(article, options, {
      apiKey: env.cerebrasApiKey,
      baseUrl: env.cerebrasApiBaseUrl,
      modelId: env.cerebrasModel,
      providerId: 'cerebras',
      temperature: 0.3,
    }),
  streamQuestion: (article, question, options) =>
    streamQuestionOpenAICompatible(buildQuestionPrompt(article, question), options, {
      apiKey: env.cerebrasApiKey,
      baseUrl: env.cerebrasApiBaseUrl,
      modelId: env.cerebrasModel,
      providerId: 'cerebras',
      temperature: 0.2,
    }),
};
