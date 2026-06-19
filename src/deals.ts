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

// Hand-picked examples. Edit freely — these are illustrative, not guaranteed.
export const SAMPLE_DEALS: Deal[] = [
  {
    id: "d1",
    merchant: "ShopBack",
    title: "Up to 30% cashback on Shopee & Lazada via ShopBack",
    category: "online",
    discountPct: 30,
    url: "https://www.shopback.com/vn",
    expires: "Ongoing",
  },
  {
    id: "d2",
    merchant: "Shopee Xu / ShopeePay",
    title: "Collect daily Shopee Xu + platform vouchers (~15% off)",
    category: "online",
    discountPct: 15,
    url: "https://shopee.vn",
    expires: "Daily",
  },
  {
    id: "d3",
    merchant: "MoMo",
    title: "Food & delivery vouchers up to 20% when you pay with MoMo",
    category: "dining",
    discountPct: 20,
    url: "https://momo.vn",
    expires: "This week",
  },
  {
    id: "d4",
    merchant: "Klook",
    title: "Up to 25% off attractions, tours & transport",
    category: "travel",
    discountPct: 25,
    url: "https://www.klook.com/vi",
    expires: "Seasonal",
  },
];

export type DealWithLink = Deal & { link: string };

// Returns deals with affiliate-aware URLs. Pass a category to filter.
export function getDeals(category?: SpendCategory): DealWithLink[] {
  return SAMPLE_DEALS.filter((d) => !category || d.category === category).map(
    (d) => ({ ...d, link: rewardLink(d.merchant, d.url) })
  );
}
