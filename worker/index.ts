// =============================================================================
// Cloudflare Worker — serves the built SPA (via the ASSETS binding) and adds a
// small server-side API the browser can't do itself:
//
//   GET /api/price?url=<product url>
//     → { price: number | null, currency: "VND", title, source }
//
// Runs on Cloudflare's edge, so it can fetch a product page with no CORS limits
// and read the price out of the HTML (JSON-LD + OpenGraph/meta tags). Hosts are
// allow-listed so this can't be abused as an open proxy. JS-heavy / bot-walled
// pages (notably Shopee, sometimes Lazada) ship no price in their initial HTML,
// so those return price: null and the app falls back to manual entry.
// =============================================================================

interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
}

const ALLOWED_HOSTS = [
  "shopee.vn", "lazada.vn", "lazada.com.vn", "tiki.vn", "tiktok.com",
  "sendo.vn", "thegioididong.com", "dienmayxanh.com", "fptshop.com.vn",
  "cellphones.com.vn", "shopdunk.com", "hoanghamobile.com", "nguyenkim.com",
  "bachhoaxanh.com", "concung.com", "aliexpress.com", "traveloka.com",
  "tiki.com.vn", "didongviet.vn", "viettelstore.vn",
];

function hostAllowed(h: string): boolean {
  h = h.toLowerCase().replace(/^www\./, "");
  return ALLOWED_HOSTS.some((d) => h === d || h.endsWith("." + d));
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function toVnd(raw: unknown): number | null {
  if (raw == null) return null;
  let s = String(raw).trim().replace(/[₫đ]|vn[dđ]/gi, "").trim();
  if (!s) return null;
  let n: number;
  if (/^\d+(\.\d{1,2})?$/.test(s)) {
    n = parseFloat(s);                          // 1990000 or 1990000.00 (decimal point)
  } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    n = parseFloat(s.replace(/,/g, ""));        // 1,990,000(.00) US grouping
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    n = parseInt(s.replace(/\./g, ""), 10);     // 1.990.000 VN grouping
  } else {
    const d = s.replace(/[^\d]/g, "");
    n = d ? parseInt(d, 10) : NaN;
  }
  if (isNaN(n)) return null;
  n = Math.round(n);
  return n >= 1000 && n <= 1_000_000_000 ? n : null;
}

// Recursively search a parsed JSON-LD object for the first usable price field.
function priceFromJsonLd(node: unknown): number | null {
  if (node == null || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  for (const key of ["price", "lowPrice", "highPrice"]) {
    if (key in obj) {
      const v = toVnd(obj[key]);
      if (v) return v;
    }
  }
  for (const v of Object.values(obj)) {
    if (Array.isArray(v)) {
      for (const item of v) { const p = priceFromJsonLd(item); if (p) return p; }
    } else if (v && typeof v === "object") {
      const p = priceFromJsonLd(v); if (p) return p;
    }
  }
  return null;
}

async function readPrice(target: string): Promise<{ price: number | null; title: string | null; source: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let res: Response;
  try {
    res = await fetch(target, {
      headers: { "User-Agent": UA, "Accept-Language": "vi,en;q=0.8", Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) return { price: null, title: null, source: "http " + res.status };

  const metas: Record<string, string> = {};
  let title = "";
  const ldBlocks: string[] = [];
  let cur = "";
  let collecting = false;

  const rewriter = new HTMLRewriter()
    .on("meta", {
      element(el) {
        const k = el.getAttribute("property") || el.getAttribute("itemprop") || el.getAttribute("name");
        const c = el.getAttribute("content");
        if (k && c) metas[k.toLowerCase()] = c;
      },
    })
    .on("title", { text(t) { title += t.text; } })
    .on('script[type="application/ld+json"]', {
      element() { collecting = true; cur = ""; },
      text(t) {
        if (collecting) cur += t.text;
        if (t.lastInTextNode === false) return;
        if (collecting && cur.trim()) { ldBlocks.push(cur); collecting = false; }
      },
    });

  await rewriter.transform(res).arrayBuffer();

  // 1) meta tags (most reliable + cheapest)
  const metaKeys = ["product:price:amount", "og:price:amount", "price", "twitter:data1"];
  for (const k of metaKeys) {
    const v = toVnd(metas[k]);
    if (v) return { price: v, title: metas["og:title"] || title.trim() || null, source: "meta:" + k };
  }
  // 2) JSON-LD offers
  for (const block of ldBlocks) {
    try {
      const p = priceFromJsonLd(JSON.parse(block));
      if (p) return { price: p, title: metas["og:title"] || title.trim() || null, source: "json-ld" };
    } catch { /* malformed block — skip */ }
  }
  return { price: null, title: metas["og:title"] || title.trim() || null, source: "not-found" };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300" },
  });
}

async function handlePrice(request: Request): Promise<Response> {
  const u = new URL(request.url);
  const target = u.searchParams.get("url");
  if (!target) return json({ error: "missing url" }, 400);
  let parsed: URL;
  try { parsed = new URL(target); } catch { return json({ error: "bad url" }, 400); }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return json({ error: "bad protocol" }, 400);
  if (!hostAllowed(parsed.hostname)) return json({ price: null, currency: "VND", title: null, source: "host-not-allowed" });

  try {
    const { price, title, source } = await readPrice(parsed.toString());
    return json({ price, currency: "VND", title, source });
  } catch {
    return json({ price: null, currency: "VND", title: null, source: "fetch-failed" });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/price") return handlePrice(request);
    return env.ASSETS.fetch(request);
  },
};
