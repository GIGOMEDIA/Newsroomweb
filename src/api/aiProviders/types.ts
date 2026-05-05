import { Article } from '@/types/article';

export type BriefProgress = {
  tldr: string;
  whyItMatters: string[];
};

export type StreamBriefOptions = {
  onRawProgress?: (rawText: string) => void;
  signal?: AbortSignal;
};

export type ProviderId = 'groq' | 'cerebras' | 'openrouter';

export type AiProvider = {
  enabled: boolean;
  id: ProviderId;
  modelId: string;
  name: string;
  streamBrief: (
    article: Article,
    options: StreamBriefOptions,
  ) => Promise<string>;
  streamQuestion: (
    article: Article,
    question: string,
    options: StreamBriefOptions,
  ) => Promise<string>;
};

export class AiProviderError extends Error {
  providerId?: ProviderId;
  status?: number;

  constructor(
    message: string,
    opts?: { providerId?: ProviderId; status?: number },
  ) {
    super(message);
    this.name = 'AiProviderError';
    this.providerId = opts?.providerId;
    this.status = opts?.status;
  }
}
