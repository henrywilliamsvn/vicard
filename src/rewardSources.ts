// Extra cashback / discount sources users can "stack" on top of the best card.
// These are portals/wallets, not credit cards — open the purchase through them
// (or pay with the wallet) to earn an extra layer of cashback or vouchers.
// Rates vary constantly and by campaign, so we suggest sources, not fixed rates.
import type { SpendCategory } from "./cards";

export interface RewardSource {
  name: string;
  categories: SpendCategory[];
  note: string;
  url: string;
}

export const REWARD_SOURCES: RewardSource[] = [
  {
    name: "ShopBack",
    categories: ["online", "foreign", "travel", "everything"],
    note: "Start your purchase through ShopBack to stack cashback on Shopee, Lazada, Tiki, travel and more.",
    url: "https://www.shopback.com/vn",
  },
  {
    name: "MoMo",
    categories: ["dining", "supermarket", "entertainment", "everything"],
    note: "Pay with MoMo for merchant vouchers and cashback on food, bills, top-ups and QR payments.",
    url: "https://momo.vn",
  },
  {
    name: "ZaloPay",
    categories: ["dining", "supermarket", "entertainment", "everything"],
    note: "ZaloPay QR and bill-payment discounts at partner merchants.",
    url: "https://zalopay.vn",
  },
  {
    name: "Klook",
    categories: ["travel", "entertainment"],
    note: "Deals on attractions, tours and transport — often cheaper than at the gate.",
    url: "https://www.klook.com/vi",
  },
  {
    name: "Shopee Xu / ShopeePay",
    categories: ["online"],
    note: "Stack Shopee Xu and ShopeePay vouchers on Shopee orders.",
    url: "https://shopee.vn",
  },
];

export function sourcesFor(category: SpendCategory): RewardSource[] {
  return REWARD_SOURCES.filter((s) => s.categories.includes(category));
}
