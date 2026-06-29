// Pure, testable helpers for the redirect machine. No React, no side effects
// except where noted. See Outbox/MeoSanSales-Redirect-StateMachine-Architecture.

export type Platform = "ios" | "android" | "desktop";
export type Network = "accesstrade" | "involve" | "adpia" | "direct";

// Affiliate-network → SubID query param. (Verify exact names/limits per network
// before relying on attribution; pre-shortened links may not pass it through.)
const SUBID_PARAM: Record<Network, string> = {
  accesstrade: "aff_sub",
  involve: "aff_sub",
  adpia: "sub1",
  direct: "utm_content",
};

// Known affiliate shortener hosts → network (extend as you add programs).
const NETWORK_HOSTS: { match: RegExp; network: Network }[] = [
  { match: /shorten\.asia/i, network: "accesstrade" },
  { match: /invl\.me/i, network: "involve" },
  { match: /adpvn\.top/i, network: "adpia" },
];

export function detectPlatform(): Platform {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "desktop";
}

export function detectNetwork(url: string): Network {
  for (const n of NETWORK_HOSTS) if (n.match.test(url)) return n.network;
  return "direct";
}

export function buildSubId(userId: string | null, tripId: string): string {
  return `${userId ?? "guest"}.${tripId}`;
}

/**
 * Compose the final tracking URL. If the link is a known shortener we leave it
 * untouched (the SubID can't be appended to a pre-baked shortlink); otherwise
 * we attach the network's SubID param. Never throws — falls back to the input.
 */
export function composeFinalUrl(url: string, network: Network, subId: string): string {
  try {
    const isShortener = NETWORK_HOSTS.some((n) => n.match.test(url));
    if (isShortener || network === "direct") return url;
    const u = new URL(url);
    u.searchParams.set(SUBID_PARAM[network], subId);
    return u.toString();
  } catch {
    return url;
  }
}

// Known VN merchant Android package names for intent:// deep links.
const ANDROID_PKG: Record<string, string> = {
  shopee: "com.shopee.vn",
  lazada: "com.lazada.android",
  tiktok: "com.ss.android.ugc.trill",
  tiki: "vn.tiki.app.tikiandroid",
};

function pkgForHost(host: string): string | null {
  const h = host.toLowerCase();
  for (const key of Object.keys(ANDROID_PKG)) if (h.includes(key)) return ANDROID_PKG[key];
  return null;
}

/**
 * App deep-link for the destination, or null to use the web URL.
 * - Android: intent:// with package + browser_fallback_url baked in.
 * - iOS: the https universal link (the OS routes to the app if installed).
 * - Desktop / unknown merchant: null (skips deep-linking — avoids the
 *   *.page.link blank-screen trap on desktop).
 */
export function buildAppLink(finalUrl: string, platform: Platform): string | null {
  let u: URL;
  try {
    u = new URL(finalUrl);
  } catch {
    return null;
  }
  if (platform === "android") {
    const pkg = pkgForHost(u.host);
    if (!pkg) return null;
    return (
      `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=${pkg};` +
      `S.browser_fallback_url=${encodeURIComponent(finalUrl)};end`
    );
  }
  if (platform === "ios") return finalUrl; // universal link
  return null; // desktop
}
