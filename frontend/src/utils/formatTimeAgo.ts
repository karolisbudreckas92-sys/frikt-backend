/**
 * Utility to format timestamps consistently as "X ago"
 * Handles MongoDB UTC timestamps correctly.
 */

export function formatTimeAgo(dateString: string): string {
  if (!dateString) return 'just now';
  
  // Parse the date - MongoDB stores in format: "2026-03-07T21:24:19.087000"
  let created: Date;
  try {
    // If the date doesn't end with Z, append it to treat as UTC
    const normalizedDate = dateString.endsWith('Z') ? dateString : dateString + 'Z';
    created = new Date(normalizedDate);
    
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
