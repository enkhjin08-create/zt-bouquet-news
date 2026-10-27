import { createEditor, blankOrder, toast, money, loadCatalog, compress, pinMap } from "./app.js";
import { TEMPLATES } from "./render.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const STATUS = { new: "Шинэ", printed: "Хэвлэсэн", done: "Өгсөн" };

let pass = "";
try { pass = sessionStorage.getItem("bn-pass") || ""; } catch {}
let orders = [];
let filter = "all";
let current = null; // { id, status } эсвэл null (шинэ)
let dirty = false;
let ed = null;

async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { "content-type": "application/json", "x-admin-pass": pass, ...(opts.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { showLogin("Нууц үг буруу байна."); throw new Error("401"); }
  if (!res.ok) throw new Error(data.error || "Алдаа гарлаа.");
  return data;
}

function showLogin(msg) {
  $("#admin").hidden = true;
  $("#login").hidden = false;
  const e = $("#login-err");
  e.hidden = !msg;
  e.textContent = msg || "";
  $("#pass").focus();
}

$("#login").addEventListener("submit", async (e) => {
  e.preventDefault();
  pass = $("#pass").value;
  try { sessionStorage.setItem("bn-pass", pass); } catch {}
  await start();
});

async function start() {
  if (!pass) return showLogin();
  try { await refresh(); } catch (e) { if (e.message !== "401") showLogin(e.message); return; }
  $("#login").hidden = true;
  $("#admin").hidden = false;
  if (!ed) {
    ed = createEditor({ root: $("#editor"), mode: "admin", onChange: () => { dirty = true; } });
    newOrder();
    const want = decodeURIComponent(location.hash.slice(1));
    if (want && orders.some((o) => o.id === want)) openOrder(want);
  }
}

async function refresh() {
  const data = await api("/api/orders");
  orders = data.orders || [];
  drawList();
}

function drawList() {
  const list = orders.filter((o) => filter === "all" || o.status === filter);
  $("#olist").innerHTML = list.length
    ? list.map((o) => `
      <li><button type="button" data-id="${esc(o.id)}" aria-current="${current?.id === o.id}">
        <span class="r1"><span>№ ${esc(o.id)} · ${esc(o.contact?.name || o.name || "Нэргүй")}</span><span class="pill ${esc(o.status)}">${STATUS[o.status] || o.status}</span></span>
        ${o.total ? `<span class="r2"><span class="pill ${o.paid ? "paid" : o.payMethod === "bank" ? "bank" : "unpaid"}">${o.paid ? "Төлсөн" : o.payMethod === "bank" ? "Данс · шалгах" : "Төлөөгүй"}</span> ${money(o.total)}${o.delivery === "delivery" ? " · хүргэлт" : ""}</span>` : ""}
        <span class="r2">${esc(TEMPLATES[o.template]?.label || "")} · ${esc(o.contact?.phone || "")}${o.contact?.pickup ? ` · авах ${esc(o.contact.pickup)}` : ""}</span>
      </button></li>`).join("")
    : `<li class="empty">${filter === "all" ? "Одоогоор захиалга алга. Захиалагчид нүүр хуудасны холбоосоор бөглөнө." : "Энэ төлөвтэй захиалга алга."}</li>`;
}

$("#filters").addEventListener("click", (e) => {
  const b = e.target.closest(".chip");
  if (!b) return;
  filter = b.dataset.f;
  document.querySelectorAll("#filters .chip").forEach((c) => c.setAttribute("aria-pressed", c === b));
  drawList();
});

async function openOrder(oid) {
  try {
    const o = await api(`/api/orders/${encodeURIComponent(oid)}`);
    current = { id: o.id, status: o.status, createdAt: o.createdAt, source: o.source, payment: o.payment, price: o.price };
    showEditor();
    ed.load(o);
    dirty = false;
    setMeta();
    drawList();
    window.scrollTo({ top: 0 });
  } catch (err) { if (err.message !== "401") toast(err.message, "err"); }
}
$("#olist").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-id]");
  if (!b) return;
  if (dirty && !guard("Хадгалаагүй өөрчлөлт байна. Дахин дарвал хаягдана.", b)) return;
  openOrder(b.dataset.id);
});

// Хоёр дарж баталгаажуулах
const armed = new WeakMap();
function guard(msg, el) {
  if (armed.get(el)) { armed.delete(el); return true; }
  armed.set(el, true);
  toast(msg, "err");
  setTimeout(() => armed.delete(el), 4000);
  return false;
}

function showEditor() { $("#cat").hidden = true; $("#editor").hidden = false; document.querySelector(".toolbar").hidden = false; }
function newOrder() {
  showEditor();
  current = null;
  ed.load({ ...blankOrder() });
  dirty = false;
  setMeta();
  drawList();
}
$("#new").addEventListener("click", (e) => {
  if (dirty && !guard("Хадгалаагүй өөрчлөлт байна. Дахин дарвал хаягдана.", e.currentTarget)) return;
  newOrder();
});

function setMeta() {
  const bar = $("#pay-bar");
  bar.hidden = !current;
  if (current) {
    const p = current.price || ed.price();
    $("#pay-total").textContent = money(p.total);
    const paid = current.payment?.status === "paid";
    $("#pay-info").textContent = paid ? `Төлсөн${current.payment.manual ? (current.payment.method === "bank" ? " · дансаар" : " (гараар тэмдэглэсэн)") : " · QPay"}${current.payment.paidAt ? " · " + new Date(current.payment.paidAt).toLocaleString("mn-MN") : ""}` : current.payment?.method === "bank" ? "Дансаар шилжүүлнэ — дансаа шалгаад «төлсөн» гэж тэмдэглэ" : "Төлөөгүй";
    $("#mark-paid").hidden = paid;
  }
  $("#cur-id").textContent = current ? `№ ${current.id}` : "Шинэ захиалга";
  $("#cur-info").textContent = current
    ? `${current.source === "admin" ? "Дотроос үүсгэсэн" : "Захиалагч бөглөсөн"} · ${new Date(current.createdAt).toLocaleString("mn-MN")}`
    : "Хадгалаагүй";
  $("#status").value = current?.status || "new";
  $("#del").hidden = !current;
}

async function save(statusOverride) {
  const o = ed.get();
  const status = statusOverride || $("#status").value;
  const btn = $("#save");
  btn.disabled = true;
  try {
    if (!current) {
      const body = { ...o, contact: { ...o.contact, phone: o.contact.phone || "—" } };
      const { id } = await api("/api/orders", { method: "POST", body: JSON.stringify(body) });
      current = { id, status: "new", createdAt: new Date().toISOString(), source: "admin" };
      if (status !== "new") await api(`/api/orders/${id}`, { method: "PUT", body: JSON.stringify({ ...body, status }) });
      current.status = status;
      ed.load({ ...ed.get(), id });
    } else {
      await api(`/api/orders/${current.id}`, { method: "PUT", body: JSON.stringify({ ...o, status }) });
      current.status = status;
    }
    dirty = false;
    setMeta();
    await refresh();
    toast("Хадгаллаа");
    return true;
  } catch (e) {
    if (e.message !== "401") toast(e.message, "err");
    return false;
  } finally {
    btn.disabled = false;
  }
}

$("#save").addEventListener("click", () => save());
$("#status").addEventListener("change", () => { if (current) save(); });
$("#print").addEventListener("click", async () => {
  if (current && current.status === "new") await save("printed");
  else if (dirty) await save();
  ed.printSheet();
});
$("#del").addEventListener("click", async (e) => {
  if (!current) return;
  if (!guard(`№ ${current.id} захиалгыг устгах уу? Дахин дарна уу.`, e.currentTarget)) return;
  try {
    await api(`/api/orders/${current.id}`, { method: "DELETE" });
    toast("Устгалаа");
    await refresh();
    newOrder();
  } catch (err) { if (err.message !== "401") toast(err.message, "err"); }
});

window.addEventListener("beforeunload", (e) => { if (dirty) e.preventDefault(); });
start();

$("#mark-paid").addEventListener("click", async (e) => {
  if (!current) return;
  if (!guard("Төлбөрийг төлсөн гэж тэмдэглэх үү? Дахин дарна уу.", e.currentTarget)) return;
  try {
    await api(`/api/orders/${current.id}`, { method: "PUT", body: JSON.stringify({ ...ed.get(), status: $("#status").value, markPaid: true }) });
    const o = await api(`/api/orders/${current.id}`);
    current.payment = o.payment; current.price = o.price;
    dirty = false; setMeta(); await refresh(); toast("Төлсөн гэж тэмдэглэлээ");
  } catch (err) { if (err.message !== "401") toast(err.message, "err"); }
});

// ── Үнэ, цэцгийн жагсаалт ──
let catDraft = null;
const catRow = (p, i, kind) => kind === "packages" ? `
  <div class="cat-row" data-kind="packages" data-i="${i}">
    <label class="cat-img" title="Зураг оруулах">${p.img ? `<img src="/api/cimg/${esc(p.img)}" alt="">` : "<span>+ Зураг</span>"}<input type="file" accept="image/*" data-img="${i}" hidden></label>
    <input data-f="name" value="${esc(p.name)}" placeholder="Нэр" aria-label="Нэр">
    <input data-f="desc" value="${esc(p.desc)}" placeholder="Тайлбар" aria-label="Тайлбар">
    <input data-f="price" type="number" min="0" step="1000" value="${p.price}" aria-label="Үнэ">
    <label><input type="checkbox" data-f="active" ${p.active ? "checked" : ""}> Идэвхтэй</label>
    <button type="button" class="link" data-del="${i}">Хасах</button>
  </div>` : `
  <div class="cat-row fl-row" data-kind="flowers" data-i="${i}">
    <label class="cat-img" title="Зураг оруулах">${p.img ? `<img src="/api/cimg/${esc(p.img)}" alt="">` : "<span>+ Зураг</span>"}<input type="file" accept="image/*" data-img="${i}" hidden></label>
    <input data-f="name" value="${esc(p.name)}" placeholder="Цэцгийн нэр" aria-label="Нэр">
    <input data-f="price" type="number" min="0" step="500" value="${p.price}" aria-label="Нэг ширхэгийн үнэ">
    <label><input type="checkbox" data-f="active" ${p.active ? "checked" : ""}> Идэвхтэй</label>
    <button type="button" class="link" data-del="${i}">Хасах</button>
  </div>`;
function drawCat() {
  const c = catDraft;
  $("#cat").innerHTML = `
    <div class="toolbar"><div class="meta"><b>Үнэ, цэцгийн жагсаалт</b><span>Захиалагчийн хуудсанд шууд харагдана</span></div>
      <button class="btn" type="button" id="cat-save">Хадгалах</button><button class="btn secondary" type="button" id="cat-close">Хаах</button></div>
    <div class="row2">
      <div class="field"><label for="cat-news">Сонины үнэ</label><input id="cat-news" type="number" min="0" step="1000" value="${c.newsPrice}"></div>
      <div class="field"><label for="cat-simple">Энгийн мэндчилгээний үнэ</label><input id="cat-simple" type="number" min="0" step="1000" value="${c.simplePrice ?? 15000}"></div>
    </div>
    <h3>Хүргэлт (UBCab)</h3>
    <p class="help">Хүргэлтийн үнэ = суурь төлбөр + км тутмын үнэ × замын зай (500₮-өөр дээш тоймлоно). Суурь: дуудлага 4,900 + систем 250 + даатгал 1,000 + орж авах 1,000 + оруулж өгөх 1,000 + ачаа 5,000.</p>
    <div class="row2">
      <div class="field"><label for="cat-dbase">Суурь төлбөр</label><input id="cat-dbase" type="number" min="0" step="50" value="${c.deliveryBase ?? 13150}"></div>
      <div class="field"><label for="cat-dkm">1 км-ийн үнэ</label><input id="cat-dkm" type="number" min="0" step="100" value="${c.deliveryPerKm ?? 2000}"></div>
      <div class="field"><label for="cat-del">Байршил тогтоогоогүй үеийн тогтмол үнэ</label><input id="cat-del" type="number" min="0" step="1000" value="${c.deliveryFee}"></div>
    </div>
    <div class="field"><label>Салбарын байршил (хүргэлт эндээс гарна)</label>
      <div class="dl-map" id="cat-map"></div>
      <p class="help" id="cat-shop">${c.shopLat ? `Тэмдэглэсэн: ${c.shopLat}, ${c.shopLng}` : "⚠️ Байршил тэмдэглээгүй — газрын зураг дээр салбараа дарж тэмдэглээд Хадгалах дарна уу. Тэр хүртэл тогтмол үнээр бодогдоно."}</p></div>
    <div class="field"><label for="cat-pick">Очиж авах газар</label><input id="cat-pick" maxlength="80" value="${esc(c.pickupNote)}"></div>
    <div class="row2">
      <div class="field"><label for="cat-bank">Банк</label><input id="cat-bank" maxlength="60" value="${esc(c.bankName || "")}"></div>
      <div class="field"><label for="cat-acc">Дансны дугаар</label><input id="cat-acc" maxlength="40" value="${esc(c.bankAccount || "")}"></div>
    </div>
    <div class="field"><label for="cat-holder">Данс эзэмшигч</label><input id="cat-holder" maxlength="60" value="${esc(c.bankHolder || "")}"></div>
    <h3>Бэлэн баглаа</h3>
    <div class="cat-list" data-list="packages">${c.packages.map((p, i) => catRow(p, i, "packages")).join("")}</div>
    <button type="button" class="ghost-btn" data-add="packages">+ Баглаа нэмэх</button>
    <h3>Ширхэгээр сонгох цэцэг</h3>
    <div class="cat-list" data-list="flowers">${c.flowers.map((p, i) => catRow(p, i, "flowers")).join("")}</div>
    <button type="button" class="ghost-btn" data-add="flowers">+ Цэцэг нэмэх</button>`;
  catMap?.map.remove(); catMap = null;
  pinMap($("#cat-map"), { lat: c.shopLat, lng: c.shopLng, onPick: (ll) => {
    catDraft.shopLat = Math.round(ll.lat * 1e6) / 1e6; catDraft.shopLng = Math.round(ll.lng * 1e6) / 1e6;
    $("#cat-shop").textContent = `Тэмдэглэсэн: ${catDraft.shopLat}, ${catDraft.shopLng} — Хадгалах дарна уу`;
  } }).then((m) => { catMap = m; }).catch(() => {});
}
let catMap = null;
function readCat() {
  const c = catDraft;
  c.newsPrice = +$("#cat-news").value || 0; c.simplePrice = +$("#cat-simple").value || 0; c.deliveryFee = +$("#cat-del").value || 0; c.deliveryBase = +$("#cat-dbase").value || 0; c.deliveryPerKm = +$("#cat-dkm").value || 0; c.pickupNote = $("#cat-pick").value; c.bankName = $("#cat-bank").value; c.bankAccount = $("#cat-acc").value; c.bankHolder = $("#cat-holder").value;
  document.querySelectorAll("#cat .cat-row").forEach((row) => {
    const it = c[row.dataset.kind][+row.dataset.i];
    row.querySelectorAll("[data-f]").forEach((inp) => { it[inp.dataset.f] = inp.type === "checkbox" ? inp.checked : inp.type === "number" ? +inp.value || 0 : inp.value; });
  });
}
$("#cat-open").addEventListener("click", async () => {
  catDraft = structuredClone(await loadCatalog(true));
  delete catDraft.qpay;
  $("#editor").hidden = true; document.querySelector(".toolbar").hidden = true; $("#pay-bar").hidden = true;
  $("#cat").hidden = false; drawCat();
});
$("#cat").addEventListener("click", async (e) => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.add) { readCat(); catDraft[b.dataset.add].push(b.dataset.add === "packages" ? { id: "", name: "", desc: "", price: 0, active: true } : { id: "", name: "", price: 0, active: true }); drawCat(); return; }
  if (b.dataset.del != null) { readCat(); catDraft[b.closest(".cat-row").dataset.kind].splice(+b.dataset.del, 1); drawCat(); return; }
  if (b.id === "cat-close") { showEditor(); setMeta(); return; }
  if (b.id === "cat-save") {
    readCat();
    try { catDraft = await api("/api/catalog", { method: "PUT", body: JSON.stringify(catDraft) }); drawCat(); await loadCatalog(true); ed.reloadCatalog(); toast("Хадгаллаа"); }
    catch (err) { if (err.message !== "401") toast(err.message, "err"); }
  }
});

$("#cat").addEventListener("change", async (e) => {
  const inp = e.target.closest("input[data-img]");
  if (!inp || !inp.files?.[0]) return;
  readCat();
  const row = inp.closest(".cat-row");
  const item = catDraft[row.dataset.kind][+row.dataset.i];
  row.classList.add("busy");
  try {
    const src = await compress(inp.files[0], 700, 0.82);
    const { key } = await api("/api/catalog/img", { method: "POST", body: JSON.stringify({ src }) });
    item.img = key;
    drawCat();
    toast("Зураг нэмэгдлээ. Хадгалах дарна уу.");
  } catch (err) { if (err.message !== "401") toast(err.message, "err"); row.classList.remove("busy"); }
});
