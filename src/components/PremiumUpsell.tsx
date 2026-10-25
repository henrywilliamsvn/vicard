import { t } from "../i18n";
import type { Lang } from "../i18n";
import { usePremium } from "../lib/premium";

// Shown to FREE users in place of the loyalty section: a compact teaser of what
// Premium unlocks + a "Try Premium" CTA. The CTA flips the stub entitlement
// (usePremium) — wire it to the real subscribe/checkout flow when billing is live.
export default function PremiumUpsell({ lang }: { lang: Lang }) {
  const [, setPremium] = usePremium();
  const benefits = [
    t(lang, "upsellB1"),
    t(lang, "upsellB2"),
    t(lang, "upsellB3"),
    t(lang, "upsellB4"),
  ];
  return (
    <section
      className="rounded-xl p-4 text-white"
      style={{ background: "linear-gradient(160deg,#FF7A1A,#E2640A)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wide bg-white/25 rounded-full px-2 py-0.5 font-bold">
          Premium
        </span>
        <span className="text-[11px] opacity-90">{t(lang, "upsellNote")}</span>
      </div>
      <h2 className="text-lg font-extrabold mb-2">{t(lang, "upsellTitle")}</h2>
      <ul className="space-y-1 mb-3">
        {benefits.map((b) => (
          <li key={b} className="text-sm opacity-95">{b}</li>
        ))}
      </ul>
      <button
        onClick={() => setPremium(true)}
        className="w-full bg-white text-[#E2640A] rounded-lg py-2.5 font-bold hover:bg-white/90"
      >
        {t(lang, "upsellCta")} →
      </button>
    </section>
  );
}
