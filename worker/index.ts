// =============================================================================
// Cloudflare Worker — serves the built SPA (via the ASSETS binding) and adds a
// small server-side API the browser can't do itself:
//
//   GET /api/price?url=<product url>
//     → { price: number | null, currency: "VND", title, source }
//
// Strategy, in order:
//   1. Shopee → call Shopee's own item API (price is NOT in the page HTML).
//   2. Any page → read OpenGraph/meta price tags.
//   3. → parse JSON-LD <script> offers.
//   4. → last-resort scan of embedded JSON state for a price key (Lazada/Tiki).
// Hosts are allow-listed so this can't be abused as an open proxy. Some
// marketplaces (esp. Shopee) actively block datacenter IPs, so a null result is
// expected sometimes — the app then asks the user to type the amount.
// =============================================================================

// Minimal R2 typings (no @cloudflare/workers-types in this repo).
interface R2Range { offset?: number; length?: number; suffix?: number }
interface R2Object {
  size: number;
  httpEtag: string;
  range?: R2Range;
  writeHttpMetadata(headers: Headers): void;
}
interface R2ObjectBody extends R2Object { body: ReadableStream }
interface R2Bucket {
  get(key: string, options?: { range?: Headers; onlyIf?: Headers }): Promise<R2Object | R2ObjectBody | null>;
}

interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  // Videos/images for the Meo channels live in R2 (bucket "meo-media"), not in
  // git and not in dist. Optional so the Worker still runs before the binding exists.
  MEDIA?: R2Bucket;
  // Optional — set via `wrangler secret put`. When present, the affiliate path
  // is tried first (most reliable for Shopee). Absent = public best-effort only.
  SHOPEE_AFFILIATE_APP_ID?: string;
  SHOPEE_AFFILIATE_SECRET?: string;
}

const ALLOWED_HOSTS = [
  "shopee.vn", "lazada.vn", "lazada.com.vn", "tiki.vn", "tiki.com.vn", "tiktok.com",
  "sendo.vn", "thegioididong.com", "dienmayxanh.com", "fptshop.com.vn",
  "cellphones.com.vn", "shopdunk.com", "hoanghamobile.com", "nguyenkim.com",
  "bachhoaxanh.com", "concung.com", "aliexpress.com", "traveloka.com",
  "didongviet.vn", "viettelstore.vn",
];

function hostAllowed(h: string): boolean {
  h = h.toLowerCase().replace(/^www\./, "");
  return ALLOWED_HOSTS.some((d) => h === d || h.endsWith("." + d));
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function toVnd(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/[₫đ]|vn[dđ]/gi, "").trim();
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

function priceFromJsonLd(node: unknown): number | null {
  if (node == null || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  for (const key of ["price", "lowPrice", "highPrice"]) {
    if (key in obj) { const v = toVnd(obj[key]); if (v) return v; }
  }
  for (const v of Object.values(obj)) {
    if (Array.isArray(v)) { for (const item of v) { const p = priceFromJsonLd(item); if (p) return p; } }
    else if (v && typeof v === "object") { const p = priceFromJsonLd(v); if (p) return p; }
  }
  return null;
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(name + '\\s*=\\s*"([^"]*)"', "i")) ||
            tag.match(new RegExp(name + "\\s*=\\s*'([^']*)'", "i"));
  return m ? m[1] : null;
}
function extractMetas(html: string): Record<string, string> {
  const metas: Record<string, string> = {};
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const k = attr(tag, "property") || attr(tag, "itemprop") || attr(tag, "name");
    const c = attr(tag, "content");
    if (k && c) metas[k.toLowerCase()] = c;
  }
  return metas;
}
function extractJsonLd(html: string): string[] {
  const blocks: string[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) blocks.push(m[1]);
  return blocks;
}
// Last resort: scan embedded JSON state (Lazada/Tiki/etc.) for a price key.
function genericPrice(html: string): { v: number; k: string } | null {
  const keys = ["price_min", "priceNumber", "salePrice", "finalPrice", "specialPrice", "current_price", "price"];
  for (const k of keys) {
    const m = html.match(new RegExp('"' + k + '"\\s*:\\s*"?([0-9][0-9.,]*)"?', "i"));
    if (m) { const v = toVnd(m[1]); if (v) return { v, k }; }
  }
  return null;
}

// Parse a VN price written in prose — titles/descriptions almost always carry it
// even when structured data doesn't. Handles "5.89tr", "5,89 triệu", "5.890.000đ".
function priceFromText(s: string): number | null {
  if (!s) return null;
  const low = s.toLowerCase();
  let m = low.match(/(\d+(?:[.,]\d+)?)\s*(?:tr|triệu)\b/);
  if (m) { const v = Math.round(parseFloat(m[1].replace(",", ".")) * 1_000_000); if (v >= 1000 && v <= 1_000_000_000) return v; }
  m = low.match(/(\d{1,3}(?:[.,]\d{3})+)\s*(?:đ|₫|vnd|vnđ)?/);
  if (m) { const v = toVnd(m[1]); if (v) return v; }
  m = low.match(/(\d+(?:[.,]\d+)?)\s*(?:k|nghìn|ngàn)\b/);
  if (m) { const v = Math.round(parseFloat(m[1].replace(",", ".")) * 1000); if (v >= 1000 && v <= 1_000_000_000) return v; }
  return null;
}

function parseShopeeIds(url: string): { shopid: string; itemid: string } | null {
  let m = url.match(/-i\.(\d+)\.(\d+)/);
  if (m) return { shopid: m[1], itemid: m[2] };
  m = url.match(/\/product\/(\d+)\/(\d+)/);
  if (m) return { shopid: m[1], itemid: m[2] };
  return null;
}
async function shopeeApiPrice(target: string): Promise<number | null> {
  const ids = parseShopeeIds(target);
  if (!ids) return null;
  const api = "https://shopee.vn/api/v4/item/get?itemid=" + ids.itemid + "&shopid=" + ids.shopid;
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 6000);
  try {
    const r = await fetch(api, {
      headers: { "User-Agent": UA, Accept: "application/json", "x-api-source": "pc", "x-shopee-language": "vi", Referer: target },
      signal: c.signal,
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { data?: { price?: number; price_min?: number } };
    const d = j && j.data;
    if (!d) return null;
    const raw = typeof d.price === "number" && d.price > 0 ? d.price : (typeof d.price_min === "number" ? d.price_min : null);
    if (raw == null) return null;
    const asVnd = Math.round(raw / 100000); // Shopee returns price × 100000
    if (asVnd >= 1000) return asVnd;
    return raw >= 1000 ? Math.round(raw) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Affiliate product-API lookup. Reliable but requires Henry's approved keys.
// Wired + env-gated now; the signed request body is filled in once the Shopee
// Affiliate Open API credentials exist and we can test against the live endpoint.
// Until then this is a safe no-op (returns null → falls through to public reads).
async function affiliatePrice(_target: string, env: Env): Promise<number | null> {
  if (!env.SHOPEE_AFFILIATE_APP_ID || !env.SHOPEE_AFFILIATE_SECRET) return null;
  // TODO(price-api-plan): implement Shopee Affiliate GraphQL productOfferV2 query,
  // signed with SHA256(appId+timestamp+payload+secret). See
  // Outbox/MeoSanSales-Price-API-Plan-2026-06-30.md.
  return null;
}

async function readPrice(target: string, env: Env): Promise<{ price: number | null; title: string | null; source: string | null }> {
  const aff = await affiliatePrice(target, env);
  if (aff) return { price: aff, title: null, source: "affiliate" };

  const host = new URL(target).hostname.replace(/^www\./, "").toLowerCase();

  if (host.endsWith("shopee.vn")) {
    const p = await shopeeApiPrice(target);
    if (p) return { price: p, title: null, source: "shopee-api" };
  }

  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 8000);
  let res: Response;
  try {
    res = await fetch(target, {
      headers: { "User-Agent": UA, "Accept-Language": "vi,en;q=0.8", Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: c.signal,
    });
  } finally {
    clearTimeout(t);
  }
  if (!res.ok) return { price: null, title: null, source: "http " + res.status };
  const ct = res.headers.get("content-type") || "";
  if (!/html|text|xml/i.test(ct)) return { price: null, title: null, source: "non-html" };

  const html = (await res.text()).slice(0, 2_000_000);
  const metas = extractMetas(html);
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = metas["og:title"] || (titleMatch ? titleMatch[1].trim() : null);

  for (const k of ["product:price:amount", "og:price:amount", "price", "twitter:data1"]) {
    const v = toVnd(metas[k]); if (v) return { price: v, title, source: "meta:" + k };
  }
  for (const block of extractJsonLd(html)) {
    try { const p = priceFromJsonLd(JSON.parse(block)); if (p) return { price: p, title, source: "json-ld" }; }
    catch { /* malformed block — skip */ }
  }
  const g = genericPrice(html);
  if (g) return { price: g.v, title, source: "html:" + g.k };

  const blob = [metas["og:title"], metas["og:description"], metas["twitter:description"], metas["description"], title]
    .filter(Boolean).join("  ");
  const tp = priceFromText(blob);
  if (tp) return { price: tp, title, source: "text" };

  return { price: null, title, source: "not-found" };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300" },
  });
}

async function handlePrice(request: Request, env: Env): Promise<Response> {
  const u = new URL(request.url);
  const target = u.searchParams.get("url");
  if (!target) return json({ error: "missing url" }, 400);
  let parsed: URL;
  try { parsed = new URL(target); } catch { return json({ error: "bad url" }, 400); }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return json({ error: "bad protocol" }, 400);
  if (!hostAllowed(parsed.hostname)) return json({ price: null, currency: "VND", title: null, source: "host-not-allowed" });

  try {
    const { price, title, source } = await readPrice(parsed.toString(), env);
    return json({ price, currency: "VND", title, source });
  } catch {
    return json({ price: null, currency: "VND", title: null, source: "fetch-failed" });
  }
}

// -----------------------------------------------------------------------------
// GET /media/<file> — served from R2 so 1 GB of mp4s never has to go through git.
// Supports Range requests (phones and Metricool fetch video in byte ranges).
// ⚠️ A missing file returns a REAL 404. Before this, the SPA fallback served
// index.html for missing media, so a broken video link "loaded" as the home page.
// During the move to R2, a file still bundled in dist/media is served from there.
// -----------------------------------------------------------------------------
const MEDIA_TYPES: Record<string, string> = {
  mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp",
  mp3: "audio/mpeg", m4a: "audio/mp4", json: "application/json",
};

async function handleMedia(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
  }
  let key: string;
  try {
    key = decodeURIComponent(url.pathname.slice("/media/".length));
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!key || key.includes("..")) return new Response("Not found", { status: 404 });

  const obj = env.MEDIA ? await env.MEDIA.get(key, { range: request.headers, onlyIf: request.headers }) : null;

  if (obj === null) {
    // Not in R2 (or no binding yet) → try the bundled copy, but never let the
    // SPA fallback pass index.html off as a video.
    const asset = await env.ASSETS.fetch(request);
    const type = asset.headers.get("content-type") || "";
    if (asset.ok && !type.includes("text/html")) return asset;
    return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
  }

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("accept-ranges", "bytes");
  if (!headers.has("cache-control")) headers.set("cache-control", "public, max-age=86400");
  if (!headers.has("content-type")) {
    const ext = key.split(".").pop()?.toLowerCase() || "";
    headers.set("content-type", MEDIA_TYPES[ext] || "application/octet-stream");
  }

  if (!("body" in obj)) {
    // A precondition (If-None-Match / If-Match …) stopped the body.
    return new Response(null, { status: request.headers.has("if-none-match") ? 304 : 412, headers });
  }

  const body = (obj as R2ObjectBody).body;
  const r = obj.range;
  if (request.headers.has("range") && r) {
    let start: number, length: number;
    if (r.suffix !== undefined) {
      length = Math.min(r.suffix, obj.size);
      start = obj.size - length;
    } else {
      start = r.offset ?? 0;
      length = r.length ?? obj.size - start;
    }
    headers.set("content-range", `bytes ${start}-${start + length - 1}/${obj.size}`);
    headers.set("content-length", String(length));
    return new Response(request.method === "HEAD" ? null : body, { status: 206, headers });
  }
  headers.set("content-length", String(obj.size));
  return new Response(request.method === "HEAD" ? null : body, { status: 200, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/price") return handlePrice(request, env);
    if (url.pathname.startsWith("/media/")) return handleMedia(request, env, url);
    return env.ASSETS.fetch(request);
  },
};
