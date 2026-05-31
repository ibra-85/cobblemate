/**
 * Short, French, locale-free relative-time formatter for in-app lists
 * (saved teams, notes, …).
 *
 * `Intl.RelativeTimeFormat` would give us localisation for free but it
 * emits forms like "il y a 3 minutes" — too verbose when the value
 * lives inside a tight list row next to other metadata. We render the
 * short form ("il y a 3 min") plus a fallback to a real date once we
 * cross a week, which is where "il y a 12 j" stops being meaningful.
 *
 * Returns a stable French string regardless of the browser locale.
 */
export function formatRelativeTime(ts: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - ts);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 45) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  // > 1 week: drop the relative shape, the date itself is easier to
  // scan than "il y a 47 j". Year is omitted when it matches the
  // current year so a 3-week-old entry reads "27 mai" instead of
  // "27 mai 2026" — tighter for in-app lists.
  const d = new Date(ts);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
}
