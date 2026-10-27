import { store, json, isAdmin, getCatalog, cleanCatalog, qpayReady } from "./_shared/lib.mjs";

// GET /api/catalog — үнэ, цэцгийн жагсаалт (нийтэд)
// PUT /api/catalog — админ хадгална
export default async (req) => {
  const s = store();
  try {
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

export const config = { path: "/api/catalog" };
