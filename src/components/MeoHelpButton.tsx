import { replayTourStep } from "../lib/tourBus";
import type { Lang } from "../i18n";

// =============================================================================
// MeoHelpButton — a small Meo who re-explains the step he is standing next to.
// =============================================================================
//
// From the 14 Aug user research: people either skipped the intro tour or forgot
// it. A tour you can only see once is not help, it is a formality — the moment
// someone actually needs the explanation is a week later, staring at the
// section, and by then the only way back was clearing localStorage.
//
// So each of the user's steps gets its own Meo. Tapping him replays THAT step,
// with the same words and the same voice as the original tour.
//
// `target` must match a TourStep's `target` in ProductTour.tsx. It is the
// selector of the element being explained, which is also the element this
// button sits beside — so if the section is ever deleted, the dead button is
// deleted with it rather than lingering.
// =============================================================================

export default function MeoHelpButton({
  target,
  lang,
  className = "",
}: {
  target: string;
  lang: Lang;
  className?: string;
}) {
  const label = lang === "vi" ? "Meo chỉ lại" : "Show me again";
  return (
    <button
      type="button"
      onClick={() => replayTourStep(target)}
      title={label}
      aria-label={label}
      className={
        "shrink-0 inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand-light/60 " +
        "pl-0.5 pr-2 py-0.5 text-[10px] font-semibold text-brand-dark hover:border-brand hover:bg-brand-light " +
        "transition " + className
      }
    >
      <img
        src="/mascot.png"
        alt=""
        aria-hidden="true"
        className="w-5 h-5 rounded-full object-cover bg-white"
      />
      <span className="whitespace-nowrap">?</span>
    </button>
  );
}
