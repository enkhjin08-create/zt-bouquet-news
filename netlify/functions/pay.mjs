import { store, json, notify, qpayReady, qpayInvoice, qpayIsPaid } from "./_shared/lib.mjs";

// POST /api/pay/:id        — QPay нэхэмжлэх үүсгэнэ (байвал дахин ашиглана)
// GET  /api/pay/:id        — төлөгдсөн эсэхийг шалгана
// GET  /api/pay/:id/callback — QPay сервер дуудна
const metaPatch = async (s, order) => {
  const m = (await s.get(`meta/${order.id}`, { type: "json" })) || {};
  await s.setJSON(`meta/${order.id}`, { ...m, paid: order.payment?.status === "paid", total: order.price?.total || 0 });
};

async function check(s, order, site, context) {
  if (order.payment?.status === "paid") return true;
  if (!order.payment?.invoiceId || !qpayReady()) return false;
  const paid = await qpayIsPaid(order.payment.invoiceId);
  if (paid) {
    order.payment = { ...order.payment, status: "paid", paidAt: new Date().toISOString() };
    order.updatedAt = new Date().toISOString();
    await s.setJSON(`order/${order.id}`, order);
    await metaPatch(s, order);
    context.waitUntil(notify(order, site));
  }
  return paid;
}

export default async (req, context) => {
  const s = store();
  const { id, cb } = context.params || {};
  const site = new URL(req.url).origin;
  try {
    const order = id && (await s.get(`order/${id}`, { type: "json" }));
    if (!order) return json({ error: "Захиалга олдсонгүй." }, 404);

    if (req.method === "POST" && !cb) {
      if (order.payment?.status === "paid") return json({ paid: true });
      if (!qpayReady()) return json({ error: "Онлайн төлбөр одоогоор тохируулагдаагүй байна. Бид тантай утсаар холбогдоно." }, 503);
      const amount = order.price?.total || 0;
      if (amount <= 0) return json({ error: "Төлөх дүн тодорхойгүй байна." }, 400);
      let p = order.payment || {};
      if (!p.invoiceId || p.amount !== amount) {
        const inv = await qpayInvoice(order, amount, `${site}/api/pay/${order.id}/callback`);
        p = { status: "unpaid", invoiceId: inv.invoice_id, amount, qr: inv.qr_image, shortUrl: inv.qPay_shortUrl || "", urls: (inv.urls || []).map((u) => ({ name: u.name, description: u.description, logo: u.logo, link: u.link })) };
        order.payment = p;
        await s.setJSON(`order/${order.id}`, order);
      }
      return json({ paid: false, amount: p.amount, qr: p.qr, shortUrl: p.shortUrl, urls: p.urls });
    }

    if (req.method === "GET") {
      const paid = await check(s, order, site, context);
      return cb ? new Response("SUCCESS") : json({ paid });
    }
    return json({ error: "Not found" }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: e.message || "Алдаа гарлаа." }, 502);
  }
};

export const config = { path: ["/api/pay/:id", "/api/pay/:id/:cb"] };
