// =============================================================================
// wishlist.ts — shopping list + deal-watch matching (Path A: checks on open).
// =============================================================================
//
// The user adds things they want to buy, with a target discount % ("tell me
// when this is at least 30% off"). When the app opens, we match their list
// against the current deals (deals.ts) and surface anything that hits target.
//
// FUTURE (Path B): a scheduled server job + web-push could run matchWishlist
// every 6h and notify even when the app is closed. The matching logic below is
// already reusable for that — only the trigger changes.
// =============================================================================
import type { SpendCategory } from "./cards";
import type { DealWithLink } from "./deals";

export interface WishlistItem {
  id: string;
  name: string;
  category: SpendCategory;
  targetDiscountPct: number; // surface/notify when a deal's discount >= this
  createdAt: string;
}

export interface WishlistMatch {
  item: WishlistItem;
  deals: DealWithLink[]; // deals that meet or beat the item's target
}

// For each wishlist item, find deals in its category that meet/beat its target.
export function matchWishlist(
  items: WishlistItem[],
  deals: DealWithLink[]
): WishlistMatch[] {
  return items.map((item) => ({
    item,
    deals: deals.filter(
      (d) => d.category === item.category && d.discountPct >= item.targetDiscountPct
    ),
  }));
}

// Total number of item↔deal matches across the whole list.
export function countMatches(matches: WishlistMatch[]): number {
  return matches.reduce((n, m) => n + m.deals.length, 0);
}
