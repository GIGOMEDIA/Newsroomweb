import { env } from '@/utils/env';

import { buildQuestionPrompt } from './prompt';
import {
  streamBriefOpenAICompatible,
  streamQuestionOpenAICompatible,
} from './streamOpenAI';
import { AiProvider } from './types';

export const groqProvider: AiProvider = {
  enabled: Boolean(env.groqApiKey),
  id: 'groq',
  modelId: env.groqModel,
  name: 'Groq',
  streamBrief: (article, options) =>
    streamBriefOpenAICompatible(article, options, {
      apiKey: env.groqApiKey,
      baseUrl: env.groqApiBaseUrl,
      modelId: env.groqModel,
      providerId: 'groq',
      temperature: 0.3,
    }),
  streamQuestion: (article, question, options) =>
    streamQuestionOpenAICompatible(buildQuestionPrompt(article, question), options, {
      apiKey: env.groqApiKey,
      baseUrl: env.groqApiBaseUrl,
      modelId: env.groqModel,
      providerId: 'groq',
      temperature: 0.2,
    }),
};
