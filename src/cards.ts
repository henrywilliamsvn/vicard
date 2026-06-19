// =============================================================================
// Vietnam Credit Card Catalog  —  cards.ts
// Curated "best-in-class" edition  ·  v0.2  ·  Refreshed June 19, 2026
// =============================================================================
//
// This is the data "brain" of the app. The "which card?" engine filters the
// cards the user owns, matches the spending category, and sorts by effective
// rate (accounting for remaining monthly cap).
//
// CURATION RULE: this is NOT every card in Vietnam — it's the strongest one or
// two cashback/rewards cards per spending category, so the recommendation is
// always a genuinely good pick. Add more bank-by-bank over time.
//
// ⚠️ VERIFY BEFORE TRUSTING:
// Vietnamese banks change cashback terms, caps and fees frequently, and promo
// rates (tuition, Tet, partner deals) come and go. Many cards require you to
// REGISTER a category each statement period to earn the headline rate, and
// "up to X%" often depends on a monthly spend tier. Every card has a
// `lastVerified` date — confirm on the bank's official page before relying on it.
//
// Rates are decimals (0.05 = 5%). Caps and fees are in VND.
// `period: "statement"` ≈ one monthly billing cycle.
// =============================================================================

export type SpendCategory =
  | "dining"
  | "supermarket"
  | "online"
  | "foreign"        // overseas / foreign-currency spend
  | "fuel"
  | "travel"
  | "education"      // tuition / school fees
  | "entertainment"
  | "insurance"
  | "everything";    // base/default rate

export interface RewardRule {
  category: SpendCategory;
  rate: number;              // decimal, e.g. 0.05 = 5%
  capVND: number | null;     // max cashback for THIS category; null = uncapped
  period: "statement" | "year";
  note?: string;
}

export interface CardProduct {
  id: string;
  bank: string;
  product: string;
  network?: "Visa" | "Mastercard" | "JCB" | "Other";
  rewards: RewardRule[];
  totalCapVND?: number | null;   // overall cashback cap across all categories
  totalCapPeriod?: "statement" | "year";
  annualFeeVND?: number | null;  // null = not confirmed in research
  feeWaiver?: string;
  lastVerified: string;          // ISO date
  notes?: string;
}

// -----------------------------------------------------------------------------
// THE CATALOG — curated best-in-class cashback/rewards cards (June 2026).
// -----------------------------------------------------------------------------

export const CARDS: CardProduct[] = [
  // ---- All-rounders / flat-rate default cards ------------------------------
  {
    id: "standard-chartered-platinum-cashback",
    bank: "Standard Chartered",
    product: "Standard Chartered Platinum CashBack",
    network: "Visa",
    rewards: [
      { category: "everything", rate: 0.005, capVND: null, period: "statement" },
      { category: "foreign", rate: 0.01, capVND: null, period: "statement" },
    ],
    totalCapVND: null,                 // notably uncapped
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "0.5% on everything, 1% foreign, NO cashback cap — strong default for high spenders.",
  },
  {
    id: "kbank-cashback-plus",
    bank: "KBank (Kasikornbank)",
    product: "KBank Cashback Plus",
    network: "Mastercard",
    rewards: [
      { category: "online", rate: 0.10, capVND: null, period: "statement", note: "up to 10% on selected categories" },
      { category: "supermarket", rate: 0.10, capVND: null, period: "statement" },
      { category: "dining", rate: 0.10, capVND: null, period: "statement" },
      { category: "travel", rate: 0.10, capVND: null, period: "statement" },
      { category: "entertainment", rate: 0.10, capVND: null, period: "statement" },
      { category: "everything", rate: 0.005, capVND: null, period: "statement", note: "auto cashback on all other spend" },
    ],
    totalCapVND: 300_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "Auto cashback on ALL spend; up to 10% on selected categories. Combined cap ~300k/statement (verify current T&C). Fast 2-minute virtual card.",
  },
  {
    id: "shinhan-visa-cashback",
    bank: "Shinhan",
    product: "Shinhan Visa Cash Back",
    network: "Visa",
    rewards: [
      { category: "everything", rate: 0.003, capVND: null, period: "statement", note: "flat, no minimum spend" },
      { category: "online", rate: 0.01, capVND: null, period: "statement", note: "special categories 0.3%–1%" },
    ],
    totalCapVND: null,
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "Flat 0.3% on everything (no min spend), up to 1% on special categories, 5% at Shinhan partner merchants. Simple, predictable.",
  },

  // ---- Online shopping -----------------------------------------------------
  {
    id: "vpbank-super-shopee-platinum",
    bank: "VPBank",
    product: "VPBank Super Shopee Platinum",
    network: "Mastercard",
    rewards: [
      { category: "online", rate: 0.10, capVND: 400_000, period: "statement", note: "Shopee & ShopeeFood" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: 400_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "10% back on Shopee / ShopeeFood, max ~400k/month. Best-in-class if you shop Shopee heavily.",
  },
  {
    id: "vib-cash-back",
    bank: "VIB",
    product: "VIB Cash Back (Online Plus)",
    network: "Mastercard",
    rewards: [
      { category: "online", rate: 0.10, capVND: 2_000_000, period: "statement", note: "up to 10% on REGISTERED category; depends on spend tier" },
      { category: "everything", rate: 0.01, capVND: null, period: "statement" },
    ],
    totalCapVND: 2_000_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "Up to 10% on a registered spend category; high cap 2,000,000 VND/statement. Rate depends on total spend tier.",
  },
  {
    id: "bidv-visa-cashback-online",
    bank: "BIDV",
    product: "BIDV Visa Cashback Online",
    network: "Visa",
    rewards: [
      { category: "online", rate: 0.06, capVND: null, period: "statement", note: "6% at Tiki/Shopee/Lazada/TikTok Shop; 3% other online" },
      { category: "everything", rate: 0.002, capVND: null, period: "statement" },
    ],
    totalCapVND: null,
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "6% on big e-commerce sites, 3% other online. Confirm current monthly cap on BIDV's page.",
  },
  {
    id: "vpbank-stepup",
    bank: "VPBank",
    product: "VPBank StepUP",
    network: "Mastercard",
    rewards: [
      { category: "online", rate: 0.05, capVND: null, period: "statement", note: "general online (any merchant)" },
      { category: "dining", rate: 0.02, capVND: null, period: "statement" },
      { category: "entertainment", rate: 0.02, capVND: null, period: "statement" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: 600_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    feeWaiver: "First-year fee waived if ≥3 transactions of ≥300k VND within 30 days of opening",
    lastVerified: "2026-06-19",
    notes: "5% on general online spend (not Shopee-specific). Combined cap ~600k/statement.",
  },
  {
    id: "tpbank-evo-visa",
    bank: "TPBank",
    product: "TPBank EVO Visa",
    network: "Visa",
    rewards: [
      { category: "online", rate: 0.05, capVND: null, period: "statement", note: "0.5%–30% online depending on partner — 5% conservative baseline" },
      { category: "education", rate: 0.10, capVND: null, period: "statement", note: "online tuition payments" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: null,
    annualFeeVND: null,
    feeWaiver: "First-year fee waived with 3 transactions within 90 days",
    lastVerified: "2026-06-19",
    notes: "Online focus; rate varies a lot by partner (0.5%–30%). Up to 10% on online tuition.",
  },

  // ---- Supermarket ---------------------------------------------------------
  {
    id: "hsbc-visa-cashback",
    bank: "HSBC",
    product: "HSBC Visa Cash Back",
    network: "Visa",
    rewards: [
      { category: "supermarket", rate: 0.08, capVND: 200_000, period: "statement", note: "up to 8%, max ~200k/month" },
      { category: "education", rate: 0.01, capVND: null, period: "statement", note: "unlimited" },
      { category: "insurance", rate: 0.01, capVND: null, period: "statement", note: "unlimited" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: null,
    annualFeeVND: null,
    feeWaiver: "Issuance fee waived first year for new HSBC primary cardholders",
    lastVerified: "2026-06-19",
    notes: "8% supermarket (200k/month cap), unlimited 1% on education + insurance, 0.3% everything else.",
  },
  {
    id: "vcb-jcb-platinum",
    bank: "Vietcombank",
    product: "VCB JCB Platinum",
    network: "JCB",
    rewards: [
      { category: "dining", rate: 0.05, capVND: null, period: "statement", note: "F&B" },
      { category: "supermarket", rate: 0.05, capVND: null, period: "statement" },
      { category: "everything", rate: 0.002, capVND: null, period: "statement" },
    ],
    totalCapVND: 7_200_000,
    totalCapPeriod: "year",          // ≈ 600k / month
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "5% on F&B + supermarket, 0.2% elsewhere. Combined cashback cap ~7.2M VND/year.",
  },
  {
    id: "acb-visa-platinum",
    bank: "ACB",
    product: "ACB Visa Platinum",
    network: "Visa",
    rewards: [
      { category: "supermarket", rate: 0.10, capVND: 300_000, period: "statement", note: "10% for salary-account holders (6% others), at supermarkets & convenience stores" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: 3_600_000,
    totalCapPeriod: "year",          // ≈ 300k / month
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "10% supermarket/convenience for ACB salary holders (6% otherwise), cap ~300k/month (3.6M/year).",
  },

  // ---- Dining / travel / digital lifestyle ---------------------------------
  {
    id: "techcombank-visa-signature",
    bank: "Techcombank",
    product: "Techcombank Visa Signature",
    network: "Visa",
    rewards: [
      { category: "dining", rate: 0.10, capVND: null, period: "statement", note: "up to 10% restaurants" },
      { category: "travel", rate: 0.03, capVND: null, period: "statement", note: "travel & hotels" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: 3_000_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "Up to 10% dining + 3% travel/hotels, high combined cap ~3,000,000/month. Strong for diners.",
  },
  {
    id: "cake-freedom-2in1",
    bank: "Cake (VPBank)",
    product: "Cake Freedom 2in1",
    network: "Mastercard",
    rewards: [
      { category: "online", rate: 0.20, capVND: null, period: "statement", note: "e-commerce" },
      { category: "dining", rate: 0.20, capVND: null, period: "statement", note: "F&B" },
      { category: "supermarket", rate: 0.20, capVND: null, period: "statement", note: "supermarket + convenience stores" },
      { category: "travel", rate: 0.20, capVND: null, period: "statement", note: "transport + delivery" },
      { category: "everything", rate: 0.005, capVND: null, period: "statement" },
    ],
    totalCapVND: 1_000_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "20% across 5 categories (e-commerce, F&B, supermarket/convenience, transport/delivery), combined cap ~1,000,000/month. Digital-native.",
  },
  {
    id: "be-cake-2in1",
    bank: "Cake (VPBank) / Be",
    product: "Be Cake 2in1",
    network: "Mastercard",
    rewards: [
      { category: "travel", rate: 0.20, capVND: 300_000, period: "statement", note: "transport on Be app" },
      { category: "dining", rate: 0.20, capVND: 300_000, period: "statement", note: "food on Be app" },
      { category: "everything", rate: 0.005, capVND: null, period: "statement" },
    ],
    totalCapVND: 1_000_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "20% on Be-app transport/food, 300k/category/statement, overall ~1,000,000/statement.",
  },
  {
    id: "msb-m-digi",
    bank: "MSB",
    product: "MSB M-Digi",
    network: "Mastercard",
    rewards: [
      { category: "dining", rate: 0.20, capVND: null, period: "statement" },
      { category: "travel", rate: 0.20, capVND: null, period: "statement" },
      { category: "entertainment", rate: 0.20, capVND: null, period: "statement", note: "digital entertainment" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: 300_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "20% on dining, travel and digital entertainment, combined cap ~300k/month.",
  },
  {
    id: "vpbank-lady-mastercard",
    bank: "VPBank",
    product: "VPBank Lady Mastercard",
    network: "Mastercard",
    rewards: [
      { category: "online", rate: 0.15, capVND: null, period: "statement", note: "select lifestyle/beauty/fashion categories" },
      { category: "dining", rate: 0.05, capVND: null, period: "statement" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: 600_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "Up to 15% on select lifestyle categories. Per-category cap applies; confirm category list.",
  },

  // ---- Foreign-currency spend ---------------------------------------------
  {
    id: "sacombank-platinum-cashback",
    bank: "Sacombank",
    product: "Sacombank Platinum Cashback",
    network: "Visa",
    rewards: [
      { category: "online", rate: 0.05, capVND: null, period: "statement" },
      { category: "foreign", rate: 0.03, capVND: null, period: "statement", note: "foreign POS" },
      { category: "everything", rate: 0.005, capVND: null, period: "statement" },
    ],
    totalCapVND: 600_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "5% online, 3% foreign POS, 0.5% other. Combined cap ~600k/statement.",
  },

  // ---- Education / insurance (Henry's insurance-audience niche) ------------
  {
    id: "ocb-jcb-platinum",
    bank: "OCB",
    product: "OCB JCB Platinum",
    network: "JCB",
    rewards: [
      { category: "education", rate: 0.15, capVND: null, period: "statement" },
      { category: "insurance", rate: 0.15, capVND: null, period: "statement" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: 18_000_000,
    totalCapPeriod: "year",
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "15% on Education, Health and Insurance — up to ~18M VND/year. Powerful for school-fee / insurance payers.",
  },
  {
    id: "vib-family-link",
    bank: "VIB",
    product: "VIB Family Link",
    network: "Mastercard",
    rewards: [
      { category: "education", rate: 0.10, capVND: null, period: "statement", note: "family/education-linked spend; 0% installment on tuition" },
      { category: "supermarket", rate: 0.10, capVND: null, period: "statement" },
      { category: "everything", rate: 0.005, capVND: null, period: "statement" },
    ],
    totalCapVND: null,
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "10% on family-linked categories; 0% installment for tuition. Confirm exact eligible categories + cap.",
  },
];

// -----------------------------------------------------------------------------
// Helper: best card for a category, given the user's owned card IDs and the
// cashback already used this period (so it respects caps).
// -----------------------------------------------------------------------------

export interface OwnedCardState {
  id: string;
  usedThisPeriodVND: number;   // cashback already earned this statement period
  capVND?: number | null;      // optional user override of the card's cashback cap
}

export function bestCardFor(
  category: SpendCategory,
  owned: OwnedCardState[],
): { card: CardProduct; rule: RewardRule } | null {
  let best: { card: CardProduct; rule: RewardRule } | null = null;

  for (const o of owned) {
    const card = CARDS.find((c) => c.id === o.id);
    if (!card) continue;

    // pick this card's best applicable rule (specific category, else "everything")
    const rule =
      card.rewards.find((r) => r.category === category) ??
      card.rewards.find((r) => r.category === "everything");
    if (!rule) continue;

    // skip if the overall card cap for the period is already exhausted
    const cap = o.capVND !== undefined ? o.capVND : card.totalCapVND;
    if (cap != null && o.usedThisPeriodVND >= cap) continue;

    if (best === null || rule.rate > best.rule.rate) {
      best = { card, rule };
    }
  }
  return best;
}
