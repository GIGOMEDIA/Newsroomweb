import { Article } from '@/types/article';
import { AiBrief } from '@/types/aiBrief';
import { env } from '@/utils/env';

type GeminiPart = {
  text?: string;
};

type GeminiContent = {
  parts?: GeminiPart[];
  role?: string;
};

type GeminiCandidate = {
  content?: GeminiContent;
  finishReason?: string;
};

type GeminiErrorBody = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type GeminiResponse = GeminiErrorBody & {
  candidates?: GeminiCandidate[];
};

type RequestOptions = {
  signal?: AbortSignal;
};

export type BriefProgress = {
  tldr: string;
  whyItMatters: string[];
};

type StreamBriefOptions = RequestOptions & {
  onProgress?: (partial: BriefProgress) => void;
};

type StreamTextOptions = RequestOptions & {
  onRawProgress?: (rawText: string) => void;
};

export class GeminiApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'GeminiApiError';
    this.status = status;
  }
}

const createAbortError = () => {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
};

const buildPrompt = (article: Article) => {
  const cleanedContent = article.content
    .replace(/\[\+\d+\s*chars?]/gi, '')
    .trim();

  return [
    'You are writing a neutral 60-second news brief for the CredNews app.',
    'Use ONLY the information provided below. Do not invent facts, sources, dates, or numbers.',
    'If the article is too short to support a particular bullet, write a verifiable observation about the gap (e.g. "Article does not name the new director.") instead of speculating.',
    '',
    `TITLE: ${article.title}`,
    `SOURCE: ${article.source.name}`,
    `PUBLISHED: ${article.publishedAt}`,
    `DESCRIPTION: ${article.description || '(none)'}`,
    `EXCERPT: ${cleanedContent || '(none)'}`,
    '',
    'Output EXACTLY in this format with the headers verbatim and no other text:',
    '',
    'TLDR: <one or two sentences, max ~40 words>',
    '',
    'WHY IT MATTERS:',
    '- <first bullet, max ~22 words>',
    '- <second bullet, max ~22 words>',
    '- <third bullet, max ~22 words>',
  ].join('\n');
};

const buildQuestionPrompt = (article: Article, question: string) => {
  const cleanedContent = article.content
    .replace(/\[\+\d+\s*chars?]/gi, '')
    .trim();

  return [
    'You are the CredNews article assistant.',
    'Answer the user question using ONLY the article information below.',
    'If the article does not contain enough information, say that clearly and suggest what the user should verify from the original source.',
    'Do not invent facts, names, quotes, dates, numbers, or context.',
    'Keep the answer concise: 2-4 short sentences.',
    '',
    `TITLE: ${article.title}`,
    `SOURCE: ${article.source.name}`,
    `PUBLISHED: ${article.publishedAt}`,
    `DESCRIPTION: ${article.description || '(none)'}`,
    `EXCERPT: ${cleanedContent || '(none)'}`,
    '',
    `QUESTION: ${question.trim()}`,
  ].join('\n');
};

const extractJsonText = (response: GeminiResponse) => {
  const parts = response.candidates?.[0]?.content?.parts ?? [];

  for (const part of parts) {
    if (part.text) {
      return part.text;
    }
  }

  return '';
};

const TLDR_RE = /\*{0,2}TLDR\*{0,2}\s*:?\s*([\s\S]*?)(?=\n\s*\*{0,2}WHY\s+IT\s+MATTERS|$)/i;
const WHY_RE = /\*{0,2}WHY\s+IT\s+MATTERS\*{0,2}\s*:?\s*\n?([\s\S]*)$/i;
const BULLET_RE = /^\s*[-*•]\s*(.+?)\s*$/;

const parsePartialBrief = (text: string): BriefProgress => {
  const result: BriefProgress = { tldr: '', whyItMatters: [] };

  const tldrMatch = TLDR_RE.exec(text);
  if (tldrMatch) {
    result.tldr = tldrMatch[1].trim();
  }

  const whyMatch = WHY_RE.exec(text);
  if (whyMatch) {
    const lines = whyMatch[1].split('\n');
    for (const line of lines) {
      const bulletMatch = BULLET_RE.exec(line);
      if (!bulletMatch) continue;
      const bullet = bulletMatch[1].trim();
      if (bullet.length === 0) continue;
      result.whyItMatters.push(bullet);
      if (result.whyItMatters.length === 3) break;
    }
  }

  return result;
};

const parseBrief = (raw: string): Pick<AiBrief, 'tldr' | 'whyItMatters'> => {
  const trimmed = raw.trim();

  if (!trimmed) {
    throw new GeminiApiError('Gemini returned an empty response.');
  }

  const partial = parsePartialBrief(trimmed);

  if (!partial.tldr) {
    throw new GeminiApiError('Gemini response missing TLDR section.');
  }

  if (partial.whyItMatters.length === 0) {
    throw new GeminiApiError('Gemini response had no usable bullets.');
  }

  return {
    tldr: partial.tldr,
    whyItMatters: partial.whyItMatters.slice(0, 3),
  };
};

const briefRequestBody = (article: Article) =>
  JSON.stringify({
    contents: [
      {
        role: 'user',
        parts: [{ text: buildPrompt(article) }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
    },
  });

const streamBriefViaXHR = (
  article: Article,
  options: StreamBriefOptions,
): Promise<string> =>
  new Promise((resolve, reject) => {
    const url = `${env.geminiApiBaseUrl}/models/${env.geminiModel}:streamGenerateContent?alt=sse`;
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('x-goog-api-key', env.geminiApiKey);
    xhr.setRequestHeader('Accept', 'text/event-stream');

    let lastIndex = 0;
    let buffer = '';
    let accumulatedJson = '';

    const findEventBoundary = () => {
      const lfIndex = buffer.indexOf('\n\n');
      const crlfIndex = buffer.indexOf('\r\n\r\n');

      if (lfIndex === -1) {
        return crlfIndex === -1
          ? null
          : { index: crlfIndex, length: '\r\n\r\n'.length };
      }

      if (crlfIndex === -1 || lfIndex < crlfIndex) {
        return { index: lfIndex, length: '\n\n'.length };
      }

      return { index: crlfIndex, length: '\r\n\r\n'.length };
    };

    const drainBuffer = () => {
      let boundary = findEventBoundary();
      while (boundary) {
        const event = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary.length);

        for (const line of event.split(/\r?\n/)) {
          if (!line.startsWith('data:')) continue;
          const dataStr = line.slice(5).trimStart();
          if (!dataStr || dataStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(dataStr) as GeminiResponse;
            const chunkText = extractJsonText(parsed);
            if (chunkText) {
              accumulatedJson += chunkText;
              options.onProgress?.(parsePartialBrief(accumulatedJson));
            }
          } catch {
            // ignore malformed SSE event
          }
        }

        boundary = findEventBoundary();
      }
    };

    xhr.onprogress = () => {
      const next = xhr.responseText.slice(lastIndex);
      lastIndex = xhr.responseText.length;
      buffer += next;
      drainBuffer();
    };

    xhr.onerror = () => {
      reject(new GeminiApiError('Network error while streaming brief.'));
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
        resolve(accumulatedJson);
        return;
      }

      let message = 'Unable to generate brief right now.';
      try {
        const errorBody = JSON.parse(xhr.responseText) as GeminiErrorBody;
        message = errorBody.error?.message ?? message;
      } catch {
        // ignore
      }
      reject(new GeminiApiError(message, xhr.status));
    };

    if (options.signal) {
      if (options.signal.aborted) {
        xhr.abort();
        return;
      }
      options.signal.addEventListener('abort', () => xhr.abort());
    }

    xhr.send(briefRequestBody(article));
  });

const streamTextViaXHR = (
  prompt: string,
  options: StreamTextOptions,
  temperature: number,
): Promise<string> =>
  new Promise((resolve, reject) => {
    const url = `${env.geminiApiBaseUrl}/models/${env.geminiModel}:streamGenerateContent?alt=sse`;
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('x-goog-api-key', env.geminiApiKey);
    xhr.setRequestHeader('Accept', 'text/event-stream');

    let lastIndex = 0;
    let buffer = '';
    let accumulated = '';

    const findEventBoundary = () => {
      const lfIndex = buffer.indexOf('\n\n');
      const crlfIndex = buffer.indexOf('\r\n\r\n');

      if (lfIndex === -1) {
        return crlfIndex === -1
          ? null
          : { index: crlfIndex, length: '\r\n\r\n'.length };
      }

      if (crlfIndex === -1 || lfIndex < crlfIndex) {
        return { index: lfIndex, length: '\n\n'.length };
      }

      return { index: crlfIndex, length: '\r\n\r\n'.length };
    };

    const drainBuffer = () => {
      let boundary = findEventBoundary();
      while (boundary) {
        const event = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary.length);

        for (const line of event.split(/\r?\n/)) {
          if (!line.startsWith('data:')) continue;
          const dataStr = line.slice(5).trimStart();
          if (!dataStr || dataStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(dataStr) as GeminiResponse;
            const chunkText = extractJsonText(parsed);
            if (chunkText) {
              accumulated += chunkText;
              options.onRawProgress?.(accumulated);
            }
          } catch {
            // ignore malformed SSE event
          }
        }

        boundary = findEventBoundary();
      }
    };

    xhr.onprogress = () => {
      const next = xhr.responseText.slice(lastIndex);
      lastIndex = xhr.responseText.length;
      buffer += next;
      drainBuffer();
    };

    xhr.onerror = () => {
      reject(new GeminiApiError('Network error while streaming answer.'));
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

      let message = 'Unable to answer right now.';
      try {
        const errorBody = JSON.parse(xhr.responseText) as GeminiErrorBody;
        message = errorBody.error?.message ?? message;
      } catch {
        // ignore
      }
      reject(new GeminiApiError(message, xhr.status));
    };

    if (options.signal) {
      if (options.signal.aborted) {
        xhr.abort();
        return;
      }
      options.signal.addEventListener('abort', () => xhr.abort());
    }

    xhr.send(
      JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature,
        },
      }),
    );
  });

export const geminiApi = {
  async generateBrief(
    article: Article,
    options?: StreamBriefOptions,
  ): Promise<AiBrief> {
    if (!env.geminiApiKey) {
      throw new GeminiApiError('Add your Gemini API key to the .env file.');
    }

    const accumulatedJson = await streamBriefViaXHR(article, options ?? {});
    const parsed = parseBrief(accumulatedJson);

    return {
      ...parsed,
      generatedAt: new Date().toISOString(),
      model: env.geminiModel,
    };
  },

  async answerQuestion(
    article: Article,
    question: string,
    options?: StreamTextOptions,
  ): Promise<string> {
    if (!env.geminiApiKey) {
      throw new GeminiApiError('Add your Gemini API key to the .env file.');
    }

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      throw new GeminiApiError('Ask a question first.');
    }

    const answer = (
      await streamTextViaXHR(
        buildQuestionPrompt(article, trimmedQuestion),
        options ?? {},
        0.2,
      )
    ).trim();

    if (!answer) {
      throw new GeminiApiError('Gemini returned an empty answer.');
    }

    return answer;
  },
};
