/**
 * Format a bigint timestamp (milliseconds) to a human-readable date string.
 */
export function formatDate(ts: bigint | undefined | null): string {
  if (!ts) return "—";
  const ms = Number(ts);
  if (Number.isNaN(ms) || ms === 0) return "—";
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Get an AMC status string based on the end date.
 */
export function getAMCStatus(
  amcEndDate: bigint,
): "expired" | "expiring" | "good" {
  const now = Date.now();
  const endMs = Number(amcEndDate);
  if (endMs < now) return "expired";
  if (endMs - now < 30 * 24 * 60 * 60 * 1000) return "expiring";
  return "good";
}

/**
 * Convert a date string (YYYY-MM-DD) to bigint milliseconds.
 */
export function dateToBigInt(dateStr: string): bigint {
  if (!dateStr) return BigInt(0);
  const ms = new Date(dateStr).getTime();
  return BigInt(Number.isNaN(ms) ? 0 : ms);
}

/**
 * Convert a bigint milliseconds timestamp to YYYY-MM-DD string.
 */
export function bigIntToDateStr(ts: bigint | undefined | null): string {
  if (!ts || ts === BigInt(0)) return "";
  const ms = Number(ts);
  if (Number.isNaN(ms) || ms === 0) return "";
  const d = new Date(ms);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
