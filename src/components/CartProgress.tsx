// =============================================================================
// CartProgress — Meo pushing a trolley along the redirect countdown.
// =============================================================================
//
// Added 15 Aug 2026. The redirect wait is the moment people bounce: nothing is
// happening, the app looks stalled, and a thin bar creeping across gives no
// sense that anything is being done for you. A character physically walking the
// distance reads as progress in a way a bar does not.
//
// Purely decorative — it is driven by the same `pct` as the bar, never its own
// timer, so it cannot drift out of sync with the real countdown or imply the
// redirect is further along than it is.
//
// Motion is CSS-transition only (no rAF loop, no framer-motion): this screen is
// on-screen for ~3 seconds on a phone that is about to hand off to another app,
// and a render loop here is wasted battery at exactly the wrong moment.
// =============================================================================

export default function CartProgress({ pct }: { pct: number }) {
  const p = Math.min(100, Math.max(0, pct));

  return (
    <div
      className="w-64 max-w-full mb-6 select-none"
      aria-hidden="true" /* the bar above already announces progress via aria-live */
    >
      {/* the lane Meo walks along */}
      <div className="relative h-9">
        <div className="absolute left-0 right-0 bottom-0 h-px bg-white/40" />

        {/* Meo + trolley. `left` is a percentage of the lane; the -50% keeps him
            centred on his own position so he doesn't overshoot the end. The
            translate is on a wrapper so the walk-bob below composes cleanly. */}
        <div
          className="absolute bottom-0 transition-[left] duration-1000 ease-linear"
          style={{ left: p + "%", transform: "translateX(-50%)" }}
        >
          <div className="flex items-end gap-0.5 meo-walk">
            <img
              src="/mascot.png"
              alt=""
              className="w-8 h-8 rounded-full object-cover bg-white/25"
            />
            {/* trolley, drawn in code so it inherits the brand and needs no asset */}
            <svg width="18" height="16" viewBox="0 0 18 16" className="mb-0.5">
              <path
                d="M1 1h3l2.2 8.2h8.1L17 3.4H5.2"
                fill="none"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="7.5" cy="13.4" r="1.5" fill="white" />
              <circle cx="14" cy="13.4" r="1.5" fill="white" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
