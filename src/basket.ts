// =============================================================================
// basket.ts — "buy these together, or split them?"
// =============================================================================
//
// Pure. No React, no I/O, no network. Everything here is a function of the
// basket plus the user's own cards, so it can be unit-tested and reasoned about.
//
// -----------------------------------------------------------------------------
// WHAT THIS KNOWS, AND WHAT IT DELIBERATELY DOES NOT
// -----------------------------------------------------------------------------
// Knows (from cards.ts, which is real data the user entered about their wallet):
//   • each card's cashback RATE for each spend category
//   • each card's monthly cashback CAP and how much of it is already used
//
// Does NOT know, and must never imply it does:
//   • free-shipping thresholds        ("combine to reach 300k")
//   • voucher / promo minimum spend   ("spend 500k to use this code")
//   • per-merchant order rules
//
// Those are the usual reasons to COMBINE an order, and we hold no data for them.
// So this engine can only ever argue one side honestly — it finds cases where
// SPLITTING earns more because a cap runs out, and otherwise says "one card is
// fine". Every piece of copy it produces is hedged to "theo hạn mức thẻ của bạn"
// (by your cards' limits) rather than a flat "you should".
//
// ⚠️ If merchant thresholds are ever added, they belong in the ITEM (a
// `freeShipAt?: number`), not here — this file should stay a pure optimiser.
//
// -----------------------------------------------------------------------------
// THE CAP IS ON CASHBACK, NOT ON SPEND
// -----------------------------------------------------------------------------
// Verified against App.tsx and benefit.ts before writing a line of this:
//   • `capVND`             = maximum cashback đồng per statement period
//   • `usedThisPeriodVND`  = cashback ALREADY EARNED this period (App sums
//                            purchase log entries' `cashbackVND`)
// so headroom = cap - used, and cashback for spend s at rate r is
// min(s * r, headroom). Reading capVND as a spend cap would make every number
// here wrong by roughly 100x — which is exactly the sort of confidently wrong
// advice this product cannot afford.
// =============================================================================

import { CARDS, type CardProduct, type OwnedCardState, type SpendCategory } from "./cards";

export interface BasketItem {
  id: string;
  name: string;
  category: SpendCategory;
  /** đồng. 0 means "price unknown" — such items are carried but not optimised. */
  amount: number;
}

export interface ItemPlacement {
  itemId: string;
  cardId: string | null;
  cardName: string;
  rate: number;
  /** đồng of cashback this item actually earns in the chosen plan. */
  cashback: number;
}

export interface CardGroup {
  cardId: string;
  cardName: string;
  itemIds: string[];
  spend: number;
  cashback: number;
  /** True when this group's earnings were clipped by the card's remaining cap. */
  capped: boolean;
  /** đồng of headroom left on this card after the plan. */
  headroomLeft: number;
}

export type AdviceKind = "split" | "single" | "cap" | "no-cards" | "no-amounts";

export interface Advice {
  kind: AdviceKind;
  en: string;
  vi: string;
}

export interface BasketPlan {
  placements: ItemPlacement[];
  groups: CardGroup[];
  /** Cashback đồng for the recommended plan. */
  total: number;
  /** Cashback đồng if everything went on the single best card. */
  singleCardTotal: number;
  singleCardName: string;
  /** total - singleCardTotal. Positive means splitting is worth it. */
  gain: number;
  /** False when the basket was too large to search exhaustively (see below). */
  exact: boolean;
  advice: Advice[];
}

/** Cards the user owns, resolved against the catalogue. */
interface OwnedResolved {
  card: CardProduct;
  /** Remaining cashback đồng this period. Infinity when uncapped. */
  headroom: number;
}

function resolveOwned(owned: OwnedCardState[]): OwnedResolved[] {
  const out: OwnedResolved[] = [];
  for (const o of owned) {
    const card = CARDS.find((c) => c.id === o.id);
    if (!card) continue;
    const cap = o.capVND !== undefined ? o.capVND : card.totalCapVND ?? null;
    const headroom = cap == null ? Infinity : Math.max(0, cap - (o.usedThisPeriodVND || 0));
    out.push({ card, headroom });
  }
  return out;
}

/** The rate a card pays for a category: specific rule first, else "everything". */
export function rateFor(card: CardProduct, category: SpendCategory): number {
  const rule =
    card.rewards.find((r) => r.category === category) ??
    card.rewards.find((r) => r.category === "everything");
  return rule ? rule.rate : 0;
}

/** Cashback for one card given the raw (uncapped) earnings assigned to it. */
function clip(raw: number, headroom: number): number {
  return Math.min(raw, headroom);
}

/** Score one complete assignment (index into `cards` per item). */
function score(
  assign: number[],
  items: BasketItem[],
  cards: OwnedResolved[]
): { total: number; rawByCard: number[]; spendByCard: number[] } {
  const rawByCard = new Array(cards.length).fill(0);
  const spendByCard = new Array(cards.length).fill(0);
  for (let i = 0; i < items.length; i++) {
    const c = assign[i];
    rawByCard[c] += items[i].amount * rateFor(cards[c].card, items[i].category);
    spendByCard[c] += items[i].amount;
  }
  let total = 0;
  for (let c = 0; c < cards.length; c++) total += clip(rawByCard[c], cards[c].headroom);
  return { total, rawByCard, spendByCard };
}

/**
 * How many assignments we are willing to enumerate. cards^items grows fast;
 * beyond this we fall back to a greedy pass and set `exact: false` so the UI can
 * stay honest rather than claiming an optimum it did not compute.
 */
const MAX_SEARCH = 200_000;

function bestAssignment(
  items: BasketItem[],
  cards: OwnedResolved[]
): { assign: number[]; exact: boolean } {
  const n = items.length;
  const k = cards.length;
  if (n === 0 || k === 0) return { assign: [], exact: true };

  if (Math.pow(k, n) <= MAX_SEARCH) {
    // Exhaustive: caps make the objective non-linear, so a greedy pass can be
    // beaten. The basket is small; just check every combination.
    let bestAssign = new Array(n).fill(0);
    let bestTotal = -1;
    const assign = new Array(n).fill(0);
    const walk = (i: number) => {
      if (i === n) {
        const { total } = score(assign, items, cards);
        if (total > bestTotal) {
          bestTotal = total;
          bestAssign = assign.slice();
        }
        return;
      }
      for (let c = 0; c < k; c++) {
        assign[i] = c;
        walk(i + 1);
      }
    };
    walk(0);
    return { assign: bestAssign, exact: true };
  }

  // Fallback: biggest items first, each onto whichever card pays it most right
  // now given what has already been assigned.
  const order = items.map((_, i) => i).sort((a, b) => items[b].amount - items[a].amount);
  const assign = new Array(n).fill(0);
  const used = new Array(k).fill(0);
  for (const i of order) {
    let bestC = 0;
    let bestDelta = -1;
    for (let c = 0; c < k; c++) {
      const raw = items[i].amount * rateFor(cards[c].card, items[i].category);
      const delta = clip(used[c] + raw, cards[c].headroom) - clip(used[c], cards[c].headroom);
      if (delta > bestDelta) {
        bestDelta = delta;
        bestC = c;
      }
    }
    assign[i] = bestC;
    used[bestC] += items[i].amount * rateFor(cards[bestC].card, items[i].category);
  }
  return { assign, exact: false };
}

function vnd(n: number): string {
  return Math.round(n).toLocaleString("vi-VN") + "đ";
}

/**
 * Work out the best way to pay for a basket with the cards the user owns, and
 * say whether splitting it beats putting everything on one card.
 */
export function planBasket(items: BasketItem[], owned: OwnedCardState[]): BasketPlan {
  const priced = items.filter((i) => i.amount > 0);
  const cards = resolveOwned(owned);

  const empty: BasketPlan = {
    placements: [],
    groups: [],
    total: 0,
    singleCardTotal: 0,
    singleCardName: "",
    gain: 0,
    exact: true,
    advice: [],
  };

  if (cards.length === 0) {
    return {
      ...empty,
      advice: [
        {
          kind: "no-cards",
          en: "Add the cards you own and Meo can work out which items to put where.",
          vi: "Thêm thẻ bạn đang có, Meo sẽ tính giùm nên để món nào vào thẻ nào.",
        },
      ],
    };
  }
  if (priced.length === 0) {
    return {
      ...empty,
      advice: [
        {
          kind: "no-amounts",
          en: "Add a price to each item and Meo will compare paying together vs separately.",
          vi: "Nhập giá từng món, Meo so sánh mua chung với tách đơn giùm bạn.",
        },
      ],
    };
  }

  const { assign, exact } = bestAssignment(priced, cards);
  const { total, rawByCard, spendByCard } = score(assign, priced, cards);

  // Best single card for the whole basket — what the app would tell you today.
  let singleCardTotal = 0;
  let singleCardName = cards[0].card.product;
  for (const c of cards) {
    const raw = priced.reduce((s, it) => s + it.amount * rateFor(c.card, it.category), 0);
    const got = clip(raw, c.headroom);
    if (got > singleCardTotal) {
      singleCardTotal = got;
      singleCardName = c.card.product;
    }
  }

  const placements: ItemPlacement[] = priced.map((it, i) => {
    const c = cards[assign[i]];
    const raw = it.amount * rateFor(c.card, it.category);
    // Share any clipping across the card's items in proportion to what each
    // contributed, so per-item numbers always add up to the group total.
    const groupRaw = rawByCard[assign[i]];
    const groupGot = clip(groupRaw, c.headroom);
    const share = groupRaw > 0 ? raw / groupRaw : 0;
    return {
      itemId: it.id,
      cardId: c.card.id,
      cardName: c.card.product,
      rate: rateFor(c.card, it.category),
      cashback: Math.round(groupGot * share),
    };
  });

  const groups: CardGroup[] = [];
  for (let c = 0; c < cards.length; c++) {
    const ids = priced.filter((_, i) => assign[i] === c).map((it) => it.id);
    if (ids.length === 0) continue;
    const got = clip(rawByCard[c], cards[c].headroom);
    groups.push({
      cardId: cards[c].card.id,
      cardName: cards[c].card.product,
      itemIds: ids,
      spend: Math.round(spendByCard[c]),
      cashback: Math.round(got),
      capped: rawByCard[c] > cards[c].headroom + 0.5,
      headroomLeft: cards[c].headroom === Infinity ? Infinity : Math.round(Math.max(0, cards[c].headroom - got)),
    });
  }

  const gain = Math.round(total) - Math.round(singleCardTotal);
  const advice: Advice[] = [];

  if (groups.length > 1 && gain > 0) {
    const names = groups.map((g) => `${g.itemIds.length} món → ${g.cardName}`).join(" · ");
    advice.push({
      kind: "split",
      en: `Split the order by card: ${groups
        .map((g) => `${g.itemIds.length} item(s) → ${g.cardName}`)
        .join(" · ")}. About ${vnd(gain)} more than putting everything on ${singleCardName}.`,
      vi: `Tách đơn theo thẻ: ${names}. Lời hơn khoảng ${vnd(gain)} so với dồn hết vào ${singleCardName}.`,
    });
  } else {
    advice.push({
      kind: "single",
      en: `One card is enough here — put it all on ${singleCardName}. Splitting wouldn't earn more.`,
      vi: `Ở đây một thẻ là đủ — dồn hết vào ${singleCardName}. Tách đơn cũng không lời hơn.`,
    });
  }

  for (const g of groups.filter((x) => x.capped)) {
    advice.push({
      kind: "cap",
      en: `${g.cardName} hits its monthly cashback cap on this basket — anything beyond it earns nothing.`,
      vi: `${g.cardName} chạm trần hoàn tiền tháng này với giỏ hàng này — phần vượt trần không được hoàn thêm.`,
    });
  }

  return {
    placements,
    groups,
    total: Math.round(total),
    singleCardTotal: Math.round(singleCardTotal),
    singleCardName,
    gain,
    exact,
    advice,
  };
}
