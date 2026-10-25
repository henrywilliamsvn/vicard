import { useState } from "react";
import { type Lang } from "../i18n";

// Formatted đồng input: shows thousands separators (1.000.000) and offers
// quick-add chips so mobile users don't have to type long numbers.
//
// -----------------------------------------------------------------------------
// WHY THIS DOESN'T REFORMAT WHILE YOU TYPE (fixed 4 Aug 2026)
// -----------------------------------------------------------------------------
// The original version was a fully controlled input whose value was re-rendered
// through Intl.NumberFormat on EVERY keystroke. On desktop that's fine. On
// Android (Gboard) and some iOS keyboards it is not: rewriting the input's value
// mid-composition destroys the keyboard's composing region, so the next
// keypress replaces the field instead of appending to it. The symptom is
// exactly what was reported — you can only get one digit in at a time, but
// pasting a whole number works, because a paste is a single atomic change.
//
// The fix: while the field has focus we keep the user's RAW digits in local
// state and never rewrite them. Grouping is applied when the field loses focus,
// and a live "1.234.567 đ" preview sits underneath so the number is still
// readable as it's typed. The keyboard is never interrupted.
// -----------------------------------------------------------------------------
const CHIPS = [100000, 500000, 1000000, 5000000];
const MAX_DIGITS = 12; // 999 tỷ — well beyond any real purchase

function chipLabel(n: number): string {
  return n >= 1_000_000 ? n / 1_000_000 + "tr" : n / 1000 + "k";
}
function fmt(n: number): string {
  return n > 0 ? new Intl.NumberFormat("vi-VN").format(n) : "";
}

export default function MoneyInput({
  value,
  onChange,
  lang,
  placeholder,
}: {
  value: number;
  onChange: (n: number) => void;
  lang: Lang;
  placeholder?: string;
}) {
  // null = not being edited (show the grouped number).
  // string = the user's raw digits, shown back to them untouched.
  const [draft, setDraft] = useState<string | null>(null);

  const editing = draft !== null;
  const shown = editing ? draft : fmt(value);

  // Any external change (quick-add chip, Clear, parent reset) drops the draft so
  // the field re-syncs to the real value instead of showing stale digits.
  const set = (n: number) => {
    setDraft(null);
    onChange(n);
  };

  return (
    <div>
      <div className="relative mt-1">
        <input
          inputMode="numeric"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={shown}
          onFocus={() => setDraft(value > 0 ? String(value) : "")}
          onBlur={() => setDraft(null)}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, MAX_DIGITS);
            setDraft(digits);
            onChange(digits ? parseInt(digits, 10) : 0);
          }}
          placeholder={placeholder ?? "0"}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-7"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">đ</span>
      </div>

      {/* Live grouped preview — only while typing, and only once grouping would
          actually change what's on screen. */}
      {editing && value > 0 && shown !== fmt(value) && (
        <div className="mt-1 text-xs text-slate-500 tabular-nums">{fmt(value)} đ</div>
      )}

      <div className="flex flex-wrap gap-1.5 mt-2">
        {CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => set(value + c)}
            className="text-xs bg-slate-100 hover:bg-brand-light text-slate-600 rounded-full px-2.5 py-1"
          >
            +{chipLabel(c)}
          </button>
        ))}
        {value > 0 && (
          <button
            type="button"
            onClick={() => set(0)}
            className="text-xs text-slate-400 hover:text-red-500 rounded-full px-2 py-1"
          >
            {lang === "vi" ? "Xoá" : "Clear"}
          </button>
        )}
      </div>
    </div>
  );
}
