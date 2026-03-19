/**
 * Returns the current month in YYYY-MM format.
 * Useful for default values in <input type="month" />
 */
export function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Safely formats a date string (like YYYY-MM-DD) for display
 * handles timezone offsets for date-only strings to avoid "day before" bugs
 */
export function formatDate(dateString?: string): string {
  if (!dateString) return "Not specified";
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  // If it's a date-only string (YYYY-MM-DD), use UTC to avoid local timezone offset
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateString);
  
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(isDateOnly && { timeZone: "UTC" }),
  });
}
