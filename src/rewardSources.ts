// Extra cashback / discount sources users can "stack" on top of the best card.
// These are portals/wallets/vouchers, not credit cards — open the purchase
// through them (or pay with the wallet) to earn an extra layer of cashback or
// vouchers. Rates vary constantly and by campaign, so we suggest sources and
// the ORDER to use them, not fixed rates.
import type { SpendCategory } from "./cards";

export type RewardLayer = "portal" | "voucher" | "wallet" | "card";

export interface RewardSource {
  name: string;
  layer: RewardLayer;
  categories: SpendCategory[];
  note: string;
  url: string;
  setup: string;
  setupUrl?: string;
}

export const REWARD_SOURCES: RewardSource[] = [
  {
    name: "ShopBack",
    layer: "portal",
    categories: ["online", "foreign", "travel", "everything"],
    note: "Start your purchase through ShopBack to stack cashback on Shopee, Lazada, Tiki, travel and more.",
    url: "https://www.shopback.com/vn",
    setup: "Create a free ShopBack account, add your bank/e-wallet for cashback payout, and install the browser extension + app so you never forget to start there.",
    setupUrl: "https://www.shopback.com/vn",
  },
  {
    name: "AccessTrade / Adpia",
    layer: "portal",
    categories: ["online", "travel", "everything"],
    note: "Vietnamese affiliate-cashback portals — alternative to ShopBack for some local merchants.",
    url: "https://accesstrade.vn",
    setup: "Register once and link a payout method. Use as a backup when ShopBack doesn't cover a merchant.",
    setupUrl: "https://accesstrade.vn",
  },
  {
    name: "TichLuy",
    layer: "portal",
    categories: ["online", "travel", "everything"],
    note: "Long-running local cashback site — Shopee, Lazada, Tiki, Sendo and travel. Good homegrown fallback when ShopBack doesn't track a merchant. (verify current rates)",
    url: "https://tichluy.vn",
    setup: "Create a free TichLuy account, add a payout method, and open shops via TichLuy before buying.",
    setupUrl: "https://tichluy.vn",
  },
  {
    name: "Cashback.com.vn",
    layer: "portal",
    categories: ["online", "everything"],
    note: "Cashback across Tiki, Shopee, Lazada and ~130 brands; advertises fast (~24h) payout. Per-order cap often applies. (verify current rates)",
    url: "https://cashback.com.vn",
    setup: "Sign up, link a payout method, and start your purchase through cashback.com.vn.",
    setupUrl: "https://cashback.com.vn",
  },
  {
    name: "CashbackVN",
    layer: "portal",
    categories: ["online", "everything"],
    note: "Points-based cashback with solid Shopee, Lazada and TikTok Shop coverage. (verify current rates)",
    url: "https://cashbackvn.com",
    setup: "Register, link a payout method, and route purchases through CashbackVN.",
    setupUrl: "https://cashbackvn.com",
  },
  {
    name: "Shopee Xu / ShopeePay",
    layer: "voucher",
    categories: ["online"],
    note: "Collect Shopee Xu daily and grab platform + shop vouchers, then pay with ShopeePay for extra promos.",
    url: "https://shopee.vn",
    setup: "In the Shopee app: turn on Shopee Xu, follow your favourite shops for vouchers, and set up ShopeePay linked to your best card.",
    setupUrl: "https://shopee.vn",
  },
  {
    name: "Lazada vouchers / LazWallet",
    layer: "voucher",
    categories: ["online"],
    note: "Collect platform + store vouchers and stack LazWallet/LazCoins at checkout.",
    url: "https://www.lazada.vn",
    setup: "In the Lazada app: collect vouchers from the voucher centre and link your card to LazWallet.",
    setupUrl: "https://www.lazada.vn",
  },
  {
    name: "MoMo",
    layer: "wallet",
    categories: ["dining", "supermarket", "entertainment", "online", "everything"],
    note: "Pay with MoMo for merchant vouchers and cashback on food, bills, top-ups and QR payments.",
    url: "https://momo.vn",
    setup: "Download MoMo, verify your ID (eKYC), and link your best credit card as a funding source so card cashback + MoMo promo both apply.",
    setupUrl: "https://momo.vn",
  },
  {
    name: "ZaloPay",
    layer: "wallet",
    categories: ["dining", "supermarket", "entertainment", "everything"],
    note: "ZaloPay QR and bill-payment discounts at partner merchants.",
    url: "https://zalopay.vn",
    setup: "Download ZaloPay, verify your ID, and link your best card. Check the app's voucher tab before paying at partners.",
    setupUrl: "https://zalopay.vn",
  },
  {
    name: "Klook",
    layer: "voucher",
    categories: ["travel", "entertainment"],
    note: "Deals on attractions, tours and transport — often cheaper than at the gate.",
    url: "https://www.klook.com/vi",
    setup: "Create a Klook account and turn on the newsletter for promo codes. Always check Klook before booking attractions.",
    setupUrl: "https://www.klook.com/vi",
  },
];

export function sourcesFor(category: SpendCategory): RewardSource[] {
  return REWARD_SOURCES.filter((s) => s.categories.includes(category));
}

export interface StackStep {
  order: number;
  layer: RewardLayer;
  title: string;
  detail: string;
  sources: RewardSource[];
}

const LAYER_ORDER: RewardLayer[] = ["portal", "voucher", "card", "wallet"];

export function buildStackingPlan(
  category: SpendCategory,
  bestCardLabel?: string
): StackStep[] {
  const relevant = sourcesFor(category);
  const steps: StackStep[] = [];
  let order = 1;

  for (const layer of LAYER_ORDER) {
    if (layer === "card") {
      steps.push({
        order: order++,
        layer: "card",
        title: "Pay with your best card",
        detail: bestCardLabel
          ? `Use ${bestCardLabel} — your highest cashback card for this category. Check the Wallet tab if its monthly cap is close.`
          : "Use the highest-cashback card you own for this category (add cards in the Wallet tab to see which).",
        sources: [],
      });
      continue;
    }

    const sources = relevant.filter((s) => s.layer === layer);
    if (sources.length === 0) continue;

    const meta: Record<Exclude<RewardLayer, "card">, { title: string; detail: string }> = {
      portal: {
        title: "Start through a cashback portal",
        detail: "Open the shop via one of these first — your purchase gets tracked for an extra cashback layer before you've even checked out.",
      },
      voucher: {
        title: "Collect & apply vouchers",
        detail: "Grab platform coins and shop vouchers, then apply them at checkout.",
      },
      wallet: {
        title: "Or pay via an e-wallet promo",
        detail: "If a wallet promo beats raw card cashback, pay through the wallet (with your card linked as the funding source) to stack both.",
      },
    };

    steps.push({
      order: order++,
      layer,
      title: meta[layer].title,
      detail: meta[layer].detail,
      sources,
    });
  }

  return steps;
}

export function allLinkableSources(): RewardSource[] {
  return REWARD_SOURCES;
}
