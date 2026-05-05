import {
  AiProviderError,
  parseFinalBrief,
  streamBriefWithFallback,
  streamQuestionWithFallback,
} from '@/api/aiProviders';
import { GeminiApiError } from '@/api/geminiApi';
import { Article } from '@/types/article';
import { AiBrief } from '@/types/aiBrief';

export type AiQuestionResult = {
  answer: string;
};

type AiQuestionServiceOptions = {
  onRawProgress?: (rawText: string) => void;
  signal?: AbortSignal;
};

type AiBriefServiceOptions = {
  onRawProgress?: (rawText: string) => void;
  signal?: AbortSignal;
};

export type { BriefProgress } from '@/api/aiProviders';
export { AiProviderError } from '@/api/aiProviders';

/**
 * Maps any error from the AI provider chain into a user-facing string.
 * Distinguishes by error class:
 *   - `AiProviderError`: includes the offending provider id; 401/403 hint at
 *     bad keys, 429 surfaces "all providers throttled".
 *   - `GeminiApiError`: legacy direct-Gemini path, separate provider hint.
 * Falls through to the raw message or a generic copy if nothing matches.
 */
export const aiBriefErrorMessage = (error: unknown): string => {
  if (error instanceof AiProviderError) {
    if (error.status === 401 || error.status === 403) {
      return `${error.providerId ?? 'Provider'} key is invalid. Check your .env file.`;
    }
    if (error.status === 429) {
      return 'All AI providers are throttled. Try again in a minute.';
    }
    return error.message;
  }

  if (error instanceof GeminiApiError) {
    if (error.status === 401 || error.status === 403) {
      return 'Gemini API access failed. Check your API key.';
    }
    if (error.status === 429) {
      return 'Gemini rate limit reached. Try again in a moment.';
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to generate brief right now.';
};

export const aiBriefService = {
  /**
   * Generates the article's AI brief by streaming through the provider
   * chain (Groq → Cerebras → OpenRouter → Gemini, depending on which keys
   * are configured). Caller-supplied `onRawProgress` is invoked on every
   * chunk so the UI can render the typing-style reveal as text arrives.
   *
   * The streamed text is parsed into the final structured brief once
   * complete, then stamped with `generatedAt` and the resolved `model` id
   * so callers know which provider actually answered.
   */
  async generateBrief(
    article: Article,
    options?: AiBriefServiceOptions,
  ): Promise<AiBrief> {
    const { modelId, raw } = await streamBriefWithFallback(article, {
      onRawProgress: options?.onRawProgress,
      signal: options?.signal,
    });

    const parsed = parseFinalBrief(raw);

    return {
      ...parsed,
      generatedAt: new Date().toISOString(),
      model: modelId,
    };
  },

  /**
   * Asks an ad-hoc question about an article through the same streaming
   * provider chain. Pre-rejects on an empty question so we never spend a
   * provider call on whitespace, and rejects post-stream if the model
   * returned an empty answer (which can happen with content filters).
   */
  askQuestion(
    article: Article,
    question: string,
    options?: AiQuestionServiceOptions,
  ): Promise<AiQuestionResult> {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      return Promise.reject(new AiProviderError('Ask a question first.'));
    }

    return streamQuestionWithFallback(article, trimmedQuestion, {
      onRawProgress: options?.onRawProgress,
      signal: options?.signal,
    }).then(({ raw }) => {
      const answer = raw.trim();
      if (!answer) {
        throw new AiProviderError('AI provider returned an empty answer.');
      }
      return { answer };
    });
  },
};
