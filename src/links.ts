// =============================================================================
// links.ts — ONE place for all your affiliate / referral IDs.
// =============================================================================
//
// HOW TO EARN:
//   1. Sign up for each program below (see SIGN-UP CHEAT SHEET at the bottom).
//   2. Paste your personal referral link / affiliate ID where it says TODO.
//   3. That's it — the whole app starts routing clicks through your links.
//
// Until you add a link, everything falls back to the normal public URL, so the
// app stays fully working (and honest) with zero affiliate links live.
//
// GOLDEN RULE: the app always ranks cards/sources by what's best for the USER,
// never by what pays you most. Affiliate links ride on top of good advice —
// they never change the advice.
// =============================================================================

export interface AffiliateConfig {
  // Full referral URL for a reward source, keyed by its `name` in rewardSources.ts.
  // When set, it REPLACES the plain public URL for that source.
  referralUrls: Record<string, string | undefined>;

  // "Apply for this card" affiliate links, keyed by bank name (matches `bank`
  // in cards.ts). Earns a commission per approved application.
  cardApplyUrls: Record<string, string | undefined>;

  // Generic card-comparison affiliate link used when a specific bank link
  // above isn't set (e.g. your TheBank / AccessTrade finance link).
  cardApplyFallback?: string;
}

export const AFFILIATE: AffiliateConfig = {
  referralUrls: {
    // TODO paste your referral links, e.g.:
    // ShopBack: "https://www.shopback.com/vn?raf=YOURCODE",
    ShopBack: "https://app.shopback.com/uNejSgC7b4b",
    "AccessTrade / Adpia": undefined,
    "Shopee Xu / ShopeePay": undefined,
    "Lazada vouchers / LazWallet": undefined,
    "TikTok Shop": "https://shorten.asia/4a5fHmSn",
    Tiki: "https://shorten.asia/6k7T9nqN",
    // Shopee VN via Adpia (approved June 26) — redirects to shopee.vn with tracking.
    Shopee: "https://adpvn.top/s/4kZLA",
    Lazada: undefined, // pending — add the Adpia Lazada deeplink here when generated

    MoMo: "https://onelink.momo.vn/WZPv/MsyZKIuN?utm_source=referral_others",
    ZaloPay: "https://onelink.zalopay.vn/cross-border-referral?referral_code=8HA3KVUN",
    Klook: "https://s.klook.com/c/l3PZWW0j3V",
    Traveloka: "https://shorten.asia/1cg6CF37",
    // Involve Asia campaigns (property approved June 26). Paste each deeplink
    // here once generated in IA → the source starts earning. Until then the app
    // falls back to the plain public URL in rewardSources.ts (still works).
    AliExpress: "https://invl.me/clnkyr2", // IA — AliExpress (Global) CPS
    Taobao: "https://invl.me/clnkyqo",     // IA — Taobao CPS
    Alibaba: "https://invl.me/clnkyr5",    // IA — Alibaba CPS
    Banggood: "https://invl.me/clnkyr9",   // IA — Banggood (Global)
    KKday: "https://invl.me/clnkyrd",      // IA — KKday Global CPS
  },

  cardApplyUrls: {
    // TODO per-bank affiliate apply links, e.g.:
    // "Vietcombank": "https://your-affiliate-link/vcb",
  },

  // TODO your generic card-comparison affiliate link (TheBank.vn / banker.vn /
  // an AccessTrade finance offer). Used for any card without a specific link.
  cardApplyFallback: undefined,
};

// Official credit-card pages, keyed by `bank` in cards.ts. These are the
// honest, always-working fallback for "Apply" when no affiliate link is set yet
// — the user still gets to the right place to open the card. When you add an
// affiliate apply link (cardApplyUrls / cardApplyFallback) it takes priority and
// the button starts earning, with zero other changes. Verified June 26, 2026.
export const BANK_APPLY_PAGES: Record<string, string> = {
  VPBank: "https://www.vpbank.com.vn/ca-nhan/the-tin-dung",
  "Cake (VPBank)": "https://cake.vn/credit-card",
  "Cake (VPBank) / Be": "https://cake.vn/credit-card",
  VIB: "https://www.vib.com.vn/vn/the-tin-dung",
  UOB: "https://www.uob.com.vn/personal/cards/index.page",
  OCB: "https://ocb.com.vn/vi/ca-nhan/the",
  VietinBank: "https://www.vietinbank.vn/ca-nhan/san-pham-dich-vu/danh-sach-the",
  Vietcombank: "https://www.vietcombank.com.vn/en/Personal/SPDV/The",
  Techcombank: "https://techcombank.com/en/personal/spend/cards/credit-card",
  TPBank: "https://tpb.vn/khach-hang-ca-nhan/the-tin-dung",
  Shinhan: "https://shinhan.com.vn/vi/credit-card-application",
  Sacombank: "https://www.sacombank.com.vn/en/personal/cards/credit-cards.html",
  HSBC: "https://www.hsbc.com.vn/en-vn/credit-cards/products/",
  ACB: "https://acb.com.vn/en/personal-cards/credit-card",
  "Standard Chartered": "https://www.sc.com/vn/credit-cards/",
  SeABank: "https://seaoffers.seabank.com.vn/the-tin-dung/",
  "MB Bank": "https://www.mbbank.com.vn/26/46/213/san-pham-all/the-tin-dung",
  "Home Credit": "https://www.homecredit.vn/the-tin-dung-online",
  HDBank: "https://hdbank.com.vn/personal/product/the/the-tin-dung",
  BIDV: "https://www.bidv.com.vn/uudaithe/",
  // MSB, Eximbank, KBank: no official card URL confirmed → they fall back to the
  // Google-search safety net in cardApplyLink() (always lands on the bank's card page).
};

// Referral URL for a reward source (falls back to the plain public URL).
export function rewardLink(name: string, fallbackUrl: string): string {
  return AFFILIATE.referralUrls[name] ?? fallbackUrl;
}

// "Apply for this card" URL for a bank. Priority:
//   1. affiliate link (cardApplyUrls / cardApplyFallback) — EARNS
//   2. the bank's official credit-card page — honest, always works
//   3. a Google search for the bank's card — last-resort safety net
// Never returns undefined, so the Apply button always has somewhere to go.
export function cardApplyLink(bank: string): string {
  const affiliate = AFFILIATE.cardApplyUrls[bank] ?? AFFILIATE.cardApplyFallback;
  if (affiliate) return affiliate;
  return (
    BANK_APPLY_PAGES[bank] ??
    `https://www.google.com/search?q=${encodeURIComponent(bank + " thẻ tín dụng đăng ký")}`
  );
}

// True when a card "Apply" link actually EARNS (affiliate apply link set).
// Used to gate the apply-commission disclosure so we only claim affiliate when
// it's true — the official-page fallbacks above are NOT affiliate links.
export function hasCardAffiliate(): boolean {
  return (
    Object.values(AFFILIATE.cardApplyUrls).some(Boolean) ||
    Boolean(AFFILIATE.cardApplyFallback)
  );
}

// True once ANY affiliate/referral link is live — used to decide whether to
// show the commission disclosure (we only disclose when it's actually true).
export function hasAnyAffiliate(): boolean {
  const hasReferral = Object.values(AFFILIATE.referralUrls).some(Boolean);
  return hasReferral || hasCardAffiliate();
}

// =============================================================================
// SIGN-UP CHEAT SHEET (Vietnam) — programs to join, biggest payout first:
//   • Card applications: TheBank.vn affiliate, banker.vn, or AccessTrade
//     "finance" offers — commission per APPROVED card (~100k–500k VND).
//   • Cashback portals: ShopBack referral (Account → Invite friends).
//   • Marketplaces: Shopee & Lazada affiliate programs (often via AccessTrade
//     or Masoffer in Vietnam).
//   • E-wallets: MoMo / ZaloPay in-app "invite a friend" referral codes.
//   • Travel: Klook affiliate (Partnerize) or referral code.
// Always add a clear "we may earn a commission, at no cost to you" note —
// see <Disclosure /> in the app.
// =============================================================================
