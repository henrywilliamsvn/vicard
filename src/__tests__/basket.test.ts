// =============================================================================
// basket.test.ts — the combine-vs-separate engine.
// =============================================================================
//
// There is no test runner wired into this project yet (no vitest/jest in
// package.json), so these were written and run 15 Aug 2026 by compiling
// basket.ts + cards.ts with tsc and executing the assertions under plain node.
// They are kept here so they run for real the moment a runner is added — and so
// the hand-computed expectations survive as documentation either way.
//
// ⚠️ THE FIRST VERSION OF TEST 4 WAS WRONG, NOT THE ENGINE. It used a card with
// only 50k of headroom, and asserted that splitting must win. It does not: at
// 20% with 50k left, that card earns 50k on a 5tr item while a 15% uncapped card
// earns 750k, so one card genuinely IS best. The engine said so and the test was
// corrected. Splitting only wins when  min(rate_hi · a, headroom) > rate_lo · a.
// If you change these numbers, redo that algebra first.
// =============================================================================

import { planBasket, rateFor } from "./basket";
import { CARDS } from "./cards";
import type { OwnedCardState } from "./cards";

const online = CARDS.map((c) => ({ c, r: rateFor(c, "online") }))
  .filter((x) => x.r > 0)
  .sort((a, b) => b.r - a.r);
const HI = online[0];   // highest online rate the catalogue offers
const LO = online[1];

const item = (id: string, amount: number) =>
  ({ id, name: id, category: "online" as const, amount });
const own = (id: string, capVND: number | null, used = 0): OwnedCardState =>
  ({ id, usedThisPeriodVND: used, capVND });

export const CASES = [
  {
    name: "no cards owned → asks for cards, invents nothing",
    run: () => {
      const p = planBasket([item("a", 1_000_000)], []);
      return p.advice[0].kind === "no-cards" && p.total === 0;
    },
  },
  {
    name: "no prices → asks for prices",
    run: () => planBasket([item("a", 0)], [own(HI.c.id, null)]).advice[0].kind === "no-amounts",
  },
  {
    name: "nothing capped → one card, no phantom gain",
    run: () => {
      const p = planBasket([item("a", 2_000_000), item("b", 3_000_000)], [own(HI.c.id, null), own(LO.c.id, null)]);
      return p.advice[0].kind === "single" && p.gain === 0
        && p.total === Math.round(5_000_000 * HI.r);
    },
  },
  {
    name: "cap forces a split → exactly the hand-computed 25.000đ gain",
    // HI at 20% with 400k headroom, LO at 15% uncapped, two 2.5tr items:
    //   split = min(0.2·2.5tr, 400k) + 0.15·2.5tr = 400k + 375k = 775k
    //   one card (LO) = 0.15 · 5tr = 750k        → gain 25k
    run: () => {
      const p = planBasket([item("a", 2_500_000), item("b", 2_500_000)], [own(HI.c.id, 400_000), own(LO.c.id, null)]);
      return p.groups.length === 2 && p.gain === 25_000
        && p.advice.some((a) => a.kind === "split")
        && p.advice.some((a) => a.kind === "cap")
        && p.total >= p.singleCardTotal;
    },
  },
  {
    name: "headroom = cap minus cashback ALREADY earned",
    // The cap is on cashback đồng, not on spend. 50k cap, 40k already earned
    // → only 10k left however much you spend.
    run: () => planBasket([item("a", 10_000_000)], [own(HI.c.id, 50_000, 40_000)]).total === 10_000,
  },
  {
    name: "per-item cashback sums to the group total, and never exceeds the cap",
    run: () => {
      const p = planBasket([item("a", 4_000_000), item("b", 6_000_000)], [own(HI.c.id, 30_000)]);
      const sum = p.placements.reduce((s, x) => s + x.cashback, 0);
      return Math.abs(sum - p.groups[0].cashback) <= 1 && p.total <= 30_000;
    },
  },
  {
    name: "flags non-exact rather than claiming an optimum it didn't compute",
    run: () => {
      const many = Array.from({ length: 18 }, (_, i) => item("i" + i, 1_000_000));
      const big = planBasket(many, [own(HI.c.id, 20_000), own(LO.c.id, null)]);
      const small = planBasket(many.slice(0, 4), [own(HI.c.id, 20_000), own(LO.c.id, null)]);
      return big.exact === false && small.exact === true;
    },
  },
];
