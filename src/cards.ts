// =============================================================================
// Vietnam Credit Card Catalog  —  cards.ts
// Comprehensive edition  ·  v0.4  ·  Rate-watch refresh August 1, 2026
// =============================================================================
//
// v0.4 is the August 2026 monthly rate-watch refresh. Major repricing this
// cycle: KBank Cashback Plus cut 10% -> 0.5% (05/03/2026), Sacombank Visa
// Platinum Cashback re-launched as a transport/supermarket card, Techcombank
// Visa Signature moved to a flat 5% domestic restaurants+hotels, and two new
// best-in-class cards were added (Shinhan MyLife Platinum, VIB Max Card).
// VN bank terms change often -- confirm every rate on the bank's official page;
// cards marked "(verify rates)" still need first-hand confirmation.
// Citi Vietnam consumer cards migrated to UOB (July 2025).
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
      { category: "everything", rate: 0.005, capVND: null, period: "statement", note: "cut from 10% effective 05/03/2026" },
    ],
    totalCapVND: null,
    annualFeeVND: null,
    lastVerified: "2026-08-01",
    notes: "DOWNGRADED: KBank cut cashback from 10% to a flat 0.5% effective 05/03/2026. No longer best-in-class -- kept for existing holders only. Consider removal.",
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
      { category: "foreign", rate: 0.004, capVND: null, period: "statement", note: "0.4% foreign; 0.2% domestic base" },
      { category: "everything", rate: 0.002, capVND: null, period: "statement", note: "2% only on Women's Days (Mar 8, Oct 20) & birthday" },
    ],
    totalCapVND: 12_000_000,
    totalCapPeriod: "year",
    annualFeeVND: null,
    lastVerified: "2026-07-01",
    notes: "0.2% base (0.4% foreign); 2% only on Women's Days & cardholder birthday. Cap ~12M/year. NOT a flat-2% card.",
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
    lastVerified: "2026-07-01",
    notes: "10% on Shopee/ShopeeFood, max ~400k/month. CLOSED to new applicants (2026); existing holders keep benefits. Consider removal.",
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
      { category: "online", rate: 0.15, capVND: 1_500_000, period: "statement", note: "15% cap 1.5M if spend >=100M; 15% cap 700k if 10M-100M; 6% cap 300k if <10M. Excludes Shopee/ShopeeFood, online insurance, bills" },
      { category: "dining", rate: 0.04, capVND: 200_000, period: "statement", note: "4% if spend >=10M/statement; else 2%" },
      { category: "everything", rate: 0.001, capVND: null, period: "statement" },
    ],
    totalCapVND: 1_700_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    feeWaiver: "First-year fee waived with 3 txns of 300k within 30 days",
    lastVerified: "2026-08-01",
    notes: "Three spend tiers: >=100M/statement -> 15% online cap 1.5M; 10M-100M -> 15% cap 700k; <10M -> 6% cap 300k. Plus dining. Headline total up to 1,700,000/statement.",
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
      { category: "dining", rate: 0.08, capVND: 200_000, period: "statement", note: "8% payroll / 6% non-payroll; shares 200k cap w/ shopping" },
      { category: "online", rate: 0.08, capVND: 200_000, period: "statement", note: "shopping & e-commerce; shares 200k cap w/ dining" },
      { category: "entertainment", rate: 0.01, capVND: null, period: "statement", note: "unlimited; cinema, Netflix, Spotify" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: null,
    annualFeeVND: null,
    lastVerified: "2026-07-01",
    notes: "Up to 8% dining + shopping (combined ~200k/month), 1% unlimited entertainment, 0.3% else.",
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
      { category: "dining", rate: 0.05, capVND: 5_000_000, period: "statement", note: "domestic restaurants only (VN merchant country code)" },
      { category: "travel", rate: 0.05, capVND: 5_000_000, period: "statement", note: "domestic hotels; shares the 5M cap with dining" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: 5_000_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-08-01",
    notes: "Official T&C: 5% on domestic restaurants & hotels, cap 5,000,000/card account/month. Foreign spend and cash advances excluded. Cashback posts within 10 working days of the following month.",
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
      { category: "online", rate: 0.20, capVND: 200_000, period: "statement" },
      { category: "dining", rate: 0.20, capVND: 200_000, period: "statement" },
      { category: "supermarket", rate: 0.20, capVND: 200_000, period: "statement", note: "MCC 5411: only the first txn per day counts" },
      { category: "travel", rate: 0.20, capVND: 200_000, period: "statement" },
      { category: "everything", rate: 0.005, capVND: null, period: "statement" },
    ],
    totalCapVND: 1_000_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-08-01",
    notes: "20% across 12 eligible industries (3 fixed + 2 self-chosen categories). Per-category cap 200k/statement; per-txn cap 50k (txn >=200k) or 10k (txn <200k); overall 1M/statement requires total settled spend >=5,000,000/statement.",
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
      { category: "travel", rate: 0.168, capVND: 680_000, period: "statement", note: "MCC 4121/4789 transport; each txn must be >=100,000 VND; shares 680k cap" },
      { category: "supermarket", rate: 0.068, capVND: 680_000, period: "statement", note: "MCC 5411/5499 supermarket & convenience; shares 680k cap" },
      { category: "everything", rate: 0.0039, capVND: null, period: "statement", note: "unlimited" },
    ],
    totalCapVND: 680_000,
    totalCapPeriod: "statement",
    annualFeeVND: null,
    lastVerified: "2026-08-01",
    notes: "REPRICED 2026: 16.8% transport + 6.8% supermarket/convenience (shared cap 680k/statement), 0.39% unlimited on everything else. Qualifying txns must be >=100,000 VND. Excludes fuel, bills, insurance, gold, e-wallet top-ups, financial MCCs.",
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
      { category: "education", rate: 0.15, capVND: 300_000, period: "statement", note: "health/medical MCCs: hospitals, clinics, pharmacies" },
      { category: "insurance", rate: 0.07, capVND: 150_000, period: "statement" },
      { category: "everything", rate: 0.003, capVND: null, period: "statement" },
    ],
    totalCapVND: 18_000_000,
    totalCapPeriod: "year",
    annualFeeVND: null,
    lastVerified: "2026-08-01",
    notes: "15% health/medical (cap 300k/period) + 7% insurance (cap 150k/period), headline up to 18M/year. Requires >=7 eligible txns per qualifying period. Insurance rate was cut from 15% to 7%.",
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
      { category: "dining", rate: 0.15, capVND: null, period: "statement", note: "pick 1 of dining/shopping/travel for 15%" },
      { category: "travel", rate: 0.15, capVND: null, period: "statement", note: "if chosen as the 15% category" },
      { category: "online", rate: 0.10, capVND: null, period: "statement", note: "10% online or foreign" },
      { category: "foreign", rate: 0.10, capVND: null, period: "statement" },
      { category: "everything", rate: 0.001, capVND: null, period: "statement" },
    ],
    totalCapVND: null,
    annualFeeVND: null,
    lastVerified: "2026-08-01",
    notes: "CLOSED to new applicants -- VIB stopped issuing Super Card (along with 2in1 Plus and Financial) in favour of the Max Card membership model. Existing holders keep benefits: choose 1 category (dining/shopping/travel) for 15%, 10% online/foreign, 0.1% else. Cashback paid ~15 days.",
  },
  {
    id: "shinhan-mylife-platinum",
    bank: "Shinhan",
    product: "Shinhan MyLife Platinum",
    network: "Visa",
    rewards: [
      { category: "travel", rate: 0.10, capVND: 300_000, period: "statement", note: "MCC 4121 taxi/limousine" },
      { category: "supermarket", rate: 0.10, capVND: 300_000, period: "statement", note: "MCC 5411/5499/5412/5451" },
      { category: "dining", rate: 0.10, capVND: 300_000, period: "statement", note: "MCC 5812/5813/5814; bakery 5462 excluded" },
      { category: "entertainment", rate: 0.10, capVND: 300_000, period: "statement", note: "MCC 5815/5817/5818/4899/7832; digital games 5816 excluded" },
      { category: "everything", rate: 0.004, capVND: null, period: "statement", note: "unlimited base" },
    ],
    totalCapVND: 1_200_000,
    totalCapPeriod: "statement",
    annualFeeVND: 1_100_000,
    feeWaiver: "Year 2 waived with >=110,000,000 spend in the prior year",
    lastVerified: "2026-08-01",
    notes: "NEW 2026. 10% reward points on 4 lifestyle groups, 300k cap each (1.2M total/statement), 0.4% unlimited base. Requires >=3,000,000 total spend across the groups. FX fee 2.9%. Strongly MCC-dependent.",
  },
  {
    id: "vib-max-card",
    bank: "VIB",
    product: "VIB Max Card",
    network: "Mastercard",
    rewards: [
      { category: "online", rate: 0.10, capVND: null, period: "statement", note: "Elite tier; 8% Pro, 5% Plus, 0% Starter" },
      { category: "dining", rate: 0.10, capVND: null, period: "statement", note: "one of 5 selectable categories" },
      { category: "supermarket", rate: 0.10, capVND: null, period: "statement" },
      { category: "travel", rate: 0.10, capVND: null, period: "statement" },
      { category: "entertainment", rate: 0.10, capVND: null, period: "statement" },
      { category: "everything", rate: 0.001, capVND: null, period: "statement" },
    ],
    totalCapVND: 18_000_000,
    totalCapPeriod: "year",
    annualFeeVND: 4_000_000,
    feeWaiver: "Starter tier is free; paid tiers are monthly subscriptions (min 1 quarter), switchable in-app",
    lastVerified: "2026-08-01",
    notes: "NEW: VIB's membership-package card. Four tiers -- Starter (free, no boost), Plus (5%), Pro (8%), Elite (10%) -- up to 10% across 5 categories, max ~18M/year. Package fee up to 333,333/month; breakeven roughly 30M (Plus), 50M (Pro), 100M (Elite) spend per statement. Only worth it for high spenders who pick the right tier.",
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
