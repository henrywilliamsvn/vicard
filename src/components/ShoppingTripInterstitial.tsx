import { useEffect } from "react";
import type { Lang } from "../i18n";

// "Shopping Trip Active" interstitial.
// Intercepts clicks on external retailer/affiliate links (any <a target="_blank">
// pointing off-site), opens the new tab in-gesture, and shows a transparent
// 3-second "we're attaching your tracking" screen before redirecting. This gives
// shoppers visible confirmation that their cashback click was registered.

function cleanMerchant(text: string | null): string | null {
  if (!text) return null;
  let s = text.replace(/[↗→›»➜]/g, "").replace(/\s+/g, " ").trim();
  if (!s) return null;
  // Skip generic action labels so we don't render "Opening Apply…".
  if (/^(apply|mở thẻ|mua|mua ngay|buy|open|link|↗)$/i.test(s)) return null;
  return s.length > 32 ? s.slice(0, 32) : s;
}

function interstitialDoc(url: string, merchant: string | null, lang: Lang): string {
  const vi = lang === "vi";
  const dest = merchant ?? (vi ? "cửa hàng" : "the store");
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const title = vi ? `Đang mở ${dest}…` : `Opening ${dest}…`;
  const body = vi
    ? "Meo đang gắn mã theo dõi để đảm bảo hoàn tiền của bạn. Vui lòng đừng tắt cửa sổ này nhé!"
    : "Meo is attaching your tracking so your cashback is secured. Please don't close this window.";
  const auto = vi ? "Tự động chuyển sau" : "Redirecting in";
  const go = vi ? "Tiếp tục ngay" : "Continue now";
  return `<!doctype html><html lang="${vi ? "vi" : "en"}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,#FF7A1A,#E2640A);color:#fff;padding:24px}
.card{max-width:420px;text-align:center}
img{width:96px;height:96px;border-radius:50%;background:rgba(255,255,255,.18);object-fit:cover;margin:0 auto 18px;display:block}
h1{font-size:23px;font-weight:800;margin-bottom:10px}
p{font-size:15px;line-height:1.5;opacity:.95;margin-bottom:18px}
.bar{height:6px;background:rgba(255,255,255,.3);border-radius:6px;overflow:hidden;margin-bottom:14px}
.fill{height:100%;width:0;background:#fff;border-radius:6px;animation:grow 3s linear forwards}
@keyframes grow{to{width:100%}}
.count{font-size:13px;opacity:.9;margin-bottom:18px}
a{display:inline-block;background:#fff;color:#E2640A;font-weight:700;text-decoration:none;border-radius:999px;padding:10px 22px;font-size:15px}
</style></head><body><div class="card">
<img src="${location.origin}/mascot.png" alt="Meo"/>
<h1>🛒 ${esc(title)}</h1>
<p>${esc(body)}</p>
<div class="bar"><div class="fill"></div></div>
<div class="count" id="c"></div>
<a href="${esc(url)}">${esc(go)} →</a>
</div>
<script>
var n=3,el=document.getElementById('c'),lbl=${JSON.stringify(auto)},url=${JSON.stringify(url)};
function tick(){el.textContent=lbl+' '+n+'s';if(n--<=0){location.replace(url);return;}setTimeout(tick,1000);}
tick();
</script></body></html>`;
}

export default function ShoppingTripInterstitial({ lang }: { lang: Lang }) {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // let power-users bypass
      const a = (e.target as HTMLElement | null)?.closest?.("a") as HTMLAnchorElement | null;
      if (!a || a.target !== "_blank") return;
      const href = a.href;
      if (!/^https?:\/\//i.test(href)) return;
      let host = "";
      try {
        host = new URL(href).host;
      } catch {
        return;
      }
      if (host === location.host) return; // internal link — ignore

      const merchant = cleanMerchant(a.textContent);
      // Record the trip so the in-app confirmation toast + history can show it.
      window.dispatchEvent(
        new CustomEvent("mss-trip", { detail: { merchant: merchant ?? host, host } })
      );

      e.preventDefault();
      const w = window.open("about:blank", "_blank");
      if (!w) {
        // Popup blocked — fall back to a normal new-tab open so the user isn't stuck.
        window.open(href, "_blank", "noopener");
        return;
      }
      w.document.open();
      w.document.write(interstitialDoc(href, merchant, lang));
      w.document.close();
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [lang]);

  return null;
}
