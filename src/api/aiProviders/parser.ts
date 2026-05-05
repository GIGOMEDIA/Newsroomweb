import { AiProviderError, BriefProgress } from './types';

const TLDR_RE =
  /\*{0,2}TLDR\*{0,2}\s*:?\s*([\s\S]*?)(?=\n\s*\*{0,2}WHY\s+IT\s+MATTERS|$)/i;
const WHY_RE = /\*{0,2}WHY\s+IT\s+MATTERS\*{0,2}\s*:?\s*\n?([\s\S]*)$/i;
const BULLET_RE = /^\s*[-*•]\s*(.+?)\s*$/;

export const parsePartialBrief = (text: string): BriefProgress => {
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

export const parseFinalBrief = (
  raw: string,
): { tldr: string; whyItMatters: string[] } => {
  const trimmed = raw.trim();

  if (!trimmed) {
    throw new AiProviderError('AI provider returned an empty response.');
  }

  const partial = parsePartialBrief(trimmed);

  if (!partial.tldr) {
    throw new AiProviderError('AI response missing TLDR section.');
  }

  if (partial.whyItMatters.length === 0) {
    throw new AiProviderError('AI response had no usable bullets.');
  }

  return {
    tldr: partial.tldr,
    whyItMatters: partial.whyItMatters.slice(0, 3),
  };
};
