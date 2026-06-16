// =============================================================================
// Vietnam Credit Card Catalog  —  cards.ts
// Draft v0.1  ·  Compiled June 16, 2026
// =============================================================================
//
// This is the data "brain" of the Credit Card Manager app. The "which card?"
// engine just filters the cards the user owns, matches the spending category,
// and sorts by effective rate (accounting for remaining monthly cap).
//
// ⚠️ IMPORTANT — VERIFY BEFORE TRUSTING:
// Vietnamese banks change cashback terms, caps and fees frequently, and promo
// rates (e.g. tuition, Tet, partner deals) come and go. Every card carries a
// `lastVerified` date. Treat these as a STARTING DRAFT to plug into the build,
// not gospel — confirm each card on the bank's official page before launch.
// Many cards also require you to REGISTER a category each statement period to
// get the headline rate (noted per-card).
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
// THE CATALOG  (12 popular cards — expand bank by bank)
// -----------------------------------------------------------------------------

export const CARDS: CardProduct[] = [
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
    lastVerified: "2026-06-16",
    notes: "5% on F&B + supermarket, 0.2% elsewhere. Combined cashback cap ~7.2M VND/year.",
  },
  {
    id: "vpbank-stepup",
    bank: "VPBank",
    product: "VPBank StepUP",
    network: "Mastercard",
    rewards: [
      { category: "online", rate: 0.05, capVND: null, period: "statement" },
      { category: "dining", rate: 0.02, capVND: null, period: "statement", note: "dining & entertainment" },
      { category: "entertainment", rate: 0.02, capVND: null, period: "statement" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: 600_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    feeWaiver: "First-year fee waived if ≥3 transactions of ≥300k VND within 30 days of opening",
    lastVerified: "2026-06-16",
    notes: "Strong online-shopping card. Combined cap ~600k/statement.",
  },
  {
    id: "vib-cash-back",
    bank: "VIB",
    product: "VIB Cash Back",
    network: "Mastercard",
    rewards: [
      { category: "online", rate: 0.10, capVND: 2_000_000, period: "statement", note: "up to 10% on REGISTERED category" },
      { category: "everything", rate: 0.01, capVND: null, period: "statement" },
    ],
    totalCapVND: 2_000_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-16",
    notes: "Up to 10% on a registered spend category; max 2,000,000 VND/statement. Rate depends on total spend tier.",
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
    lastVerified: "2026-06-16",
    notes: "10% on family-linked categories; 0% installment for tuition. Confirm exact eligible categories + cap.",
  },
  {
    id: "tpbank-evo-visa",
    bank: "TPBank",
    product: "TPBank EVO Visa",
    network: "Visa",
    rewards: [
      { category: "online", rate: 0.05, capVND: null, period: "statement", note: "0.5%–30% online depending on industry/partner — 5% is a conservative baseline" },
      { category: "education", rate: 0.10, capVND: null, period: "statement", note: "online tuition payments" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: null,
    annualFeeVND: null,
    feeWaiver: "First-year fee waived with 3 transactions within 90 days",
    lastVerified: "2026-06-16",
    notes: "Online-shopping focus, rate varies a lot by partner (0.5%–30%). Up to 10% on online tuition.",
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
    lastVerified: "2026-06-16",
    notes: "20% on Be-app transport/food, 300k/category/statement, overall 1,000,000/statement. Digital-native, popular with younger users.",
  },
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
    lastVerified: "2026-06-16",
    notes: "5% online, 3% foreign POS, 0.5% other. Combined cap ~600k/statement.",
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
    lastVerified: "2026-06-16",
    notes: "Flat 0.3% on everything (no min spend), up to 1% on special categories, 5% at Shinhan partner merchants. Simple, predictable.",
  },
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
    lastVerified: "2026-06-16",
    notes: "0.5% on everything, 1% foreign, NO cashback cap — strong for high spenders. Good 'default' card.",
  },
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
    lastVerified: "2026-06-16",
    notes: "15% on Education, Health and Insurance — up to ~18M VND/year. Niche but powerful for school-fee / insurance payers (relevant to insurance audience).",
  },
  {
    id: "acb-visa-signature",
    bank: "ACB",
    product: "ACB Visa Signature",
    network: "Visa",
    rewards: [
      { category: "online", rate: 0.10, capVND: 200_000, period: "statement", note: "headline up to 10% on category; ~200k/category/statement" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: null,
    annualFeeVND: null,
    lastVerified: "2026-06-16",
    notes: "Up to 10% category cashback (cap ~200k/category/statement) plus a points-redemption program. Confirm exact eligible categories.",
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
    lastVerified: "2026-06-16",
    notes: "Up to 15% on select lifestyle categories. Cap per category applies; confirm category list + per-category caps.",
  },
];

// -----------------------------------------------------------------------------
// Helper: best card for a category, given the user's owned card IDs and the
// cashback already used this period (so it respects caps).
// -----------------------------------------------------------------------------

export interface OwnedCardState {
  id: string;
  usedThisPeriodVND: number;   // cashback already earned this statement period
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
    if (card.totalCapVND != null && o.usedThisPeriodVND >= card.totalCapVND) continue;

    if (best === null || rule.rate > best.rule.rate) {
      best = { card, rule };
    }
  }
  return best;
}
