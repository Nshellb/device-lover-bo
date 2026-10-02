// Device images may be stored as site-relative paths ("/asset/galaxy-z-fold-6.jpg")
// that live in the FO's public folder. The BO runs on another origin, so previews
// there resolve such paths against the FO base URL.
const FO_BASE_URL = (process.env.NEXT_PUBLIC_FO_BASE_URL ?? "http://localhost:4000").replace(/\/$/, "");

export function resolveImageUrl(url: string): string {
  const trimmed = url.trim();
  return trimmed.startsWith("/") && !trimmed.startsWith("//") ? `${FO_BASE_URL}${trimmed}` : trimmed;
}
