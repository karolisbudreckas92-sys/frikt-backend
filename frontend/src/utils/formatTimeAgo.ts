/**
 * Utility to format timestamps consistently as "about X ago"
 * Always uses UTC for both created_at and current time to ensure
 * all users see the same relative time regardless of timezone.
 */

export function formatTimeAgo(dateString: string): string {
  // Parse the date - assume UTC if no timezone specified
  let created: Date;
  if (dateString.endsWith('Z') || dateString.includes('+') || dateString.includes('-')) {
    created = new Date(dateString);
  } else {
    // Append Z to treat as UTC
    created = new Date(dateString + 'Z');
  }
  
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  
  // Handle negative diff (future dates, shouldn't happen but be safe)
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
    return 'about 1 minute ago';
  } else if (diffMinutes < 60) {
    return `about ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `about ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `about ${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else if (diffWeeks < 4) {
    return `about ${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
  } else {
    return `about ${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
  }
}

export default formatTimeAgo;
