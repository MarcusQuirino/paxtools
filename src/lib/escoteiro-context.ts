import { formatGroupIdentity } from "@/lib/group-identity";
import { RAMO_LABELS, type Ramo } from "@/lib/ramos";

/**
 * The context eyebrow shown above the page title on the escoteiro tabs:
 * "Ramo Escoteiro · 38/RS". Either half is dropped when unknown (no ramo yet,
 * no grupo / no numeral); returns null when there is nothing to show.
 */
export function formatEscoteiroContext(
  ramo: Ramo | null | undefined,
  groupNumber: string | null | undefined,
  groupRegiao: string | null | undefined,
): string | null {
  const parts = [
    ramo ? `Ramo ${RAMO_LABELS[ramo]}` : null,
    formatGroupIdentity(groupNumber, groupRegiao),
  ].filter((p): p is string => !!p);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * Up to two initials for an avatar: first + last word of the name ("Rafael
 * Andrade" → "RA", "Ana" → "A"), else the email's first letter, else "?".
 */
export function avatarInitials(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length > 0) {
    const first = words[0]!.charAt(0);
    const last = words.length > 1 ? words[words.length - 1]!.charAt(0) : "";
    return (first + last).toUpperCase();
  }
  const e = email?.trim();
  if (e) return e.charAt(0).toUpperCase();
  return "?";
}
