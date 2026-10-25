import { useState } from "react";
import PasteHero from "./PasteHero";
import type { OwnedCardState } from "./cards";
import { type Lang } from "./i18n";

// =============================================================================
// PriceTab — "Xem giá". The app's front door, added 15 Aug 2026.
// =============================================================================
//
// ONE JOB: paste a link, see what you'd save. Nothing else belongs here.
//
// This is the direct answer to the 14 Aug user research ("too complicated for
// new users"). The paste box used to be the first row of Mua gì, buried above a
// category picker, an amount field, a savings card, a payment-layer list, price
// alerts and a deals grid. A first-time visitor had to work out which of seven
// things to touch first. Now the first screen has exactly one control.
//
// ⚠️ DO NOT ADD A SECOND FEATURE TO THIS TAB. The moment it has two jobs it is
// the old Mua gì again, and the research finding comes straight back.
//
// After a successful paste the app moves the user to Mua gì (see `onFound` and
// App.tsx). A FAILED paste deliberately keeps them here with the manual-amount
// fallback that PasteHero already renders — bouncing someone to an empty basket
// because their link wasn't recognised is how you lose a first-time user.
// =============================================================================

export default function PriceTab({
  ownedStates,
  lang,
  onPickCards,
  onContinue,
}: {
  ownedStates: OwnedCardState[];
  lang: Lang;
  onPickCards: () => void;
  /** Move to the Giỏ hàng tab. Only ever called by the user pressing the button. */
  onContinue?: () => void;
}) {
  // ⚠️ THIS TAB MUST NOT NAVIGATE BY ITSELF (fixed 15 Aug 2026).
  // The first version auto-switched to the basket ~900ms after a link was
  // recognised. That was wrong: the whole point of Xem giá is to SHOW the
  // answer, and jumping away means the user never reads it — Henry hit exactly
  // that within minutes of it shipping. The item is still added to the basket
  // automatically; only the navigation is now the user's choice.
  const [found, setFound] = useState(false);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">
          {lang === "vi" ? "Dán link — xem bạn tiết kiệm bao nhiêu" : "Paste a link — see what you save"}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {lang === "vi"
            ? "Chỉ một bước. Meo đọc giá rồi nói bạn nên quẹt thẻ nào."
            : "One step. Meo reads the price and tells you which card to use."}
        </p>
      </div>

      <PasteHero
        ownedStates={ownedStates}
        lang={lang}
        onPickCards={onPickCards}
        onFound={() => setFound(true)}
      />

      {found && (
        <button
          onClick={() => onContinue?.()}
          className="w-full bg-brand text-white rounded-xl py-3 text-sm font-bold hover:bg-brand-dark"
        >
          {lang === "vi" ? "Xong — xem giỏ hàng →" : "Done — see my basket →"}
        </button>
      )}
    </div>
  );
}
