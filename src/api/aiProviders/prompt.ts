import { Article } from '@/types/article';

export const buildBriefPrompt = (article: Article): string => {
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

export const buildQuestionPrompt = (
  article: Article,
  question: string,
): string => {
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
