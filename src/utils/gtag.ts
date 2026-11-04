// Google Analytics 4. Enabled only in production builds that carry a valid measurement ID
// (NEXT_PUBLIC_GA_ID, see .env.production). The text typed into the editor is never read.

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_ID_PATTERN = /^G-[A-Z0-9]{6,}$/;

export function isValidGaId(id: string | undefined): id is string {
  return id !== undefined && GA_ID_PATTERN.test(id);
}

const configuredId = process.env.NEXT_PUBLIC_GA_ID;

export const ANALYTICS_ENABLED =
  process.env.NODE_ENV === "production" && isValidGaId(configuredId);

export function trackEvent(name: string, params: Record<string, string | number> = {}) {
  if (!ANALYTICS_ENABLED || typeof window === "undefined" ||
      window.location.hostname !== "tiktokenizer.chatgptcn.com") return;
  window.gtag?.("event", name, params);
}
