import { Article } from '@/types/article';

import { buildBriefPrompt } from './prompt';
import {
  AiProviderError,
  ProviderId,
  StreamBriefOptions,
} from './types';

type OpenAIStreamConfig = {
  apiKey: string;
  baseUrl: string;
  extraHeaders?: Record<string, string>;
  modelId: string;
  providerId: ProviderId;
  temperature?: number;
};

type OpenAIDelta = {
  content?: string;
};

type OpenAIChoice = {
  delta?: OpenAIDelta;
  finish_reason?: string | null;
};

type OpenAIStreamChunk = {
  choices?: OpenAIChoice[];
  error?: { message?: string; code?: number | string };
};

const createAbortError = () => {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
};

const findEventBoundary = (buffer: string) => {
  const lf = buffer.indexOf('\n\n');
  const crlf = buffer.indexOf('\r\n\r\n');

  if (lf === -1) {
    return crlf === -1 ? null : { index: crlf, length: 4 };
  }
  if (crlf === -1 || lf < crlf) {
    return { index: lf, length: 2 };
  }
  return { index: crlf, length: 4 };
};

const streamPromptOpenAICompatible = (
  prompt: string,
  options: StreamBriefOptions,
  config: OpenAIStreamConfig,
): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!config.apiKey) {
      reject(
        new AiProviderError(`Missing API key for ${config.providerId}.`, {
          providerId: config.providerId,
        }),
      );
      return;
    }

    const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${config.apiKey}`);
    xhr.setRequestHeader('Accept', 'text/event-stream');

    if (config.extraHeaders) {
      for (const [headerName, headerValue] of Object.entries(
        config.extraHeaders,
      )) {
        xhr.setRequestHeader(headerName, headerValue);
      }
    }

    let lastIndex = 0;
    let buffer = '';
    let accumulated = '';

    const drainBuffer = () => {
      let boundary = findEventBoundary(buffer);
      while (boundary) {
        const event = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary.length);

        for (const line of event.split(/\r?\n/)) {
          if (!line.startsWith('data:')) continue;
          const dataStr = line.slice(5).trimStart();
          if (!dataStr || dataStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(dataStr) as OpenAIStreamChunk;
            const chunkText = parsed.choices?.[0]?.delta?.content;
            if (chunkText) {
              accumulated += chunkText;
              options.onRawProgress?.(accumulated);
            }
          } catch {
            // ignore malformed SSE event
          }
        }

        boundary = findEventBoundary(buffer);
      }
    };

    xhr.onprogress = () => {
      const next = xhr.responseText.slice(lastIndex);
      lastIndex = xhr.responseText.length;
      buffer += next;
      drainBuffer();
    };

    xhr.onerror = () => {
      reject(
        new AiProviderError(
          `Network error while streaming from ${config.providerId}.`,
          { providerId: config.providerId },
        ),
      );
    };

    xhr.onabort = () => {
      reject(createAbortError());
    };

    xhr.onload = () => {
      const tail = xhr.responseText.slice(lastIndex);
      lastIndex = xhr.responseText.length;
      buffer += tail;
      drainBuffer();

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(accumulated);
        return;
      }

      let message = `${config.providerId} returned an error.`;
      try {
        const parsed = JSON.parse(xhr.responseText) as {
          error?: { message?: string };
        };
        if (parsed.error?.message) {
          message = parsed.error.message;
        }
      } catch {
        // ignore non-JSON error body
      }

      reject(
        new AiProviderError(message, {
          providerId: config.providerId,
          status: xhr.status,
        }),
      );
    };

    if (options.signal) {
      if (options.signal.aborted) {
        xhr.abort();
        return;
      }
      options.signal.addEventListener('abort', () => xhr.abort());
    }

    const body = JSON.stringify({
      messages: [
        {
          content: prompt,
          role: 'user',
        },
      ],
      model: config.modelId,
      stream: true,
      temperature: config.temperature ?? 0.3,
    });

    xhr.send(body);
  });

export const streamBriefOpenAICompatible = (
  article: Article,
  options: StreamBriefOptions,
  config: OpenAIStreamConfig,
): Promise<string> =>
  streamPromptOpenAICompatible(buildBriefPrompt(article), options, config);

export const streamQuestionOpenAICompatible = (
  prompt: string,
  options: StreamBriefOptions,
  config: OpenAIStreamConfig,
): Promise<string> => streamPromptOpenAICompatible(prompt, options, config);
