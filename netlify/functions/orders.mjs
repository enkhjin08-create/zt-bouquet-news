import { store, json, isAdmin, getCatalog, cleanFlowers, cleanDelivery, priceOf, notify, qpayReady } from "./_shared/lib.mjs";

// Захиалгын API
//   POST /api/orders (нийтэд), GET/PUT/DELETE /api/orders[/:id] (админ, x-admin-pass)

const MAX_BODY = 5_900_000;
const MAX_PHOTOS = 6;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


const newId = () => {
  let s = "";
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return s;
};


const metaOf = (order) => ({
  id: order.id,
  template: order.template,
  name: order.name || "",
  date: order.date || "",
  status: order.status || "new",
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
  source: order.source || "customer",
  contact: {
    name: order.contact?.name || "",
    phone: order.contact?.phone || "",
    pickup: order.contact?.pickup || "",
  },
  photoCount: (order.photos || []).filter((p) => p && p.src).length,
  total: order.price?.total || 0,
  paid: order.payment?.status === "paid",
  delivery: order.delivery?.type || "pickup",
});

const num = (v, lo, hi, d) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const cleanTx = (tx) => {
  const out = {};
  if (!tx || typeof tx !== "object") return out;
  for (const [tpl, blocks] of Object.entries(tx).slice(0, 8)) {
    if (!/^[a-z]{1,12}$/.test(tpl) || !blocks || typeof blocks !== "object") continue;
    out[tpl] = {};
    for (const [k, v] of Object.entries(blocks).slice(0, 20)) {
      if (!/^[a-z0-9_]{1,16}$/.test(k) || !v || typeof v !== "object") continue;
      out[tpl][k] = { dx: num(v.dx, -400, 400, 0), dy: num(v.dy, -300, 300, 0), s: num(v.s, 0.3, 3, 1), r: num(v.r, -180, 180, 0) };
      if (typeof v.c === "string" && /^#[0-9a-f]{6}$/i.test(v.c)) out[tpl][k].c = v.c;
    }
  }
  return out;
};

const clean = (body) => {
  const photos = Array.isArray(body.photos) ? body.photos.slice(0, MAX_PHOTOS) : [];
  for (const p of photos) {
    if (p && p.src && !/^data:image\/(jpeg|png|webp);base64,/.test(p.src)) {
      throw new Error("Зургийн формат буруу байна.");
    }
  }
  const str = (v, n = 4000) => (typeof v === "string" ? v.slice(0, n) : "");
  return {
    template: ["letter", "news", "polaroid", "booth", "scrap", "film", "sport", "missed", "party"].includes(body.template) ? body.template : "news",
    name: str(body.name, 80),
    date: str(body.date, 20),
    masthead: str(body.masthead, 60),
    edition: str(body.edition, 60),
    headline: str(body.headline, 200),
    message: str(body.message, 2000),
    sign: str(body.sign, 20),
    to: str(body.to, 60),
    from: str(body.from, 60),
    note: str(body.note, 600),
    s1: str(body.s1, 20),
    s2: str(body.s2, 20),
    l1: str(body.l1, 30),
    l2: str(body.l2, 30),
    l3: str(body.l3, 30),
    tx: cleanTx(body.tx),
    qa: (Array.isArray(body.qa) ? body.qa : []).slice(0, 8).map((x) => ({ q: str(x?.q, 300), a: str(x?.a, 800) })),
    wishes: (Array.isArray(body.wishes) ? body.wishes : []).slice(0, 8).map((w) => str(w, 60)),
    photos: photos.map((p) => ({
      src: p?.src || "",
      caption: str(p?.caption, 160),
      x: Number.isFinite(p?.x) ? p.x : 50,
      y: Number.isFinite(p?.y) ? p.y : 50,
      z: Number.isFinite(p?.z) ? Math.min(3, Math.max(1, p.z)) : 1,
    })),
    flowers: cleanFlowers(body.flowers),
    delivery: cleanDelivery(body.delivery),
    contact: {
      name: str(body.contact?.name, 80),
      phone: str(body.contact?.phone, 40),
      pickup: str(body.contact?.pickup, 40),
      note: str(body.contact?.note, 1000),
    },
  };
};

export default async (req, context) => {
  const id = context.params?.id;
  const s = store();

  try {
    if (req.method === "POST" && !id) {
      const raw = await req.text();
      if (raw.length > MAX_BODY) return json({ error: "Зургууд хэт том байна. Цөөн зураг сонгоод дахин оролдоно уу." }, 413);
      const body = clean(JSON.parse(raw));
      if (!body.contact.phone) return json({ error: "Утасны дугаараа оруулна уу." }, 400);

      const cat = await getCatalog(s);
      body.price = priceOf(body, cat);
      if (body.delivery.type === "delivery" && !body.delivery.address.trim()) return json({ error: "Хүргэлтийн хаягаа бичнэ үү." }, 400);
      const now = new Date().toISOString();
      let orderId = "";
      for (let i = 0; i < 5; i++) {
        const candidate = newId();
        if (await s.getMetadata(`order/${candidate}`)) continue;
        await s.setJSON(`order/${candidate}`, { ...body, id: candidate, status: "new", source: isAdmin(req) ? "admin" : "customer", payment: { status: "unpaid" }, createdAt: now, updatedAt: now });
        orderId = candidate;
        break;
      }
      if (!orderId) return json({ error: "Захиалга хадгалж чадсангүй. Дахин оролдоно уу." }, 500);
      const order = await s.get(`order/${orderId}`, { type: "json" });
      await s.setJSON(`meta/${orderId}`, metaOf(order));
      // QPay тохируулаагүй бол шууд мэдэгдэнэ; тохируулсан бол төлөгдсөний дараа pay.mjs мэдэгдэнэ
      if (!isAdmin(req) && !qpayReady()) context.waitUntil(notify(order, new URL(req.url).origin));
      return json({ id: orderId, price: order.price, qpay: qpayReady() }, 201);
    }

    if (!isAdmin(req)) return json({ error: "Нууц үг буруу байна." }, 401);

    if (req.method === "GET" && !id) {
      // Жагсаалтад ороогүй (meta-гүй) захиалгыг сэргээнэ
      const [{ blobs: orderBlobs }, { blobs }] = await Promise.all([s.list({ prefix: "order/" }), s.list({ prefix: "meta/" })]);
      const known = new Set(blobs.map((b) => b.key.slice(5)));
      for (const b of orderBlobs) {
        const oid = b.key.slice(6);
        if (known.has(oid)) continue;
        const o = await s.get(b.key, { type: "json" });
        if (!o) continue;
        await s.setJSON(`meta/${oid}`, metaOf({ ...o, id: oid }));
        blobs.push({ key: `meta/${oid}` });
      }
      const metas = await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" })));
      const list = metas.filter(Boolean).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      return json({ orders: list });
    }

    if (req.method === "GET" && id) {
      const order = await s.get(`order/${id}`, { type: "json" });
      return order ? json(order) : json({ error: "Захиалга олдсонгүй." }, 404);
    }

    if (req.method === "PUT" && id) {
      const prev = await s.get(`order/${id}`, { type: "json" });
      if (!prev) return json({ error: "Захиалга олдсонгүй." }, 404);
      const raw = await req.text();
      if (raw.length > MAX_BODY) return json({ error: "Зургууд хэт том байна." }, 413);
      const parsed = JSON.parse(raw);
      const body = clean(parsed);
      const status = ["new", "printed", "done"].includes(parsed.status) ? parsed.status : prev.status;
      const cat = await getCatalog(s);
      const payment = parsed.markPaid === true ? { ...(prev.payment || {}), status: "paid", manual: true, paidAt: new Date().toISOString() } : prev.payment || { status: "unpaid" };
      const order = { ...prev, ...body, status, id, payment, updatedAt: new Date().toISOString() };
      if (payment.status !== "paid") order.price = priceOf(order, cat);
      await s.setJSON(`order/${id}`, order);
      await s.setJSON(`meta/${id}`, metaOf(order));
      return json({ ok: true, order: metaOf(order) });
    }

    if (req.method === "DELETE" && id) {
      await s.delete(`order/${id}`);
      await s.delete(`meta/${id}`);
      return json({ ok: true });
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    console.error(err);
    return json({ error: err.message || "Алдаа гарлаа." }, 400);
  }
};

export const config = {
  path: ["/api/orders", "/api/orders/:id"],
};
