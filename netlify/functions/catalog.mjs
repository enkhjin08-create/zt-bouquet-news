import { store, json, isAdmin, getCatalog, cleanCatalog, qpayReady, routeKm, deliveryFeeOf } from "./_shared/lib.mjs";

// GET /api/catalog — үнэ, цэцгийн жагсаалт (нийтэд)
// PUT /api/catalog — админ хадгална
export default async (req, context) => {
  const s = store();
  const url = new URL(req.url);
  try {
    // Цэцгийн зураг: GET /api/cimg/:key (нийтэд), POST /api/catalog/img (админ)
    if (url.pathname.startsWith("/api/cimg/")) {
      const key = context.params?.key || "";
      if (!/^[a-z0-9]{6,32}$/.test(key)) return new Response("Not found", { status: 404 });
      const r = await s.getWithMetadata(`cimg/${key}`, { type: "arrayBuffer" });
      if (!r) return new Response("Not found", { status: 404 });
      return new Response(r.data, { headers: { "content-type": r.metadata?.type || "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
    }
    if (url.pathname === "/api/catalog/img") {
      if (req.method !== "POST") return json({ error: "Not found" }, 404);
      if (!isAdmin(req)) return json({ error: "Нууц үг буруу байна." }, 401);
      const { src } = await req.json();
      const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(src || "");
      if (!m) return json({ error: "Зургийн формат буруу байна." }, 400);
      const bin = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
      if (bin.length > 1_500_000) return json({ error: "Зураг хэт том байна." }, 413);
      const key = Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 16);
      await s.set(`cimg/${key}`, bin, { metadata: { type: m[1] } });
      return json({ key });
    }
    // Хүргэлтийн үнийн тооцоо: GET /api/quote?lat=..&lng=..
    if (url.pathname === "/api/quote") {
      const cat = await getCatalog(s);
      const lat = +url.searchParams.get("lat"), lng = +url.searchParams.get("lng");
      if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && lat && lng)) return json({ error: "Байршил буруу байна." }, 400);
      const km = await routeKm(cat, lat, lng);
      if (km > 80) return json({ error: "Энэ хаяг хүргэлтийн бүсээс хэт хол байна." }, 400);
      return json({ km, fee: deliveryFeeOf(cat, km), configured: !!(cat.shopLat && cat.shopLng) });
    }
    if (req.method === "GET") return json({ ...(await getCatalog(s)), qpay: qpayReady() });
    if (req.method === "PUT") {
      if (!isAdmin(req)) return json({ error: "Нууц үг буруу байна." }, 401);
      const c = cleanCatalog(await req.json());
      await s.setJSON("settings/catalog", c);
      return json(c);
    }
    return json({ error: "Not found" }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: e.message || "Алдаа гарлаа." }, 400);
  }
};

export const config = { path: ["/api/catalog", "/api/catalog/img", "/api/cimg/:key", "/api/quote"] };
