// =============================================================================
// benefit.ts — the ONE number the whole "paste a link" feature exists to show.
// Pure and unit-tested. No React, no I/O. UI passes in a price, a merchant
// (merchants.ts) and a card choice; it returns an honest, layered saving.
//
// Rules that keep the number trustworthy:
//   • Voucher applies first; portal + card are computed on the POST-voucher price.
//   • Card cashback is capped at the card's monthly cap (cardCapped flags it).
//   • Voucher + portal are estimates → surfaced in `assumptions` for the UI note.
//   • A layer that can't legitimately stack is omitted, never inflated.
//   • Ranking of cards is by USER benefit only — never by affiliate/CPA size.
// =============================================================================

import { CARDS, type CardProduct, type RewardRule, type SpendCategory } from "./cards";
import type { Merchant } from "./merchants";

// Cards that existing holders keep but new applicants can't open — excluded from
// the "open this card" funnel so we never send someone to a dead end. Prefer the
// optional `openToNew` field on CardProduct when you add it; this set is the
// interim source of truth. (VPBank Super Shopee Platinum: CLOSED to new — cards.ts.)
export const CLOSED_TO_NEW: ReadonlySet<string> = new Set<string>([
  "vpbank-super-shopee-platinum",
]);

export interface CardChoice {
  name: string;
  rate: number;
  /** Monthly cashback cap in VND, or null for uncapped. */
  capVND: number | null;
}

export interface BenefitInput {
  price: number;
  merchant: Merchant;
  /** Best card the user owns, OR the best card to open. null = no card advice. */
  card: CardChoice | null;
}

export interface BenefitResult {
  price: number;
  voucher: number;
  portal: number;
  card: number;
  total: number;
  finalPrice: number;
  /** Total saving as a fraction of price (0.15 = 15%). */
  pct: number;
  cardCapped: boolean;
  assumptions: string[];
}

function pctLabel(r: number): string {
  return Math.round(r * 100) + "%";
}

/** Pick the reward rule a card applies to a category (specific → everything). */
export function ruleFor(card: CardProduct, category: SpendCategory): RewardRule | null {
  return (
    card.rewards.find((r) => r.category === category) ??
    card.rewards.find((r) => r.category === "everything") ??
    null
  );
}

/** Turn a card + its matched rule into the minimal input computeBenefit needs. */
export function cardChoiceFrom(card: CardProduct, rule: RewardRule): CardChoice {
  const capVND = rule.capVND != null ? rule.capVND : card.totalCapVND ?? null;
  return { name: card.product, rate: rule.rate, capVND };
}

/**
 * Best card a NEW applicant could open for this category — powers the card-CPA
 * funnel ("open this card, +Xđ on this order"). Skips closed-to-new cards.
 * Ranks purely by cashback rate for the user, never by commission.
 */
export function bestCardToOpen(
  category: SpendCategory,
): { card: CardProduct; rule: RewardRule; choice: CardChoice } | null {
  let best: { card: CardProduct; rule: RewardRule; choice: CardChoice } | null = null;
  for (const card of CARDS) {
    if (CLOSED_TO_NEW.has(card.id)) continue;
    if ((card as { openToNew?: boolean }).openToNew === false) continue;
    const rule = ruleFor(card, category);
    if (!rule) continue;
    if (!best || rule.rate > best.rule.rate) best = { card, rule, choice: cardChoiceFrom(card, rule) };
  }
  return best;
}

const EMPTY = (price: number): BenefitResult => ({
  price: Math.max(0, Math.round(price) || 0),
  voucher: 0, portal: 0, card: 0, total: 0,
  finalPrice: Math.max(0, Math.round(price) || 0),
  pct: 0, cardCapped: false, assumptions: [],
});

/**
 * Compute the layered saving for a pasted product. Pure — same input, same output.
 */
export function computeBenefit({ price, merchant, card }: BenefitInput): BenefitResult {
  if (!(price > 0)) return EMPTY(price);

  const assumptions: string[] = [];

  // 1) Affiliate-exclusive voucher (estimate).
  let voucher = 0;
  if (merchant.voucher && !merchant.stackExclusions?.voucher) {
    voucher = Math.round(Math.min(price * merchant.voucher.pct, merchant.voucher.capVND));
    assumptions.push(
      `Voucher ${merchant.name} ~${pctLabel(merchant.voucher.pct)} (tối đa ${merchant.voucher.capVND.toLocaleString("vi-VN")}đ) — ước tính, cập nhật ${merchant.voucher.lastChecked}.`,
    );
  }
  const afterVoucher = price - voucher;

  // 2) Cashback portal (estimate), computed on the post-voucher amount.
  let portal = 0;
  if (merchant.portal && !merchant.stackExclusions?.portal) {
    portal = Math.round(afterVoucher * merchant.portal.pct);
    assumptions.push(`Hoàn tiền qua ${merchant.portal.name} ~${pctLabel(merchant.portal.pct)} — ước tính, đổi theo ngày.`);
  }

  // 3) Best card cashback, capped at the card's monthly limit.
  let cardCashback = 0;
  let cardCapped = false;
  if (card) {
    const raw = afterVoucher * card.rate;
    if (card.capVND != null) {
      cardCashback = Math.round(Math.min(raw, card.capVND));
      cardCapped = raw > card.capVND;
      if (cardCapped) {
        assumptions.push(`Hoàn tiền thẻ đã chạm hạn mức ${card.capVND.toLocaleString("vi-VN")}đ/tháng.`);
      }
    } else {
      cardCashback = Math.round(raw);
    }
  }

  const total = voucher + portal + cardCashback;
  const finalPrice = price - total;
  return {
    price: Math.round(price),
    voucher, portal, card: cardCashback,
    total, finalPrice,
    pct: total / price,
    cardCapped, assumptions,
  };
}
