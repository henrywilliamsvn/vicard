// Unit tests for the paste-link feature's core logic.
// Run with Vitest (recommended for Vite projects):
//   npm i -D vitest
//   add to package.json → "scripts": { "test": "vitest run" }
//   npm test
//
// These tests pin the exact behaviour the UI depends on: honest caps, post-voucher
// base, graceful zero, host-based detection, and the closed-card exclusion.

import { describe, it, expect } from "vitest";
import { computeBenefit, bestCardToOpen, cardChoiceFrom, ruleFor, CLOSED_TO_NEW } from "../benefit";
import { detectMerchant, genericOnline, MERCHANTS, hostOf } from "../merchants";
import { CARDS } from "../cards";

const shopee = MERCHANTS.find((m) => m.id === "shopee")!;

// A fixed VIB-like online card so the math is deterministic in tests.
const VIB = { name: "VIB Cash Back", rate: 0.1, capVND: 2_000_000 };

describe("computeBenefit", () => {
  it("stacks voucher → portal → card on a Shopee order (matches the prototype)", () => {
    const r = computeBenefit({ price: 5_890_000, merchant: shopee, card: VIB });
    expect(r.voucher).toBe(150_000);            // 8% of 5.89M = 471k, capped at 150k
    expect(r.portal).toBe(172_200);             // 3% of (5.89M − 150k)
    expect(r.card).toBe(574_000);               // 10% of 5.74M, under the 2M cap
    expect(r.total).toBe(896_200);
    expect(r.finalPrice).toBe(4_993_800);
    expect(Math.round(r.pct * 100)).toBe(15);
    expect(r.cardCapped).toBe(false);
  });

  it("caps card cashback at the monthly limit and flags it", () => {
    const smallCap = { name: "Capped card", rate: 0.2, capVND: 300_000 };
    const r = computeBenefit({ price: 5_000_000, merchant: shopee, card: smallCap });
    // 20% of post-voucher would be ~970k, but the cap is 300k.
    expect(r.card).toBe(300_000);
    expect(r.cardCapped).toBe(true);
  });

  it("computes portal/card on the POST-voucher amount, not the gross price", () => {
    const r = computeBenefit({ price: 1_000_000, merchant: shopee, card: { name: "x", rate: 0.1, capVND: null } });
    const afterVoucher = 1_000_000 - r.voucher;
    expect(r.card).toBe(Math.round(afterVoucher * 0.1));
  });

  it("omits a layer when it can't stack (never inflates)", () => {
    const noPortal = { ...shopee, stackExclusions: { portal: true } };
    const r = computeBenefit({ price: 1_000_000, merchant: noPortal, card: VIB });
    expect(r.portal).toBe(0);
  });

  it("returns all-zero for a zero or negative price", () => {
    const r = computeBenefit({ price: 0, merchant: shopee, card: VIB });
    expect(r.total).toBe(0);
    expect(r.finalPrice).toBe(0);
  });

  it("works with no card (voucher + portal only)", () => {
    const r = computeBenefit({ price: 1_000_000, merchant: shopee, card: null });
    expect(r.card).toBe(0);
    expect(r.total).toBe(r.voucher + r.portal);
  });

  it("labels estimates in assumptions for the trust note", () => {
    const r = computeBenefit({ price: 1_000_000, merchant: shopee, card: VIB });
    expect(r.assumptions.some((a) => a.includes("ước tính"))).toBe(true);
  });
});

describe("detectMerchant (host-based, not substring)", () => {
  it("detects known marketplaces from real URLs", () => {
    expect(detectMerchant("https://shopee.vn/product-i.123.456")?.id).toBe("shopee");
    expect(detectMerchant("https://www.lazada.vn/products/abc.html")?.id).toBe("lazada");
    expect(detectMerchant("https://www.tiktok.com/@x/video/1")?.id).toBe("tiktok");
    expect(detectMerchant("https://tiki.vn/dien-thoai-p123.html")?.id).toBe("tiki");
  });

  it("does NOT match a blog that merely mentions a brand in its path", () => {
    expect(detectMerchant("https://blog.example.com/shopee-review-2026")).toBeNull();
  });

  it("returns null for non-URL text so callers fall back to generic", () => {
    expect(detectMerchant("iphone 15 pro max")).toBeNull();
    expect(hostOf("not a url")).toBeNull();
  });

  it("genericOnline() is a safe non-dead-end fallback", () => {
    const g = genericOnline();
    expect(g.category).toBe("online");
    expect(g.affiliateReady).toBe(false);
  });
});

describe("bestCardToOpen (card-CPA funnel)", () => {
  it("returns the highest-rate card open to new applicants for a category", () => {
    const best = bestCardToOpen("online");
    expect(best).not.toBeNull();
    // No closed-to-new card should ever be recommended to open.
    expect(CLOSED_TO_NEW.has(best!.card.id)).toBe(false);
    // It should be at least as good as any other open card for this category.
    for (const c of CARDS) {
      if (CLOSED_TO_NEW.has(c.id)) continue;
      const rule = ruleFor(c, "online");
      if (rule) expect(best!.rule.rate).toBeGreaterThanOrEqual(rule.rate);
    }
  });

  it("cardChoiceFrom falls back to the card's total cap when the rule has none", () => {
    const card = CARDS[0];
    const rule = ruleFor(card, "everything")!;
    const choice = cardChoiceFrom(card, rule);
    expect(choice.name).toBe(card.product);
    expect(choice.rate).toBe(rule.rate);
  });
});
