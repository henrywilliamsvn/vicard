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
  // ---- Flash deal (a temporary boosted rate). Set flash:true + the rates to
  // surface it in the "⚡ Flash deals" row with a "3% → 12%" style badge. ----
  flash?: boolean;
  baseRate?: number; // normal cashback %, e.g. 3
  flashRate?: number; // boosted cashback %, e.g. 12
  flashEnds?: string; // short label, e.g. "Hôm nay" / "2 ngày"
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
    id: "tiktok-77",
    merchant: "TikTok Shop",
    title: "TikTok Shop 7.7 Mega Sale — voucher & deal livestream cực mạnh",
    category: "online",
    discountPct: 30,
    url: "https://www.tiktok.com/",
    expires: "Đỉnh điểm 07/07",
    flash: true,
    baseRate: 4,
    flashRate: 15,
    flashEnds: "07/07",
  },
  {
    id: "shopee-77",
    merchant: "Shopee",
    title: "Shopee 7.7 Siêu Sale Đón Hè — Voucher Xtra, hoàn xu 777K, Freeship 0Đ",
    category: "online",
    discountPct: 50,
    url: "https://shopee.vn/m/7-7",
    expires: "07/07 · mã back 0h-9h-12h-20h-22h",
    flash: true,
    baseRate: 3,
    flashRate: 16,
    flashEnds: "07/07",
  },
  {
    id: "lazada-77",
    merchant: "Lazada",
    title: "Lazada 7.7 (07–11/07) — voucher đến 1 triệu, LazMall Freeship 0Đ",
    category: "online",
    discountPct: 50,
    url: "https://www.lazada.vn/",
    expires: "07–11/07",
    flash: true,
    baseRate: 2,
    flashRate: 10,
    flashEnds: "11/07",
  },
  {
    id: "traveloka-77epic",
    merchant: "Traveloka",
    title: "Traveloka 7.7 EPIC Sale — vé máy bay + khách sạn cho hè",
    category: "travel",
    discountPct: 15,
    url: "https://www.traveloka.com/vi-vn",
    expires: "01–10/07",
  },
  {
    id: "airalo-travel",
    merchant: "Airalo",
    title: "eSIM du lịch Airalo — cài trước ở nhà, khỏi mua SIM sân bay giá chát",
    category: "travel",
    discountPct: 10,
    url: "https://invl.me/clnlrao",
    expires: "Đang diễn ra",
  },
  {
    id: "udemy-education",
    merchant: "Udemy",
    title: "Khoá học Udemy — gần như luôn có sale sâu, đừng bao giờ mua giá gốc",
    category: "education",
    discountPct: 70,
    url: "https://invl.me/clnlrak",
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
    title: "Đừng quên lớp 1: vào Shopee/Lazada qua cổng hoàn tiền dịp 7.7",
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

// Active flash deals (temporary boosted rates), affiliate-aware. Highest boost first.
export function getFlashDeals(): DealWithLink[] {
  return SAMPLE_DEALS.filter((d) => d.flash)
    .map((d) => ({ ...d, link: rewardLink(d.merchant, d.url) }))
    .sort((a, b) => (b.flashRate ?? 0) - (a.flashRate ?? 0));
}
