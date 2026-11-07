// Админ апп-ын service worker — суулгах боломжтой болгоно. Мэдээллийг кэшлэхгүй (үргэлж шинэ),
// интернэтгүй үед л энгийн мэдэгдэл харуулна.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui;background:#f5f0ea;color:#2a1c1f;display:grid;place-items:center;height:100vh;margin:0;text-align:center"><div><h2>Интернэт холболт алга</h2><p>Холболтоо шалгаад дахин нээнэ үү.</p></div>',
    { headers: { "content-type": "text/html; charset=utf-8" } })));
});
