// =============================================================================
// tourBus — "show me that step again"
// =============================================================================
//
// Added 15 Aug 2026 for the per-section Meo help buttons.
//
// The tour is owned by App.tsx, but the buttons that replay a step live deep in
// the tree: the paste box is in PasteHero, the search field and the payment
// layers are in BuyFlow, the price alert is in PriceAlerts. Threading a
// callback down to all four would mean adding a prop to every component in
// between, including ones that have nothing to do with the tour.
//
// A DOM CustomEvent keeps that plumbing out of the components entirely: a
// button says "replay the step whose target is #search-input" and App decides
// what that means. If the tour is ever removed, these calls become harmless
// no-ops rather than broken props.
//
// Deliberately keyed by TARGET SELECTOR, not step index. Indexes move whenever
// a step is inserted — as one just was, when Xem giá became step 1 — and a
// silently-wrong index sends the user to the wrong explanation.
// =============================================================================

const EVENT = "meo:replay-tour-step";
import { trackAction } from "./track";

/** Ask App to run the tour starting at the step that spotlights `target`. */
export function replayTourStep(target: string): void {
  try {
    // Which sections people come back to is the whole argument for these
    // buttons existing. If nobody ever taps them, delete them.
    trackAction("tour_step_replayed", { target });
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { target } }));
  } catch {
    /* SSR / very old browser — the help button just does nothing. */
  }
}

/** App subscribes here. Returns an unsubscribe function. */
export function onReplayTourStep(fn: (target: string) => void): () => void {
  const handler = (e: Event) => {
    const t = (e as CustomEvent<{ target?: string }>).detail?.target;
    if (typeof t === "string" && t) fn(t);
  };
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
