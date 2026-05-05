/**
 * Formats an ISO date string as an uppercase short label (e.g. "29 APR")
 * for use in story headers and card metadata.
 */
export const formatStoryDate = (value: string) =>
  new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
  })
    .format(new Date(value))
    .toUpperCase();

/**
 * Converts an ISO timestamp into a human-readable "ABOUT N MINUTES/HOURS/DAYS AGO"
 * label. Falls back to "RECENTLY" if the input cannot be parsed, and clamps the
 * minimum bucket to 1 minute so freshly published items don't read "0 minutes ago".
 */
export const getRelativePublishedTime = (value: string) => {
  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return 'RECENTLY';
  }

  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.max(1, Math.round(diff / (1000 * 60)));

  if (minutes < 60) {
    return `ABOUT ${minutes} ${minutes === 1 ? 'MINUTE' : 'MINUTES'} AGO`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `ABOUT ${hours} ${hours === 1 ? 'HOUR' : 'HOURS'} AGO`;
  }

  const days = Math.round(hours / 24);

  return `ABOUT ${days} ${days === 1 ? 'DAY' : 'DAYS'} AGO`;
};
