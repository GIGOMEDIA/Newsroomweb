import { Article } from '@/types/article';

import { cerebrasProvider } from './cerebras';
import { groqProvider } from './groq';
import { openrouterProvider } from './openrouter';
import { parseFinalBrief } from './parser';
import {
  AiProvider,
  AiProviderError,
  ProviderId,
  StreamBriefOptions,
} from './types';

const COOLDOWN_RATE_LIMIT_MS = 60_000;
const COOLDOWN_SERVER_ERROR_MS = 30_000;
const COOLDOWN_CLIENT_ERROR_MS = 10 * 60_000;
const COOLDOWN_NETWORK_ERROR_MS = 15_000;

const allProviders: AiProvider[] = [
  groqProvider,
  cerebrasProvider,
  openrouterProvider,
];

const cooldownUntil = new Map<ProviderId, number>();
let rrCounter = 0;

const isCoolingDown = (id: ProviderId): boolean => {
  const until = cooldownUntil.get(id);
  if (until === undefined) return false;
  if (Date.now() >= until) {
    cooldownUntil.delete(id);
    return false;
  }
  return true;
};

const markCoolingDown = (id: ProviderId, ms: number) => {
  cooldownUntil.set(id, Date.now() + ms);
};

const cooldownForError = (error: unknown): number => {
  if (error instanceof AiProviderError && error.status !== undefined) {
    if (error.status === 429) return COOLDOWN_RATE_LIMIT_MS;
    if (error.status >= 500) return COOLDOWN_SERVER_ERROR_MS;
    if (error.status >= 400) return COOLDOWN_CLIENT_ERROR_MS;
  }
  return COOLDOWN_NETWORK_ERROR_MS;
};

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

const enabledProviders = (): AiProvider[] =>
  allProviders.filter((provider) => provider.enabled);

const pickNextAvailable = (
  triedProviderIds: Set<ProviderId>,
): AiProvider | null => {
  const candidates = enabledProviders().filter(
    (provider) =>
      !triedProviderIds.has(provider.id) && !isCoolingDown(provider.id),
  );
  if (candidates.length === 0) return null;

  const provider = candidates[rrCounter % candidates.length];
  rrCounter = (rrCounter + 1) % 1_000_000;
  return provider;
};

export const streamBriefWithFallback = async (
  article: Article,
  options: StreamBriefOptions,
): Promise<{
  raw: string;
  providerId: ProviderId;
  modelId: string;
}> => {
  if (enabledProviders().length === 0) {
    throw new AiProviderError(
      'No AI providers configured. Add a Groq, Cerebras, or OpenRouter API key to your .env.',
    );
  }

  const tried = new Set<ProviderId>();
  let lastError: unknown;

  while (tried.size < enabledProviders().length) {
    const provider = pickNextAvailable(tried);
    if (!provider) break;
    tried.add(provider.id);

    try {
      const raw = await provider.streamBrief(article, options);
      return { modelId: provider.modelId, providerId: provider.id, raw };
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      markCoolingDown(provider.id, cooldownForError(error));
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new AiProviderError(
    'All AI providers are currently unavailable. Try again in a moment.',
  );
};

export const streamQuestionWithFallback = async (
  article: Article,
  question: string,
  options: StreamBriefOptions,
): Promise<{
  modelId: string;
  providerId: ProviderId;
  raw: string;
}> => {
  if (enabledProviders().length === 0) {
    throw new AiProviderError(
      'No AI providers configured. Add a Groq, Cerebras, or OpenRouter API key to your .env.',
    );
  }

  const tried = new Set<ProviderId>();
  let lastError: unknown;

  while (tried.size < enabledProviders().length) {
    const provider = pickNextAvailable(tried);
    if (!provider) break;
    tried.add(provider.id);

    try {
      const raw = await provider.streamQuestion(article, question, options);
      return { modelId: provider.modelId, providerId: provider.id, raw };
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      markCoolingDown(provider.id, cooldownForError(error));
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new AiProviderError(
    'All AI providers are currently unavailable. Try again in a moment.',
  );
};

export { parseFinalBrief };
export type { ProviderId } from './types';
