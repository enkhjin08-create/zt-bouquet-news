import { getStore } from "@netlify/blobs";

// Захиалгын API
//   POST   /api/orders        — захиалагч шинэ захиалга илгээнэ (нийтэд нээлттэй)
//   GET    /api/orders        — админ: жагсаалт
//   GET    /api/orders/:id    — админ: бүтэн захиалга
//   PUT    /api/orders/:id    — админ: засах / төлөв солих
//   DELETE /api/orders/:id    — админ: устгах
// Админ нь "x-admin-pass" толгойгоор ADMIN_PASS орчны хувьсагчтай тулгагдана.

const MAX_BODY = 5_900_000;
const MAX_PHOTOS = 6;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const store = () => getStore({ name: "bouquet-orders", consistency: "strong" });

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const newId = () => {
  let s = "";
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return s;
};

const isAdmin = (req) => {
  const pass = Netlify.env.get("ADMIN_PASS");
  return Boolean(pass) && req.headers.get("x-admin-pass") === pass;
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
    }
  }
  return out;
};

const TPL_LABEL = { film: "Кино хальс", scrap: "Скрапбүүк", letter: "Захидал сонин", news: "Хар цагаан сонин", polaroid: "Ягаан polaroid", booth: "Фото бүхээг" };
const h = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Шинэ захиалгын мэдэгдэл (Resend). RESEND_API_KEY байхгүй бол алгасна.
async function notify(order, site) {
  const key = Netlify.env.get("RESEND_API_KEY");
  if (!key) return;
  const to = (Netlify.env.get("NOTIFY_EMAIL") || "info.zuvhuntuund@gmail.com").split(",").map((x) => x.trim()).filter(Boolean);
  const from = Netlify.env.get("RESEND_FROM") || "Зөвхөн түүнд <orders@zuvhuntuund.com>";
  const c = order.contact || {};
  const link = `${site}/admin.html#${order.id}`;
  const rows = [
    ["Загвар", TPL_LABEL[order.template] || order.template],
    ["Захиалагч", c.name || "—"],
    ["Утас", c.phone || "—"],
    ["Авах өдөр", c.pickup || "—"],
    ["Хэнд", order.name || order.to || "—"],
    ["Зураг", `${(order.photos || []).filter((p) => p && p.src).length} ширхэг`],
    ["Нэмэлт хүсэлт", c.note || "—"],
  ];
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;color:#2a1c1f">
    <p style="font-size:13px;letter-spacing:.12em;color:#7a2e3d;margin:0">ЗӨВХӨН ТҮҮНД · СОНИН БАГЛАА</p>
    <h2 style="margin:6px 0 14px">Шинэ захиалга № ${h(order.id)}</h2>
    <table style="border-collapse:collapse;width:100%;font-size:14px">${rows.map(([k, v]) => `<tr><td style="padding:6px 10px 6px 0;color:#7d6a6c;vertical-align:top;white-space:nowrap">${h(k)}</td><td style="padding:6px 0;white-space:pre-line">${h(v)}</td></tr>`).join("")}</table>
    <p style="margin:18px 0"><a href="${h(link)}" style="background:#7a2e3d;color:#fff;padding:11px 18px;border-radius:6px;text-decoration:none;font-weight:bold">Админ дээр нээх</a></p>
  </div>`;
  const text = `Шинэ захиалга № ${order.id}\n` + rows.map(([k, v]) => `${k}: ${v}`).join("\n") + `\n\n${link}`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to, subject: `Шинэ захиалга № ${order.id} · ${c.name || c.phone || ""}`.trim(), html, text }),
    });
    if (!res.ok) console.error("Resend:", res.status, await res.text());
  } catch (e) {
    console.error("Resend:", e);
  }
}

const clean = (body) => {
  const photos = Array.isArray(body.photos) ? body.photos.slice(0, MAX_PHOTOS) : [];
  for (const p of photos) {
    if (p && p.src && !/^data:image\/(jpeg|png|webp);base64,/.test(p.src)) {
      throw new Error("Зургийн формат буруу байна.");
    }
  }
  const str = (v, n = 4000) => (typeof v === "string" ? v.slice(0, n) : "");
  return {
    template: ["letter", "news", "polaroid", "booth", "scrap", "film"].includes(body.template) ? body.template : "news",
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

      const now = new Date().toISOString();
      let orderId = "";
      for (let i = 0; i < 5; i++) {
        const candidate = newId();
        if (await s.getMetadata(`order/${candidate}`)) continue;
        await s.setJSON(`order/${candidate}`, { ...body, id: candidate, status: "new", source: isAdmin(req) ? "admin" : "customer", createdAt: now, updatedAt: now });
        orderId = candidate;
        break;
      }
      if (!orderId) return json({ error: "Захиалга хадгалж чадсангүй. Дахин оролдоно уу." }, 500);
      const order = await s.get(`order/${orderId}`, { type: "json" });
      await s.setJSON(`meta/${orderId}`, metaOf(order));
      if (!isAdmin(req)) context.waitUntil(notify(order, new URL(req.url).origin));
      return json({ id: orderId }, 201);
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
      const order = { ...prev, ...body, status, id, updatedAt: new Date().toISOString() };
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
