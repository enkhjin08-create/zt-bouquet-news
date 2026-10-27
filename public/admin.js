import { createEditor, blankOrder, toast } from "./app.js";
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
        <span class="r1"><span>№ ${esc(o.id)} · ${esc(o.name || "Нэргүй")}</span><span class="pill ${esc(o.status)}">${STATUS[o.status] || o.status}</span></span>
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
    current = { id: o.id, status: o.status, createdAt: o.createdAt, source: o.source };
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

function newOrder() {
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
