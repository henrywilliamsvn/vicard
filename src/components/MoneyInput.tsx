import { type Lang } from "../i18n";

// Formatted đồng input: shows thousands separators (1.000.000) and offers
// quick-add chips so mobile users don't have to type long numbers.
const CHIPS = [100000, 500000, 1000000, 5000000];

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
  return (
    <div>
      <div className="relative mt-1">
        <input
          inputMode="numeric"
          value={fmt(value)}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "");
            onChange(digits ? parseInt(digits, 10) : 0);
          }}
          placeholder={placeholder ?? "0"}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-7"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">đ</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(value + c)}
            className="text-xs bg-slate-100 hover:bg-brand-light text-slate-600 rounded-full px-2.5 py-1"
          >
            +{chipLabel(c)}
          </button>
        ))}
        {value > 0 && (
          <button
            type="button"
            onClick={() => onChange(0)}
            className="text-xs text-slate-400 hover:text-red-500 rounded-full px-2 py-1"
          >
            {lang === "vi" ? "Xoá" : "Clear"}
          </button>
        )}
      </div>
    </div>
  );
}
