// =============================================================================
// Vietnam Credit Card Catalog  —  cards.ts
// Comprehensive edition  ·  v0.3  ·  Expanded June 21, 2026
// =============================================================================
//
// v0.3 expands toward comprehensive coverage of the cashback cards Vietnamese
// users actually carry (local + foreign banks + fintech). Confirm every rate on
// the bank's official page; cards marked "(verify rates)" still need first-hand
// confirmation. Citi Vietnam consumer cards migrated to UOB (July 2025).
//
// Rates are decimals (0.05 = 5%). Caps and fees are in VND.
// =============================================================================

export type SpendCategory =
  | "dining"
  | "supermarket"
  | "online"
  | "foreign"
  | "fuel"
  | "travel"
  | "education"
  | "entertainment"
  | "insurance"
  | "everything";

export interface RewardRule {
  category: SpendCategory;
  rate: number;
  capVND: number | null;
  period: "statement" | "year";
  note?: string;
}

export interface CardProduct {
  id: string;
  bank: string;
  product: string;
  network?: "Visa" | "Mastercard" | "JCB" | "Other";
  rewards: RewardRule[];
  totalCapVND?: number | null;
  totalCapPeriod?: "statement" | "year";
  annualFeeVND?: number | null;
  feeWaiver?: string;
  lastVerified: string;
  notes?: string;
}

export const CARDS: CardProduct[] = [
  {
    id: "standard-chartered-platinum-cashback",
    bank: "Standard Chartered",
    product: "Standard Chartered Platinum CashBack",
    network: "Visa",
    rewards: [
      { category: "everything", rate: 0.005, capVND: null, period: "statement" },
      { category: "foreign", rate: 0.01, capVND: null, period: "statement" },
    ],
    totalCapVND: null,
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
      { category: "online", rate: 0.10, capVND: null, period: "statement", note: "up to 10% selected" },
      { category: "supermarket", rate: 0.10, capVND: null, period: "statement" },
      { category: "dining", rate: 0.10, capVND: null, period: "statement" },
      { category: "travel", rate: 0.10, capVND: null, period: "statement" },
      { category: "entertainment", rate: 0.10, capVND: null, period: "statement" },
      { category: "everything", rate: 0.005, capVND: null, period: "statement" },
    ],
    totalCapVND: 300_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "Auto cashback on ALL spend; up to 10% selected. Cap ~300k/statement. Fast virtual card.",
  },
  {
    id: "shinhan-visa-cashback",
    bank: "Shinhan",
    product: "Shinhan Visa Cash Back",
    network: "Visa",
    rewards: [
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
      { category: "online", rate: 0.01, capVND: null, period: "statement" },
    ],
    totalCapVND: null,
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "Flat 0.3% everything, up to 1% special categories, 5% at Shinhan partners.",
  },
  {
    id: "shinhan-365-cashback-platinum",
    bank: "Shinhan",
    product: "Shinhan 365 Cashback Platinum",
    network: "Mastercard",
    rewards: [
      { category: "supermarket", rate: 0.10, capVND: 400_000, period: "statement", note: "12% with Be-SAFE debit; POS only; min 3M/statement" },
      { category: "dining", rate: 0.05, capVND: 200_000, period: "statement" },
      { category: "online", rate: 0.05, capVND: 200_000, period: "statement" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: 600_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-21",
    notes: "10% supermarket (cap 400k) + 5% dining/online (cap 200k). Needs 3M/statement. (verify rates)",
  },
  {
    id: "seabank-sealady-cashback",
    bank: "SeABank",
    product: "SeABank SeALady Cashback",
    network: "Mastercard",
    rewards: [
      { category: "everything", rate: 0.02, capVND: null, period: "statement" },
    ],
    totalCapVND: 12_000_000,
    totalCapPeriod: "year",
    annualFeeVND: null,
    lastVerified: "2026-06-21",
    notes: "Flat 2% on everything, up to ~12M/year. Simple all-rounder. (verify rates)",
  },
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
    notes: "10% on Shopee/ShopeeFood, max ~400k/month.",
  },
  {
    id: "vib-cash-back",
    bank: "VIB",
    product: "VIB Cash Back (Online Plus)",
    network: "Mastercard",
    rewards: [
      { category: "online", rate: 0.10, capVND: 2_000_000, period: "statement", note: "registered category; spend-tier dependent" },
      { category: "everything", rate: 0.01, capVND: null, period: "statement" },
    ],
    totalCapVND: 2_000_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "Up to 10% on a registered category; high cap 2,000,000/statement.",
  },
  {
    id: "vib-online-plus-2in1",
    bank: "VIB",
    product: "VIB Online Plus 2in1",
    network: "Mastercard",
    rewards: [
      { category: "online", rate: 0.03, capVND: null, period: "statement", note: "3% online domestic" },
      { category: "foreign", rate: 0.06, capVND: null, period: "statement", note: "6% overseas/online" },
      { category: "everything", rate: 0.001, capVND: null, period: "statement" },
    ],
    totalCapVND: null,
    annualFeeVND: null,
    lastVerified: "2026-06-21",
    notes: "3% online domestic, 6% abroad, 0.1% offline. Confirm monthly cap.",
  },
  {
    id: "bidv-visa-cashback-online",
    bank: "BIDV",
    product: "BIDV Visa Cashback Online",
    network: "Visa",
    rewards: [
      { category: "online", rate: 0.06, capVND: null, period: "statement", note: "6% Tiki/Shopee/Lazada/TikTok; 3% other online" },
      { category: "everything", rate: 0.002, capVND: null, period: "statement" },
    ],
    totalCapVND: null,
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "6% big e-commerce, 3% other online. Confirm monthly cap.",
  },
  {
    id: "vpbank-stepup",
    bank: "VPBank",
    product: "VPBank StepUP",
    network: "Mastercard",
    rewards: [
      { category: "online", rate: 0.05, capVND: null, period: "statement", note: "general online" },
      { category: "dining", rate: 0.02, capVND: null, period: "statement" },
      { category: "entertainment", rate: 0.02, capVND: null, period: "statement" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: 600_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    feeWaiver: "First-year fee waived with 3 txns of 300k within 30 days",
    lastVerified: "2026-06-19",
    notes: "5% general online (not Shopee-specific). Cap ~600k/statement.",
  },
  {
    id: "tpbank-evo-visa",
    bank: "TPBank",
    product: "TPBank EVO Visa",
    network: "Visa",
    rewards: [
      { category: "online", rate: 0.05, capVND: null, period: "statement", note: "0.5%-30% by partner" },
      { category: "education", rate: 0.10, capVND: null, period: "statement", note: "online tuition" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: null,
    annualFeeVND: null,
    feeWaiver: "First-year fee waived with 3 txns within 90 days",
    lastVerified: "2026-06-19",
    notes: "Online focus; rate varies a lot by partner. Up to 10% online tuition.",
  },
  {
    id: "ocb-igen-mastercard-platinum",
    bank: "OCB",
    product: "OCB iGEN Mastercard Platinum",
    network: "Mastercard",
    rewards: [
      { category: "online", rate: 0.10, capVND: null, period: "statement" },
      { category: "entertainment", rate: 0.05, capVND: null, period: "statement" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: 12_000_000,
    totalCapPeriod: "year",
    annualFeeVND: null,
    lastVerified: "2026-06-21",
    notes: "Youth card; up to 10% online + entertainment. Cap ~12M/year. (verify rates)",
  },
  {
    id: "acb-express-online",
    bank: "ACB",
    product: "ACB Express (online cashback)",
    network: "Visa",
    rewards: [
      { category: "online", rate: 0.06, capVND: null, period: "statement" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: null,
    annualFeeVND: null,
    lastVerified: "2026-06-21",
    notes: "ACB online-focused cashback card. Confirm rate/cap/merchants. (verify rates)",
  },
  {
    id: "sacombank-mastercard-online-cashback",
    bank: "Sacombank",
    product: "Sacombank Mastercard Online Cashback",
    network: "Mastercard",
    rewards: [
      { category: "online", rate: 0.05, capVND: null, period: "statement" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: 600_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-21",
    notes: "Online cashback Mastercard variant. (verify rates)",
  },
  {
    id: "hsbc-visa-cashback",
    bank: "HSBC",
    product: "HSBC Cash Back (Visa)",
    network: "Visa",
    rewards: [
      { category: "supermarket", rate: 0.08, capVND: 200_000, period: "statement", note: "6% all + 2% payroll; shares cap with taxi" },
      { category: "travel", rate: 0.08, capVND: 200_000, period: "statement", note: "taxi & limo; shares 200k cap" },
      { category: "education", rate: 0.01, capVND: null, period: "statement", note: "unlimited health + education" },
      { category: "insurance", rate: 0.01, capVND: null, period: "statement" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: null,
    annualFeeVND: null,
    feeWaiver: "Issuance fee waived first year for new HSBC primary cardholders",
    lastVerified: "2026-06-21",
    notes: "Up to 8% supermarket + taxi (combined ~200k/month), unlimited 1% health+education.",
  },
  {
    id: "hsbc-liveplus",
    bank: "HSBC",
    product: "HSBC Live+",
    network: "Visa",
    rewards: [
      { category: "dining", rate: 0.06, capVND: null, period: "statement" },
      { category: "online", rate: 0.06, capVND: null, period: "statement" },
      { category: "entertainment", rate: 0.06, capVND: null, period: "statement" },
      { category: "everything", rate: 0.005, capVND: null, period: "statement" },
    ],
    totalCapVND: 600_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-21",
    notes: "Lifestyle cashback — dining, shopping, entertainment. Confirm rate/cap. (verify rates)",
  },
  {
    id: "vcb-jcb-platinum",
    bank: "Vietcombank",
    product: "VCB JCB Platinum",
    network: "JCB",
    rewards: [
      { category: "dining", rate: 0.05, capVND: null, period: "statement" },
      { category: "supermarket", rate: 0.05, capVND: null, period: "statement" },
      { category: "everything", rate: 0.002, capVND: null, period: "statement" },
    ],
    totalCapVND: 7_200_000,
    totalCapPeriod: "year",
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "5% F&B + supermarket, 0.2% else. Cap ~7.2M/year.",
  },
  {
    id: "vcb-cashback-plus-amex",
    bank: "Vietcombank",
    product: "Vietcombank Cashback Plus American Express",
    network: "Other",
    rewards: [
      { category: "dining", rate: 0.05, capVND: 300_000, period: "statement" },
      { category: "supermarket", rate: 0.05, capVND: 300_000, period: "statement" },
      { category: "everything", rate: 0.002, capVND: null, period: "statement" },
    ],
    totalCapVND: 300_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-21",
    notes: "Up to 5% dining + supermarket (cap ~300k/period), 0.2% else. Amex.",
  },
  {
    id: "vietinbank-visa-cashback",
    bank: "VietinBank",
    product: "VietinBank Visa Cashback",
    network: "Visa",
    rewards: [
      { category: "supermarket", rate: 0.06, capVND: 300_000, period: "statement", note: "needs >=5M/month" },
      { category: "online", rate: 0.03, capVND: 300_000, period: "statement", note: "needs >=5M/month" },
      { category: "everything", rate: 0.002, capVND: null, period: "statement" },
    ],
    totalCapVND: 600_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-21",
    notes: "6% supermarket + 3% online (each ~300k/month), when spend >=5M/month.",
  },
  {
    id: "vietinbank-mastercard-platinum-cashback",
    bank: "VietinBank",
    product: "VietinBank Mastercard Platinum Cashback",
    network: "Mastercard",
    rewards: [
      { category: "supermarket", rate: 0.05, capVND: null, period: "statement" },
      { category: "dining", rate: 0.05, capVND: null, period: "statement" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: 500_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-21",
    notes: "Platinum cashback, max ~500k/period. Confirm category list. (verify rates)",
  },
  {
    id: "acb-visa-platinum",
    bank: "ACB",
    product: "ACB Visa Platinum",
    network: "Visa",
    rewards: [
      { category: "supermarket", rate: 0.10, capVND: 300_000, period: "statement", note: "10% salary holders (6% others)" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: 3_600_000,
    totalCapPeriod: "year",
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "10% supermarket/convenience for ACB salary holders (6% else), ~300k/month.",
  },
  {
    id: "techcombank-visa-signature",
    bank: "Techcombank",
    product: "Techcombank Visa Signature",
    network: "Visa",
    rewards: [
      { category: "dining", rate: 0.10, capVND: null, period: "statement" },
      { category: "travel", rate: 0.03, capVND: null, period: "statement" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: 3_000_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "Up to 10% dining + 3% travel, cap ~3M/month. Strong for diners.",
  },
  {
    id: "techcombank-priority-visa-signature",
    bank: "Techcombank",
    product: "Techcombank Priority Visa Signature",
    network: "Visa",
    rewards: [
      { category: "dining", rate: 0.10, capVND: null, period: "statement", note: "partner restaurants" },
      { category: "travel", rate: 0.03, capVND: null, period: "statement" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: 5_000_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-21",
    notes: "Priority tier: up to 10% partner dining, cap ~5M/month. Needs Priority status.",
  },
  {
    id: "cake-freedom-2in1",
    bank: "Cake (VPBank)",
    product: "Cake Freedom 2in1",
    network: "Mastercard",
    rewards: [
      { category: "online", rate: 0.20, capVND: null, period: "statement" },
      { category: "dining", rate: 0.20, capVND: null, period: "statement" },
      { category: "supermarket", rate: 0.20, capVND: null, period: "statement" },
      { category: "travel", rate: 0.20, capVND: null, period: "statement" },
      { category: "everything", rate: 0.005, capVND: null, period: "statement" },
    ],
    totalCapVND: 1_000_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "20% across 5 categories, combined cap ~1M/month. Digital-native.",
  },
  {
    id: "be-cake-2in1",
    bank: "Cake (VPBank) / Be",
    product: "Be Cake 2in1",
    network: "Mastercard",
    rewards: [
      { category: "travel", rate: 0.20, capVND: 300_000, period: "statement", note: "Be app transport" },
      { category: "dining", rate: 0.20, capVND: 300_000, period: "statement", note: "Be app food" },
      { category: "everything", rate: 0.005, capVND: null, period: "statement" },
    ],
    totalCapVND: 1_000_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "20% on Be-app transport/food, 300k/category, overall ~1M/statement.",
  },
  {
    id: "msb-m-digi",
    bank: "MSB",
    product: "MSB M-Digi",
    network: "Mastercard",
    rewards: [
      { category: "dining", rate: 0.20, capVND: null, period: "statement" },
      { category: "travel", rate: 0.20, capVND: null, period: "statement" },
      { category: "entertainment", rate: 0.20, capVND: null, period: "statement" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: 300_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "20% dining/travel/digital entertainment, cap ~300k/month.",
  },
  {
    id: "mb-hi-collection",
    bank: "MB Bank",
    product: "MB Hi Collection",
    network: "JCB",
    rewards: [
      { category: "online", rate: 0.05, capVND: null, period: "statement" },
      { category: "entertainment", rate: 0.05, capVND: null, period: "statement" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: null,
    annualFeeVND: null,
    lastVerified: "2026-06-21",
    notes: "MB youth/lifestyle card. Confirm cashback rates + caps. (verify rates)",
  },
  {
    id: "vpbank-lady-mastercard",
    bank: "VPBank",
    product: "VPBank Lady Mastercard",
    network: "Mastercard",
    rewards: [
      { category: "online", rate: 0.15, capVND: null, period: "statement", note: "select lifestyle/beauty/fashion" },
      { category: "dining", rate: 0.05, capVND: null, period: "statement" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: 600_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "Up to 15% on select lifestyle categories. Per-category cap applies.",
  },
  {
    id: "vpbank-cashback-platinum",
    bank: "VPBank",
    product: "VPBank Cashback Platinum",
    network: "Mastercard",
    rewards: [
      { category: "everything", rate: 0.01, capVND: null, period: "statement" },
    ],
    totalCapVND: 600_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-21",
    notes: "Flat ~1% all-rounder. Confirm rate + cap. (verify rates)",
  },
  {
    id: "uob-lady-card",
    bank: "UOB",
    product: "UOB Lady's Card",
    network: "Mastercard",
    rewards: [
      { category: "online", rate: 0.06, capVND: null, period: "statement", note: "fashion/beauty/lifestyle" },
      { category: "dining", rate: 0.06, capVND: null, period: "statement" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: null,
    annualFeeVND: null,
    lastVerified: "2026-06-21",
    notes: "Lifestyle rewards for chosen categories (ex-Citi, now UOB). (verify rates)",
  },
  {
    id: "uob-one-card",
    bank: "UOB",
    product: "UOB One Card",
    network: "Visa",
    rewards: [
      { category: "travel", rate: 0.10, capVND: null, period: "statement", note: "Grab & road transport" },
      { category: "entertainment", rate: 0.05, capVND: null, period: "statement", note: "subscriptions" },
      { category: "insurance", rate: 0.03, capVND: null, period: "statement" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement", note: "excludes fuel & utilities" },
    ],
    totalCapVND: null,
    annualFeeVND: 1_200_000,
    feeWaiver: "First-year annual fee waived",
    lastVerified: "2026-06-21",
    notes: "10% Grab/transport, 5% subscriptions, 3% insurance, 0.3% else. Min income 8M; HCMC & Hanoi. (ex-Citi, now UOB)",
  },
  {
    id: "uob-evol",
    bank: "UOB",
    product: "UOB EVOL",
    network: "Visa",
    rewards: [
      { category: "online", rate: 0.06, capVND: null, period: "statement" },
      { category: "entertainment", rate: 0.06, capVND: null, period: "statement" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: null,
    annualFeeVND: null,
    lastVerified: "2026-06-21",
    notes: "Online + entertainment cashback for younger users. Confirm rates + caps. (verify rates)",
  },
  {
    id: "sacombank-platinum-cashback",
    bank: "Sacombank",
    product: "Sacombank Visa Platinum Cashback",
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
    notes: "5% online, 3% foreign POS, 0.5% other. Cap ~600k/statement.",
  },
  {
    id: "eximbank-visa-platinum-cashback",
    bank: "Eximbank",
    product: "Eximbank Visa Platinum Cash Back",
    network: "Visa",
    rewards: [
      { category: "online", rate: 0.05, capVND: null, period: "statement", note: "up to 8% select" },
      { category: "dining", rate: 0.05, capVND: null, period: "statement" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: 600_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-06-21",
    notes: "Up to 8% on selected categories. Confirm list/rates/cap. (verify rates)",
  },
  {
    id: "tpbank-visa-freego",
    bank: "TPBank",
    product: "TPBank Visa FreeGo",
    network: "Visa",
    rewards: [
      { category: "foreign", rate: 0.01, capVND: null, period: "statement", note: "0% FX markup (saves ~2-4% fee)" },
      { category: "travel", rate: 0.02, capVND: null, period: "statement" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: null,
    annualFeeVND: null,
    lastVerified: "2026-06-21",
    notes: "Travel card; key perk is no foreign-transaction fee. (verify rates)",
  },
  {
    id: "hdbank-petrolimex-4in1",
    bank: "HDBank",
    product: "HDBank Petrolimex 4in1",
    network: "Visa",
    rewards: [
      { category: "fuel", rate: 0.03, capVND: null, period: "statement", note: "fuel at Petrolimex" },
      { category: "everything", rate: 0.002, capVND: null, period: "statement" },
    ],
    totalCapVND: null,
    annualFeeVND: null,
    lastVerified: "2026-06-21",
    notes: "Fuel-focused; cashback/discount at Petrolimex. Confirm rate + cap. (verify rates)",
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
    lastVerified: "2026-06-19",
    notes: "15% Education/Health/Insurance, up to ~18M/year. Great for tuition/insurance.",
  },
  {
    id: "ocb-mastercard-platinum",
    bank: "OCB",
    product: "OCB Mastercard Platinum",
    network: "Mastercard",
    rewards: [
      { category: "online", rate: 0.10, capVND: null, period: "statement", note: "technology/electronics" },
      { category: "travel", rate: 0.05, capVND: null, period: "statement", note: "transport" },
      { category: "insurance", rate: 0.01, capVND: 6_000_000, period: "year" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: 12_000_000,
    totalCapPeriod: "year",
    annualFeeVND: null,
    lastVerified: "2026-06-21",
    notes: "10% technology, 5% transport, 1% insurance (cap ~6M/yr). Overall ~12M/year.",
  },
  {
    id: "vib-family-link",
    bank: "VIB",
    product: "VIB Family Link",
    network: "Mastercard",
    rewards: [
      { category: "education", rate: 0.10, capVND: null, period: "statement", note: "0% installment on tuition" },
      { category: "supermarket", rate: 0.10, capVND: null, period: "statement" },
      { category: "everything", rate: 0.005, capVND: null, period: "statement" },
    ],
    totalCapVND: null,
    annualFeeVND: null,
    lastVerified: "2026-06-19",
    notes: "10% on family-linked categories; 0% installment for tuition. Confirm categories + cap.",
  },
  {
    id: "vib-super-card",
    bank: "VIB",
    product: "VIB Super Card",
    network: "Mastercard",
    rewards: [
      { category: "entertainment", rate: 0.15, capVND: null, period: "statement", note: "up to 15% movies/lifestyle (points)" },
      { category: "dining", rate: 0.05, capVND: null, period: "statement" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: null,
    annualFeeVND: null,
    lastVerified: "2026-06-21",
    notes: "Up to 15% entertainment/lifestyle (points like cashback). Confirm list + caps. (verify rates)",
  },
  {
    id: "homecredit-home-card",
    bank: "Home Credit",
    product: "Home Credit Home Card",
    network: "Other",
    rewards: [
      { category: "everything", rate: 0.005, capVND: null, period: "statement", note: "promo categories higher" },
    ],
    totalCapVND: null,
    annualFeeVND: null,
    lastVerified: "2026-06-21",
    notes: "Easy-approval consumer-finance card. Cashback varies by promo. (verify rates)",
  },
];

export interface OwnedCardState {
  id: string;
  usedThisPeriodVND: number;
  capVND?: number | null;
}

export function bestCardFor(
  category: SpendCategory,
  owned: OwnedCardState[],
): { card: CardProduct; rule: RewardRule } | null {
  let best: { card: CardProduct; rule: RewardRule } | null = null;

  for (const o of owned) {
    const card = CARDS.find((c) => c.id === o.id);
    if (!card) continue;

    const rule =
      card.rewards.find((r) => r.category === category) ??
      card.rewards.find((r) => r.category === "everything");
    if (!rule) continue;

    const cap = o.capVND !== undefined ? o.capVND : card.totalCapVND;
    if (cap != null && o.usedThisPeriodVND >= cap) continue;

    if (best === null || rule.rate > best.rule.rate) {
      best = { card, rule };
    }
  }
  return best;
}
