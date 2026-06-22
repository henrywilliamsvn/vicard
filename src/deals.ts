// =============================================================================
// deals.ts — "Deals right now" feed.
// =============================================================================
//
// These are CURATED EXAMPLE deals so the feature works out of the box. To make
// it live and earning, either:
//   (a) keep curating a few hand-picked deals here, refreshed weekly, OR
//   (b) replace SAMPLE_DEALS with data fetched from an affiliate coupon source
//       (AccessTrade / Masoffer deal APIs) — keep the same Deal shape.
//
// Every deal's `url` is run through the affiliate layer (see getDeals), so when
// you add your affiliate IDs in links.ts these links start earning.
// =============================================================================
import type { SpendCategory } from "./cards";
import { rewardLink } from "./links";

export interface Deal {
  id: string;
  merchant: string; // must match a reward-source `name` to inherit its affiliate link
  title: string;
  category: SpendCategory;
  discountPct: number; // headline discount, used to match against wishlist targets
  url: string; // fallback public URL
  expires?: string; // human label, e.g. "Ends Sun" — optional
}

// Hand-picked deals. Two kinds:
//   • LIVE EARNERS — `merchant` matches a reward source that has an affiliate
//     link in links.ts (Tiki, TikTok Shop, Traveloka), so the link earns now.
//   • BRAND DEALS — paste the campaign's shorten.asia link straight into `url`;
//     since the brand `merchant` has no entry in links.ts referralUrls,
//     rewardLink() returns the url as-is (already an affiliate link).
//   • INFO DEALS — public URL only; they start earning once you add that
//     merchant's referral link in links.ts.
export const SAMPLE_DEALS: Deal[] = [
  // ---- Live earners (route through your AccessTrade affiliate links) -------
  {
    id: "tiki-online",
    merchant: "Tiki",
    title: "Hàng chính hãng + voucher & freeship trên Tiki",
    category: "online",
    discountPct: 20,
    url: "https://tiki.vn/",
    expires: "Đang diễn ra",
  },
  {
    id: "tiktok-online",
    merchant: "TikTok Shop",
    title: "Săn voucher & deal livestream trên TikTok Shop",
    category: "online",
    discountPct: 30,
    url: "https://www.tiktok.com/",
    expires: "Hằng ngày",
  },
  {
    id: "traveloka-travel",
    merchant: "Traveloka",
    title: "Vé máy bay + khách sạn ưu đãi trên Traveloka",
    category: "travel",
    discountPct: 15,
    url: "https://www.traveloka.com/vi-vn",
    expires: "Đang diễn ra",
  },

  // ---- Brand deals (paste real shorten.asia links into `url` to earn) ------
  {
    id: "shopdunk-online",
    merchant: "ShopDunk",
    title: "iPhone, Mac & phụ kiện Apple chính hãng — trả góp 0%, thu cũ đổi mới",
    category: "online",
    discountPct: 10,
    url: "https://shorten.asia/T77pqcKx",
    expires: "Đang diễn ra",
  },
  {
    id: "thefaceshop-online",
    merchant: "The Face Shop",
    title: "Mỹ phẩm thiên nhiên Hàn Quốc — ưu đãi & quà tặng tại The Face Shop",
    category: "online",
    discountPct: 15,
    url: "https://shorten.asia/bZ1MUjz3",
    expires: "Đang diễn ra",
  },

  // ---- Info deals (earn once you add the referral link in links.ts) -------
  {
    id: "momo-dining",
    merchant: "MoMo",
    title: "Voucher ăn uống & giao đồ ăn tới 20% khi trả bằng MoMo",
    category: "dining",
    discountPct: 20,
    url: "https://momo.vn",
    expires: "Trong tuần",
  },
  {
    id: "shopback-online",
    merchant: "ShopBack",
    title: "Hoàn tiền tới 30% trên Shopee & Lazada qua ShopBack",
    category: "online",
    discountPct: 30,
    url: "https://www.shopback.com/vn",
    expires: "Đang diễn ra",
  },
];

export type DealWithLink = Deal & { link: string };

// Returns deals with affiliate-aware URLs. Pass a category to filter.
export function getDeals(category?: SpendCategory): DealWithLink[] {
  return SAMPLE_DEALS.filter((d) => !category || d.category === category).map(
    (d) => ({ ...d, link: rewardLink(d.merchant, d.url) })
  );
}
