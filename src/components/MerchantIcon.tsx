import { useState } from "react";

// Merchant logo icon. Tries a real favicon from the store's domain (via the
// privacy-respecting DuckDuckGo icon service) and falls back to a clean
// coloured initial badge if it fails or there's no domain.
// (Want zero external calls? Delete the <img> branch and always return the badge.)

function domainOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Stable brand-ish colour from the name so badges are consistent per merchant.
const COLORS = ["#FF7A1A", "#0E7C5A", "#2563EB", "#DB2777", "#7C3AED", "#D97706", "#0891B2"];
function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export default function MerchantIcon({
  name,
  url,
  size = 28,
}: {
  name: string;
  url: string;
  size?: number;
}) {
  const [err, setErr] = useState(false);
  const host = domainOf(url);
  const initial = (name.trim()[0] || "?").toUpperCase();
  const px = { width: size, height: size } as const;

  if (err || !host) {
    return (
      <span
        style={{ ...px, background: colorFor(name) }}
        className="inline-flex items-center justify-center rounded-full text-white font-bold shrink-0"
      >
        <span style={{ fontSize: size * 0.45 }}>{initial}</span>
      </span>
    );
  }
  return (
    <img
      src={`https://icons.duckduckgo.com/ip3/${host}.ico`}
      onError={() => setErr(true)}
      alt={name}
      style={px}
      className="rounded-full object-contain bg-white border border-slate-100 shrink-0"
      loading="lazy"
    />
  );
}
