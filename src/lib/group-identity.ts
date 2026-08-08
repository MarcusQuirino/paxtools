/**
 * How a grupo escoteiro is identified to a signed-in user: its numeral and
 * its região escoteira, written "38/RS". A grupo with no região falls back to
 * the numeral alone — never a dangling slash. Returns null when there is no
 * numeral to show.
 */
export function formatGroupIdentity(
  number: string | null | undefined,
  regiao: string | null | undefined,
): string | null {
  const numeral = number?.trim();
  if (!numeral) return null;
  const uf = regiao?.trim();
  return uf ? `${numeral}/${uf}` : numeral;
}
