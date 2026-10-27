import { getStore } from "@netlify/blobs";

export const store = () => getStore({ name: "bouquet-orders", consistency: "strong" });

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });

export const isAdmin = (req) => {
  const pass = Netlify.env.get("ADMIN_PASS");
  return Boolean(pass) && req.headers.get("x-admin-pass") === pass;
};

export const money = (n) => `${Math.round(n || 0).toLocaleString("en-US")}₮`;

// ── Үнэ, цэцгийн жагсаалт (админ засна) ──
export const DEFAULT_CATALOG = {
  newsPrice: 20000,
  deliveryFee: 10000,
  pickupNote: "Орчлон салбар",
  packages: [
    { id: "s", name: "Жижиг баглаа", desc: "5–7 ширхэг улирлын цэцэг", price: 35000, active: true },
    { id: "m", name: "Дунд баглаа", desc: "9–11 ширхэг, 2 төрлийн цэцэг", price: 55000, active: true },
    { id: "l", name: "Том баглаа", desc: "15+ ширхэг, 3 төрлийн цэцэг", price: 85000, active: true },
  ],
  flowers: [
    { id: "lis", name: "Лизиантус", price: 7000, active: true },
    { id: "rose", name: "Сарнай", price: 6000, active: true },
    { id: "spray", name: "Бутан сарнай", price: 8000, active: true },
    { id: "chrys", name: "Хризантем", price: 5000, active: true },
    { id: "gyp", name: "Гипсофил", price: 6000, active: true },
  ],
};
const intIn = (v, lo, hi, d) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, Math.round(+v))) : d);
const str = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");
const slug = (v, i) => (typeof v === "string" && /^[a-z0-9_-]{1,24}$/.test(v) ? v : `x${Date.now().toString(36)}${i}`);
export function cleanCatalog(c) {
  const d = DEFAULT_CATALOG;
  return {
    newsPrice: intIn(c?.newsPrice, 0, 10_000_000, d.newsPrice),
    deliveryFee: intIn(c?.deliveryFee, 0, 10_000_000, d.deliveryFee),
    pickupNote: str(c?.pickupNote, 80) || d.pickupNote,
    packages: (Array.isArray(c?.packages) ? c.packages : []).slice(0, 20).map((p, i) => ({ id: slug(p?.id, i), name: str(p?.name, 60), desc: str(p?.desc, 120), price: intIn(p?.price, 0, 10_000_000, 0), active: p?.active !== false })).filter((p) => p.name),
    flowers: (Array.isArray(c?.flowers) ? c.flowers : []).slice(0, 60).map((p, i) => ({ id: slug(p?.id, i), name: str(p?.name, 60), price: intIn(p?.price, 0, 10_000_000, 0), active: p?.active !== false })).filter((p) => p.name),
  };
}
export async function getCatalog(s = store()) {
  const c = await s.get("settings/catalog", { type: "json" });
  return c ? cleanCatalog(c) : DEFAULT_CATALOG;
}

// Захиалгын цэцэг, хүргэлтийг цэвэрлээд үнийг серверт тооцно
export function cleanFlowers(f) {
  const mode = f?.mode === "custom" ? "custom" : "package";
  return {
    mode,
    packageId: typeof f?.packageId === "string" ? f.packageId.slice(0, 24) : "",
    items: (Array.isArray(f?.items) ? f.items : []).slice(0, 60).map((x) => ({ id: String(x?.id || "").slice(0, 24), qty: intIn(x?.qty, 0, 200, 0) })).filter((x) => x.id && x.qty > 0),
  };
}
export function cleanDelivery(d) {
  return { type: d?.type === "delivery" ? "delivery" : "pickup", address: str(d?.address, 400) };
}
export function priceOf(order, cat) {
  const lines = [{ label: "Сонин (A3 хэвлэл)", amount: cat.newsPrice }];
  const f = order.flowers || {};
  if (f.mode === "custom") {
    for (const it of f.items || []) {
      const fl = cat.flowers.find((x) => x.id === it.id);
      if (fl) lines.push({ label: `${fl.name} × ${it.qty}`, amount: fl.price * it.qty });
    }
  } else {
    const p = cat.packages.find((x) => x.id === f.packageId);
    if (p) lines.push({ label: p.name, amount: p.price });
  }
  if (order.delivery?.type === "delivery") lines.push({ label: "Хүргэлт", amount: cat.deliveryFee });
  return { lines, total: lines.reduce((a, l) => a + l.amount, 0) };
}

const TPL_LABEL = { party: "Улаан үдэшлэг", missed: "Хальсан захидал", sport: "Спорт", film: "Кино хальс", scrap: "Скрапбүүк", letter: "Захидал сонин", news: "Хар цагаан сонин", polaroid: "Ягаан polaroid", booth: "Фото бүхээг" };
const h = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Шинэ захиалгын мэдэгдэл (Resend). RESEND_API_KEY байхгүй бол алгасна.
export async function notify(order, site) {
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
    ...(order.price ? [["Цэцэг", order.price.lines.slice(1).map((l) => `${l.label}: ${money(l.amount)}`).join("\n") || "—"], ["Хүргэлт", order.delivery?.type === "delivery" ? order.delivery.address || "Хүргэлт" : "Очиж авна"], ["Нийт", money(order.price.total)], ["Төлбөр", order.payment?.status === "paid" ? "QPay-ээр төлсөн ✓" : "Төлөөгүй"]] : []),
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


// ── QPay (merchant v2) ──
const QPAY = "https://merchant.qpay.mn/v2";
export const qpayReady = () => Boolean(Netlify.env.get("QPAY_USERNAME") && Netlify.env.get("QPAY_PASSWORD") && Netlify.env.get("QPAY_INVOICE_CODE"));
async function qpayToken() {
  const basic = btoa(`${Netlify.env.get("QPAY_USERNAME")}:${Netlify.env.get("QPAY_PASSWORD")}`);
  const res = await fetch(`${QPAY}/auth/token`, { method: "POST", headers: { authorization: `Basic ${basic}` } });
  if (!res.ok) throw new Error(`QPay нэвтрэлт амжилтгүй (${res.status})`);
  return (await res.json()).access_token;
}
export async function qpayInvoice(order, amount, callbackUrl) {
  const token = await qpayToken();
  const res = await fetch(`${QPAY}/invoice`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      invoice_code: Netlify.env.get("QPAY_INVOICE_CODE"),
      sender_invoice_no: `SB-${order.id}-${Date.now().toString(36)}`,
      invoice_receiver_code: order.contact?.phone || "terminal",
      invoice_description: `Сонин баглаа № ${order.id}`,
      amount,
      callback_url: callbackUrl,
    }),
  });
  if (!res.ok) throw new Error(`QPay нэхэмжлэх үүсгэж чадсангүй (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return res.json();
}
export async function qpayIsPaid(invoiceId) {
  const token = await qpayToken();
  const res = await fetch(`${QPAY}/payment/check`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ object_type: "INVOICE", object_id: invoiceId, offset: { page_number: 1, page_limit: 100 } }),
  });
  if (!res.ok) throw new Error(`QPay шалгалт амжилтгүй (${res.status})`);
  const d = await res.json();
  return (d.rows || []).some((r) => r.payment_status === "PAID");
}
