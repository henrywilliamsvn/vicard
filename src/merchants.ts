// =============================================================================
// merchants.ts — the one place that knows "which sàn is this link, and what can
// we stack on it". Replaces the inline detectMerchant() map in BuyFlow.tsx.
//
// Matching is HOST-based (parse the URL), never substring — so a blog post at
// example.com/shopee-review does NOT get treated as a Shopee product link.
//
// Voucher/portal numbers are ESTIMATES that change daily. `lastChecked` makes a
// stale estimate visible. computeBenefit() (benefit.ts) always labels these as
// estimates in the UI — the moat is trust, so never present an estimate as fixed.
// =============================================================================

import type { SpendCategory } from "./cards";
import type { Network } from "./redirect/adapters";

export interface MerchantVoucher {
  /** Estimated affiliate-exclusive voucher rate, e.g. 0.08 = up to 8%. */
  pct: number;
  /** Cash cap on that voucher, in VND. */
  capVND: number;
  /** Short human label, shown on the voucher line. */
  label: string;
  /** ISO date the estimate was last confirmed. */
  lastChecked: string;
}

export interface MerchantPortal {
  /** Must match a `name` in rewardSources.ts so links resolve via rewardLink(). */
  name: string;
  /** Estimated extra cashback rate when the purchase is opened via the portal. */
  pct: number;
}

export interface Merchant {
  id: string;
  name: string;
  category: SpendCategory;
  /** Host patterns tested against the URL's hostname (www. stripped). */
  hostPatterns: RegExp[];
  /** Affiliate network used to compose the tracked buy-link (redirect/adapters.ts). */
  network: Network;
  /** True once we actually hold a working tracked link for this merchant. */
  affiliateReady: boolean;
  voucher?: MerchantVoucher;
  portal?: MerchantPortal;
  /** Set a flag true when a layer legitimately can't stack on this merchant. */
  stackExclusions?: { portal?: boolean; voucher?: boolean };
  note?: string;
}

// ShopBack is your default online cashback portal (see rewardSources.ts).
const SHOPBACK = (pct: number): MerchantPortal => ({ name: "ShopBack", pct });

export const MERCHANTS: Merchant[] = [
  {
    id: "shopeefood",
    name: "ShopeeFood",
    category: "dining",
    hostPatterns: [/(^|\.)shopeefood\.vn$/i],
    network: "adpia",
    affiliateReady: true,
    note: "Food delivery — dining category, not online shopping.",
  },
  {
    id: "shopee",
    name: "Shopee",
    category: "online",
    hostPatterns: [/(^|\.)shopee\.vn$/i, /(^|\.)shopee\.com$/i],
    network: "adpia", // approved Adpia link in links.ts (adpvn.top). Product-level
                      // tracking waits on the Shopee Affiliate Open API keys.
    affiliateReady: true,
    voucher: { pct: 0.08, capVND: 150_000, label: "Voucher độc quyền qua Meo", lastChecked: "2026-07-23" },
    portal: SHOPBACK(0.03),
  },
  {
    id: "lazada",
    name: "Lazada",
    category: "online",
    hostPatterns: [/(^|\.)lazada\.vn$/i, /(^|\.)lazada\.com\.vn$/i],
    network: "accesstrade",
    affiliateReady: false, // Adpia/AccessTrade Lazada deeplink pending
    voucher: { pct: 0.06, capVND: 120_000, label: "Voucher độc quyền qua Meo", lastChecked: "2026-07-23" },
    portal: SHOPBACK(0.03),
  },
  {
    id: "tiktok",
    name: "TikTok Shop",
    category: "online",
    hostPatterns: [/(^|\.)tiktok\.com$/i, /(^|\.)shop\.tiktok\.com$/i],
    network: "accesstrade",
    affiliateReady: true, // shorten.asia link in links.ts
    voucher: { pct: 0.10, capVND: 100_000, label: "Voucher độc quyền qua Meo", lastChecked: "2026-07-23" },
    portal: SHOPBACK(0.025),
  },
  {
    id: "tiki",
    name: "Tiki",
    category: "online",
    hostPatterns: [/(^|\.)tiki\.vn$/i, /(^|\.)tiki\.com\.vn$/i],
    network: "accesstrade",
    affiliateReady: true, // shorten.asia link in links.ts
    voucher: { pct: 0.05, capVND: 100_000, label: "Voucher độc quyền qua Meo", lastChecked: "2026-07-23" },
    portal: SHOPBACK(0.02),
  },
  {
    id: "sendo",
    name: "Sendo",
    category: "online",
    hostPatterns: [/(^|\.)sendo\.vn$/i],
    network: "direct",
    affiliateReady: false,
    portal: SHOPBACK(0.02),
  },
  {
    id: "thegioididong",
    name: "Thế Giới Di Động",
    category: "online",
    hostPatterns: [/(^|\.)thegioididong\.com$/i],
    network: "accesstrade",
    affiliateReady: false,
    voucher: { pct: 0.02, capVND: 300_000, label: "Ưu đãi qua Meo", lastChecked: "2026-07-23" },
    portal: SHOPBACK(0.01),
    note: "Electronics retailer — thin voucher, card choice matters more here.",
  },
  {
    id: "aliexpress",
    name: "AliExpress",
    category: "foreign",
    hostPatterns: [/(^|\.)aliexpress\.com$/i],
    network: "involve",
    affiliateReady: true, // IA deeplink (invl.me) in links.ts
    voucher: { pct: 0.04, capVND: 200_000, label: "Hoàn tiền xuyên biên giới", lastChecked: "2026-07-23" },
    portal: SHOPBACK(0.03),
  },
];

/** Normalise a URL to its bare host (lowercased, no leading www.). */
export function hostOf(url: string): string | null {
  try {
    return new URL(url.trim()).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Detect the merchant from a pasted URL. Returns null when the input isn't a URL
 * or the host isn't one we know — callers should fall back to genericOnline().
 */
export function detectMerchant(url: string): Merchant | null {
  const host = hostOf(url);
  if (!host) return null;
  return MERCHANTS.find((m) => m.hostPatterns.some((re) => re.test(host))) ?? null;
}

/**
 * Safe fallback so the app never dead-ends on an unrecognised link: treat it as a
 * generic online purchase (card advice + portal still apply; no exclusive voucher
 * and no tracked link claimed).
 */
export function genericOnline(): Merchant {
  return {
    id: "generic-online",
    name: "cửa hàng online",
    category: "online",
    hostPatterns: [],
    network: "direct",
    affiliateReady: false,
    portal: SHOPBACK(0.02),
  };
}
