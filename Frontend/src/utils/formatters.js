// YouTube-style relative publish date: "1h ago" / "3 days ago" up to 7
// days old, then a plain absolute date ("17 Sep 2025") after that.
export function formatRelativeDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays <= 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// YouTube-style compact count: 1234 -> "1.2K", 3400000 -> "3.4M".
export function formatCount(n) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return null;
  const num = Number(n);
  if (num < 1000) return String(num);
  if (num < 1_000_000) return `${(num / 1000).toFixed(num % 1000 >= 100 ? 1 : 0)}K`;
  return `${(num / 1_000_000).toFixed(num % 1_000_000 >= 100_000 ? 1 : 0)}M`;
}

// YouTube-style duration: MM:SS, or H:MM:SS once it reaches an hour.
export function formatDuration(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined || !Number.isFinite(totalSeconds)) return null;
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}
