// Number text helpers shared by form inputs. Form state keeps the plain value
// ("1234567.5", no separators); only the displayed text gets thousands commas.

/** Keeps digits and at most one decimal point, limited to `decimals` fraction digits. */
export function sanitizeNumberText(raw: string, decimals = 0): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  if (decimals <= 0) return cleaned.replace(/\./g, "").replace(/^0+(?=\d)/, "");

  const [integer = "", ...rest] = cleaned.split(".");
  const integerPart = integer.replace(/^0+(?=\d)/, "");
  if (rest.length === 0) return integerPart;
  return `${integerPart || "0"}.${rest.join("").slice(0, decimals)}`;
}

/** "1234567.5" -> "1,234,567.5" (a trailing "." is kept while typing). */
export function formatThousands(plain: string): string {
  if (!plain) return "";
  const [integer, fraction] = plain.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}
