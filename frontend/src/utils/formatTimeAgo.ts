/**
 * Utility to format timestamps consistently as "about X ago"
 * Always uses UTC for both created_at and current time to ensure
 * all users see the same relative time regardless of timezone.
 */

export function formatTimeAgo(dateString: string): string {
  if (!dateString) return 'just now';
  
  // Parse the date - always treat as UTC
  let created: Date;
  try {
    // Remove any existing timezone indicator and treat as UTC
    const cleanDate = dateString.replace('Z', '').split('+')[0].split('-').slice(0, 3).join('-') + 
                      'T' + (dateString.includes('T') ? dateString.split('T')[1].split('+')[0].split('Z')[0] : '00:00:00');
    
    // Parse as UTC by appending Z
    created = new Date(cleanDate + 'Z');
  } catch (e) {
    // Fallback: try direct parsing with Z appended
    created = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
  }
  
  // Use UTC time for "now" as well
  const now = new Date();
  const nowUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds()
  );
  
  const diffMs = nowUtc - created.getTime();
  
  // Handle negative diff (future dates or parsing errors)
  if (diffMs < 0 || isNaN(diffMs)) {
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
