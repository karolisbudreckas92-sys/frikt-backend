/**
 * Utility to format timestamps consistently as "X ago"
 * Handles MongoDB UTC timestamps correctly.
 */

/**
 * Parse a backend ISO date string as UTC.
 * MongoDB / FastAPI return naive ISO timestamps (no "Z"). Without normalization,
 * `new Date(str)` treats them as LOCAL time → wrong "X ago" by user's TZ offset.
 * This helper ensures the string is always interpreted as UTC.
 */
export function parseUTCDate(dateString: string): Date {
  if (!dateString) return new Date(NaN);
  // If string already has Z or +/-HH:MM offset, leave it alone.
  const hasTz = /Z$|[+-]\d{2}:?\d{2}$/.test(dateString);
  return new Date(hasTz ? dateString : dateString + 'Z');
}

export function formatTimeAgo(dateString: string): string {
  if (!dateString) return 'just now';
  
  // Parse the date - MongoDB stores naive UTC; normalize through helper.
  let created: Date;
  try {
    created = parseUTCDate(dateString);
    
    // Check if parsing failed
    if (isNaN(created.getTime())) {
      console.warn('[formatTimeAgo] Invalid date:', dateString);
      return 'just now';
    }
  } catch (e) {
    console.warn('[formatTimeAgo] Error parsing date:', dateString, e);
    return 'just now';
  }
  
  // Get current time in milliseconds
  const now = Date.now();
  const createdMs = created.getTime();
  const diffMs = now - createdMs;
  
  // Debug logging (remove in production)
  // console.log('[formatTimeAgo]', { dateString, createdMs, now, diffMs, diffHours: diffMs / 3600000 });
  
  // Handle negative diff (future dates or parsing errors)
  if (diffMs < 0) {
    return 'just now';
  }
  
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  
  if (diffMinutes < 1) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks}w ago`;
  } else {
    return `${diffMonths}mo ago`;
  }
}

export default formatTimeAgo;
