import { TEMPLATES, SIGNS, MASTHEADS, CHEAP_TEMPLATES, renderSheet, fitAll } from "./render.js";

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const DEFAULT_QA = [
  "Түүнийг бодохоор хамгийн түрүүнд ямар хөгжилтэй зүйл санаанд ордог вэ?",
  "Түүний ямар занг хамгийн их хайрладаг вэ?",
  "Түүний хийсэн ямар зүйлийг чи дотроо бахархаж явдаг вэ?",
  "Ирээдүйд түүнд юуг хамгийн их хүсдэг вэ?",
  "Түүнтэй хамт заавал хийх юм гэж боддог зүйл бий юу?",
];

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ── Цэцэг, үнэ ──
let catalogPromise = null;
export const loadCatalog = (fresh = false) => {
  if (!catalogPromise || fresh) catalogPromise = fetch("/api/catalog", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
  return catalogPromise;
};
export const money = (n) => `${Math.round(n || 0).toLocaleString("en-US")}₮`;
export function priceOf(order, cat) {
  if (!cat) return { lines: [], total: 0 };
  const cheap = CHEAP_TEMPLATES.includes(order.template);
  const lines = [cheap ? { label: "Сонин (энгийн мэндчилгээ)", amount: cat.simplePrice ?? 15000 } : { label: "Сонин (A3 хэвлэл)", amount: cat.newsPrice }];
  const f = order.flowers || {};
  if (f.mode === "custom") {
    for (const it of f.items || []) {
      const fl = cat.flowers.find((x) => x.id === it.id);
      if (fl && it.qty > 0) lines.push({ label: `${fl.name} × ${it.qty}`, amount: fl.price * it.qty });
    }
  } else {
    const p = cat.packages.find((x) => x.id === f.packageId);
    if (p) lines.push({ label: p.name, amount: p.price });
  }
  if (order.delivery?.type === "delivery") lines.push({ label: "Хүргэлт", amount: cat.deliveryFee });
  return { lines, total: lines.reduce((a, l) => a + l.amount, 0) };
}

export const blankOrder = () => ({
  template: "news",
  name: "",
  date: today(),
  masthead: "BIRTHDAY TIMES",
  edition: "SPECIAL EDITION",
  headline: "",
  message: "",
  sign: "auto",
  qa: DEFAULT_QA.map((q) => ({ q, a: "" })),
  wishes: ["", "", "", "", ""],
  photos: [0, 1, 2, 3, 4, 5].map(() => ({ src: "", caption: "", x: 50, y: 50, z: 1 })),
  to: "",
  from: "",
  note: "",
  tx: {},
  contact: { name: "", phone: "", pickup: "", note: "" },
  flowers: { mode: "package", packageId: "", items: [] },
  delivery: { type: "pickup", address: "" },
});

// ── Зураг шахах: урт тал 1800px, JPEG ──
export async function compress(file, max = 1600, q = 0.82) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Энэ зургийг уншиж чадсангүй. JPG эсвэл PNG зураг сонгоно уу."));
      i.src = url;
    });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", q);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Цаасны ширхэг (сонин загварт)
function makeGrain() {
  const c = document.createElement("canvas");
  c.width = c.height = 400;
  const ctx = c.getContext("2d");
  const d = ctx.createImageData(400, 400);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = 120 + Math.random() * 60;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = Math.random() * 22;
  }
  ctx.putImageData(d, 0, 0);
  ctx.strokeStyle = "rgba(255,255,255,.18)";
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * 400, Math.random() * 400);
    for (let j = 0; j < 3; j++) ctx.lineTo(Math.random() * 400, Math.random() * 400);
    ctx.stroke();
  }
  return `url(${c.toDataURL("image/png")})`;
}

export function createEditor({ root, mode, onChange }) {
  let order = blankOrder();
  let selected = -1;
  const grain = makeGrain();

  root.innerHTML = `
    <section class="area-picker">
      <h2 class="step"><b>1</b>Загвараа сонгоно уу</h2>
      <div class="picker" role="radiogroup" id="picker">
        ${Object.entries(TEMPLATES).map(([k, t]) => `
          <label class="pick pick-${k}">
            <input type="radio" name="tpl" value="${k}" id="tpl-${k}">
            <span class="swatch" aria-hidden="true"><i></i><i></i></span>
            <span class="pick-name">${t.label}</span>${t.cheap ? `<span class="pick-badge">Хямд</span>` : ""}
          </label>`).join("")}
      </div>
    </section>
    <section class="area-preview">
      <div class="preview-card">
        <div class="stage" id="stage"><div class="sheet" id="sheet"></div></div>
        <div class="textbar" id="textbar" hidden>
          <span class="tb-name" id="tb-name">Текст</span>
          <span class="seg" id="tb-mode" hidden>
            <button type="button" data-mode="img" aria-pressed="true">Зургийг хөдөлгөх</button>
            <button type="button" data-mode="frame" aria-pressed="false">Хүрээг зөөх</button>
          </span>
          <button type="button" class="tb-btn" data-tbact="dec" aria-label="Жижигрүүлэх" id="tb-dec">A−</button>
          <span class="tb-val" id="tb-val">100%</span>
          <button type="button" class="tb-btn" data-tbact="inc" aria-label="Томруулах" id="tb-inc">A+</button>
          <span class="tb-colors" id="tb-colors">
            ${["#1d1b19", "#ffffff", "#c8102e", "#e0457b", "#7a2e3d", "#b8860b", "#2f5d8a", "#3f7a2a"].map((c) => `<button type="button" class="sw" data-color="${c}" style="--c:${c}" aria-label="Өнгө ${c}"></button>`).join("")}
            <label class="sw sw-pick" aria-label="Өөр өнгө"><input type="color" id="tb-color" value="#1d1b19"></label>
            <button type="button" class="link" data-color="">Анхны өнгө</button>
          </span>
          <button type="button" class="tb-btn" data-tbact="rl" aria-label="Зүүн тийш эргүүлэх" id="tb-rl" hidden>↺</button>
          <button type="button" class="tb-btn" data-tbact="rr" aria-label="Баруун тийш эргүүлэх" id="tb-rr" hidden>↻</button>
          <button type="button" class="link" data-tbact="reset">Анхны байрлал</button>
          <button type="button" class="link" data-tbact="close">Болсон</button>
        </div>
        <p class="hint">A3 хэмжээ · Зураг эсвэл текст дээр дарж байрлал, хэмжээг нь өөрчилнө. Загвар дээрх үг бол жишээ — өөрийн үгээ бичихэд солигдоно, бичээгүй бол хэвлэхэд гарахгүй.</p>
      </div>
    </section>
    <section class="area-form" id="form"></section>`;

  const sheet = $("#sheet", root);
  const stage = $("#stage", root);
  const form = $("#form", root);
  sheet.style.setProperty("--grain", grain);

  // ── Урьдчилан харах масштаб ──
  const rescale = () => {
    const w = stage.clientWidth;
    const sw = sheet.offsetWidth;
    if (!sw) return;
    const k = w / sw;
    sheet.style.transform = `scale(${k})`;
    stage.style.height = sheet.offsetHeight * k + "px";
    stage.dataset.k = k;
  };
  new ResizeObserver(rescale).observe(stage);

  let raf = 0;
  const render = (user = true) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      renderSheet(sheet, order);
      sheet.style.setProperty("--grain", grain);
      if (selected >= 0 && frameMode !== "frame") sheet.querySelector(`.ph[data-idx="${selected}"]`)?.classList.add("sel");
      markSel();
      rescale();
      if (user) onChange?.(order);
    });
  };
  document.fonts?.ready.then(() => fitAll(sheet));
  document.fonts?.addEventListener?.("loadingdone", () => fitAll(sheet));

  // ── Талбарын маягт ──
  const has = (f) => TEMPLATES[order.template].fields.includes(f);
  function buildForm() {
    const t = TEMPLATES[order.template];
    const slots = t.photos;
    form.innerHTML = `
      ${slots.length ? `<h2 class="step"><b>2</b>Зургаа оруулна уу</h2>` : ""}
      <div class="photos">
        ${slots.map((label, i) => {
          const p = order.photos[i];
          const capOk = has("captions") && i > 0;
          return `
          <div class="slot ${p.src ? "filled" : ""}" data-i="${i}">
            <label class="thumb" for="file-${i}" style="${p.src ? `background-image:url(${p.src})` : ""}">
              <span>${p.src ? "Солих" : "+ Зураг"}</span>
            </label>
            <input type="file" accept="image/*" id="file-${i}" data-file="${i}" hidden>
            <div class="slot-body">
              <p class="slot-label">${label}</p>
              ${capOk ? `<input type="text" id="cap-${i}" data-cap="${i}" maxlength="80" placeholder="Зургийн тайлбар" value="${esc(p.caption)}">` : ""}
              ${p.src ? `<div class="zoom"><label for="zoom-${i}">Томруулах</label><input type="range" id="zoom-${i}" data-zoom="${i}" min="1" max="2.5" step="0.05" value="${p.z}"><button type="button" class="link" data-remove="${i}">Устгах</button></div>` : ""}
            </div>
          </div>`;
        }).join("")}
      </div>

      <h2 class="step"><b>${slots.length ? 3 : 2}</b>Үгээ бичнэ үү</h2>
      <div class="fields">
        <div class="row2">
          ${has("name") ? `<div class="field"><label for="f-name">Хэнд зориулах вэ?</label><input id="f-name" data-k="name" maxlength="40" placeholder="Жишээ: Хонгорзул" value="${esc(order.name)}"></div>` : ""}
          <div class="field"><label for="f-date">Огноо</label><input id="f-date" type="date" data-k="date" value="${esc(order.date)}"></div>
        </div>
        <div class="row2">
          <div class="field"><label for="f-mastsel">Сонины нэр</label>
            <select id="f-mastsel" data-mast="1">
              ${MASTHEADS.map((m) => `<option ${order.masthead === m ? "selected" : ""}>${m}</option>`).join("")}
              <option value="__custom" ${MASTHEADS.includes(order.masthead) ? "" : "selected"}>Өөрөө бичих…</option>
            </select></div>
          ${MASTHEADS.includes(order.masthead) ? "" : `<div class="field"><label for="f-mast-c">Өөрийн нэр</label><input id="f-mast-c" data-k="masthead" maxlength="60" value="${esc(order.masthead)}"></div>`}
          ${order.template === "letter" ? `<div class="field"><label for="f-headline2">Гарчиг</label><input id="f-headline2" data-k="headline" maxlength="80" placeholder="Миний бүхэл болсон чамдаа" value="${esc(order.headline)}"></div>` : ""}
        </div>
        ${has("tofrom") ? `
        <div class="row2">
          <div class="field"><label for="f-to">To (хэнд)</label><input id="f-to" data-k="to" maxlength="30" placeholder="My husband" value="${esc(order.to)}"></div>
          <div class="field"><label for="f-from">From (хэнээс)</label><input id="f-from" data-k="from" maxlength="30" placeholder="Your wife" value="${esc(order.from)}"></div>
        </div>` : ""}
        ${has("partylabels") ? `
        <div class="row2">
          <div class="field"><label for="f-s1p">Өнгөлөг том үг</label><input id="f-s1p" data-k="s1" maxlength="24" placeholder="happy Birthday" value="${esc(order.s1 || "")}"></div>
          <div class="field"><label for="f-l1p">Polaroid доорх үг</label><input id="f-l1p" data-k="l1" maxlength="24" placeholder="Love you!" value="${esc(order.l1 || "")}"></div>
        </div>` : ""}
        ${has("sportlabels") ? `
        <div class="row2">
          <div class="field"><label for="f-l1s">Зургийн шошго</label><input id="f-l1s" data-k="l1" maxlength="18" placeholder="MY MVP" value="${esc(order.l1 || "")}"></div>
          <div class="field"><label for="f-s1s">Том улаан дугаар</label><input id="f-s1s" data-k="s1" maxlength="6" placeholder="#44" value="${esc(order.s1 || "")}"></div>
        </div>
        <p class="help">Захидлын зөвхөн ТОМ ҮСГЭЭР бичсэн мөр гарчиг болж тодорно.</p>` : ""}
        ${has("labels") ? `
        <div class="field"><label>Цаасан шошгууд</label>
          <div class="wishes">
            <input id="f-l1" data-k="l1" maxlength="18" placeholder="cutiepie" value="${esc(order.l1 || "")}">
            <input id="f-l2" data-k="l2" maxlength="18" placeholder="best friends" value="${esc(order.l2 || "")}">
            <input id="f-l3" data-k="l3" maxlength="18" placeholder="forever" value="${esc(order.l3 || "")}">
          </div></div>` : ""}
        ${has("stickers") ? `
        <div class="row2">
          <div class="field"><label for="f-s1">Цэнхэр наалт</label><input id="f-s1" data-k="s1" maxlength="10" placeholder="XOXO" value="${esc(order.s1 || "")}"></div>
          <div class="field"><label for="f-s2">Том наалт</label><input id="f-s2" data-k="s2" maxlength="8" placeholder="BFF" value="${esc(order.s2 || "")}"></div>
        </div>` : ""}
        ${has("note") ? `
        <div class="field"><label for="f-note">Зүүн нүүрний богино үг</label>
          <textarea id="f-note" data-k="note" rows="3" maxlength="300" placeholder="Төрсөн өдрийн мэнд хүргэе, миний хайр.">${esc(order.note)}</textarea></div>` : ""}
        ${has("sign") ? `
        <div class="row2">
          <div class="field"><label for="f-sign">Орд</label>
            <select id="f-sign" data-k="sign"><option value="auto">Огнооноос автоматаар</option>
            ${SIGNS.map((s) => `<option value="${s.key}" ${order.sign === s.key ? "selected" : ""}>${s.mn} · ${s.en}</option>`).join("")}</select></div>
          <div class="field"><label for="f-headline">Гарчиг (заавал биш)</label><input id="f-headline" data-k="headline" maxlength="120" placeholder="Born under the sign of …" value="${esc(order.headline)}"></div>
        </div>` : ""}
        ${has("message") ? `
        <div class="field"><label for="f-message">Мэндчилгээ</label>
          <textarea id="f-message" data-k="message" rows="5" maxlength="900" placeholder="Түүнд хандаж хэлэх үгээ бичээрэй">${esc(order.message)}</textarea>
          <p class="count" id="cnt-message"></p></div>` : ""}
        ${has("wishes") ? `
        <div class="field"><label>Түүнийг тодорхойлох богино үгс</label>
          <div class="wishes">${order.wishes.map((w, i) => `<input id="w-${i}" data-wish="${i}" maxlength="28" placeholder="${["Миний хайртай", "Эгэл даруу", "Үргэлж инээмсэглэдэг", "Гэр бүлийн гол", "Хамгийн сайн найз"][i] || ""}" value="${esc(w)}">`).join("")}</div></div>` : ""}
        ${has("qa") ? `
        <div class="field"><label>Асуулт · хариулт</label>
          <p class="help">Асуултыг өөрчилж болно. Хоосон асуултыг сонинд оруулахгүй.</p>
          <div class="qa-list">${order.qa.map((x, i) => `
            <div class="qa-item">
              <input id="q-${i}" data-q="${i}" class="q" maxlength="200" value="${esc(x.q)}" placeholder="Асуулт">
              <textarea id="a-${i}" data-a="${i}" rows="3" maxlength="3000" placeholder="Хариулт">${esc(x.a)}</textarea>
              <button type="button" class="link" data-delq="${i}">Хасах</button>
            </div>`).join("")}</div>
          ${order.qa.length < 7 ? `<button type="button" class="ghost-btn" id="add-q">+ Асуулт нэмэх</button>` : ""}
        </div>` : ""}
        ${mode === "admin" ? `
        <details class="adv"><summary>Нэмэлт тохиргоо</summary>
          <div class="row2">
            ${has("edition") ? `<div class="field"><label for="f-ed">Дээд мөр</label><input id="f-ed" data-k="edition" maxlength="30" value="${esc(order.edition)}"></div>` : ""}
          </div>
        </details>` : ""}
      </div>

      <h2 class="step"><b>${slots.length ? 4 : 3}</b>Цэцгээ сонгоно уу</h2>
      <div class="flowers" id="flowers">${flowersHtml()}</div>

      <h2 class="step"><b>${slots.length ? 5 : 4}</b>${mode === "admin" ? "Захиалагч" : "Холбоо барих"}</h2>
      <div class="fields">
        <div class="row2">
          <div class="field"><label for="c-name">Таны нэр</label><input id="c-name" data-c="name" maxlength="60" value="${esc(order.contact.name)}"></div>
          <div class="field"><label for="c-phone">Утас <em>*</em></label><input id="c-phone" data-c="phone" inputmode="tel" maxlength="20" placeholder="9911 2233" value="${esc(order.contact.phone)}"></div>
        </div>
        <div class="field"><label for="c-pickup">${order.delivery.type === "delivery" ? "Хүргүүлэх өдөр" : "Авах өдөр"}</label><input id="c-pickup" type="date" data-c="pickup" value="${esc(order.contact.pickup)}"></div>
        <div class="field"><label for="c-note">Нэмэлт хүсэлт (цэцгийн өнгө, хүргэлт г.м)</label><textarea id="c-note" data-c="note" rows="3" maxlength="800">${esc(order.contact.note)}</textarea></div>
      </div>`;
    updateCount();
  }

  function flowersHtml() {
    if (!cat) return `<p class="help">Цэцгийн жагсаалт ачаалж байна…</p>`;
    const f = order.flowers, d = order.delivery;
    const pk = cat.packages.filter((p) => p.active);
    const fl = cat.flowers.filter((p) => p.active);
    const qty = (id) => f.items.find((x) => x.id === id)?.qty || 0;
    return `
      <div class="seg wide" role="tablist">
        <button type="button" data-fmode="package" aria-pressed="${f.mode !== "custom"}">Бэлэн баглаа</button>
        <button type="button" data-fmode="custom" aria-pressed="${f.mode === "custom"}">Өөрөө бүрдүүлэх</button>
      </div>
      ${f.mode !== "custom" ? `
      <div class="pk-list">${pk.map((p) => `
        <label class="pk ${f.packageId === p.id ? "on" : ""}">
          <input type="radio" name="pk" value="${esc(p.id)}" ${f.packageId === p.id ? "checked" : ""}>
          ${p.img ? `<img class="pk-img" src="/api/cimg/${esc(p.img)}" alt="" loading="lazy">` : ""}<span class="pk-name">${esc(p.name)}</span><span class="pk-desc">${esc(p.desc)}</span><span class="pk-price">${money(p.price)}</span>
        </label>`).join("") || `<p class="help">Одоогоор бэлэн баглаа алга.</p>`}
        <label class="pk ${!f.packageId ? "on" : ""}"><input type="radio" name="pk" value="" ${!f.packageId ? "checked" : ""}><span class="pk-name">Зөвхөн сонин</span><span class="pk-desc">Цэцэггүй, сониноо л авна</span><span class="pk-price">${money(0)}</span></label>
      </div>` : `
      <div class="fl-list">${fl.map((p) => `
        <div class="fl ${qty(p.id) ? "on" : ""} ${p.img ? "has-img" : ""}">
          ${p.img ? `<img class="fl-img" src="/api/cimg/${esc(p.img)}" alt="" loading="lazy">` : ""}<span class="fl-name">${esc(p.name)}</span><span class="fl-price">${money(p.price)} / ш</span>
          <span class="qty"><button type="button" data-fq="${esc(p.id)}" data-d="-1" aria-label="Хасах">−</button><b>${qty(p.id)}</b><button type="button" data-fq="${esc(p.id)}" data-d="1" aria-label="Нэмэх">+</button></span>
        </div>`).join("") || `<p class="help">Одоогоор цэцэг бүртгэгдээгүй байна.</p>`}
      </div>`}
      <div class="dl">
        <label class="dl-opt ${d.type !== "delivery" ? "on" : ""}"><input type="radio" name="dl" value="pickup" ${d.type !== "delivery" ? "checked" : ""}><span>Очиж авна${cat.pickupNote ? ` · ${esc(cat.pickupNote)}` : ""}</span><b>${money(0)}</b></label>
        <label class="dl-opt ${d.type === "delivery" ? "on" : ""}"><input type="radio" name="dl" value="delivery" ${d.type === "delivery" ? "checked" : ""}><span>Хүргүүлнэ</span><b>+${money(cat.deliveryFee)}</b></label>
      </div>
      ${d.type === "delivery" ? `<div class="field"><label for="d-addr">Хүргэлтийн хаяг <em>*</em></label><textarea id="d-addr" data-addr="1" rows="2" maxlength="400" placeholder="Дүүрэг, хороо, байр, орц, тоот">${esc(d.address)}</textarea></div>` : ""}
      <div class="sum" id="sum">${sumHtml()}</div>`;
  }
  function sumHtml() {
    const p = priceOf(order, cat);
    return `${p.lines.map((l) => `<div class="sum-row"><span>${esc(l.label)}</span><span>${money(l.amount)}</span></div>`).join("")}<div class="sum-row total"><span>Нийт</span><span>${money(p.total)}</span></div>`;
  }
  const refreshFlowers = (user = true) => { const el = $("#flowers", form); if (el) el.innerHTML = flowersHtml(); if (user) onChange?.(order); };
  let cat = null;
  loadCatalog().then((c) => { cat = c; refreshFlowers(false); });

  const updateCount = () => {
    const el = $("#cnt-message", form);
    if (el) el.textContent = `${order.message.length} / 900`;
  };

  // ── Үйлдлүүд ──
  root.addEventListener("change", async (e) => {
    const t = e.target;
    if (t.name === "pk") { order.flowers.packageId = t.value; refreshFlowers(); return; }
    if (t.name === "dl") { order.delivery.type = t.value; buildForm(); onChange?.(order); return; }
    if (t.name === "tpl") {
      // Сонины нэрийг хэрэглэгч өөрчлөөгүй бол шинэ загварын анхны нэрийг тавина
      const defOf = (k) => TEMPLATES[k]?.mast || "BIRTHDAY TIMES";
      if (!order.masthead || order.masthead === defOf(order.template)) order.masthead = defOf(t.value);
      order.template = t.value;
      selected = -1;
      selectText(null); selectFrame(null);
      buildForm();
      render();
      return;
    }
    if (t.dataset.file != null) {
      const i = +t.dataset.file;
      const file = t.files?.[0];
      if (!file) return;
      const slot = t.closest(".slot");
      slot.classList.add("busy");
      try {
        order.photos[i] = { ...order.photos[i], src: await compress(file), x: 50, y: 50, z: 1 };
        buildForm();
        render();
      } catch (err) {
        alertBox(err.message);
      } finally {
        slot?.classList.remove("busy");
      }
    }
  });

  root.addEventListener("input", (e) => {
    const t = e.target, d = t.dataset;
    if (d.mast) {
      order.masthead = t.value === "__custom" ? "" : t.value;
      buildForm(); render();
      if (t.value === "__custom") $("#f-mast-c", form)?.focus();
      return;
    }
    if (d.addr) { order.delivery.address = t.value; onChange?.(order); return; }
    if (d.k) order[d.k] = t.value;
    else if (d.c) order.contact[d.c] = t.value;
    else if (d.cap) order.photos[+d.cap].caption = t.value;
    else if (d.wish) order.wishes[+d.wish] = t.value;
    else if (d.q) order.qa[+d.q].q = t.value;
    else if (d.a) order.qa[+d.a].a = t.value;
    else if (d.zoom) order.photos[+d.zoom].z = +t.value;
    else return;
    if (d.k === "message") updateCount();
    render();
  });

  root.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.fmode) { order.flowers.mode = t.dataset.fmode; refreshFlowers(); return; }
    if (t.dataset.fq) {
      const it = order.flowers.items.find((x) => x.id === t.dataset.fq) || (order.flowers.items.push({ id: t.dataset.fq, qty: 0 }), order.flowers.items.at(-1));
      it.qty = Math.max(0, Math.min(200, it.qty + +t.dataset.d));
      order.flowers.items = order.flowers.items.filter((x) => x.qty > 0);
      refreshFlowers(); return;
    }
    if (t.id === "add-q") { order.qa.push({ q: "", a: "" }); buildForm(); render(); }
    if (t.dataset.delq) { order.qa.splice(+t.dataset.delq, 1); buildForm(); render(); }
    if (t.dataset.remove) { order.photos[+t.dataset.remove] = { src: "", caption: order.photos[+t.dataset.remove].caption, x: 50, y: 50, z: 1 }; buildForm(); render(); }
  });

  // ── Текстийн хэмжээ, байрлал ──
  const TB_NAMES = { l1: "Шошго 1", l2: "Шошго 2", l3: "Шошго 3", s1: "Наалт 1", s2: "Наалт 2", mast: "Сонины нэр", body: "Захидал", note: "Зүүн нүүрний үг", tofrom: "To / From", msg: "Мэндчилгээ", head: "Гарчиг", cap: "Тайлбар", qa: "Асуулт · хариулт", its: "Нэр", bday: "BIRTHDAY!", wish: "Богино үгс", c1: "Тайлбар 1", c2: "Тайлбар 2", c3: "Тайлбар 3" };
  let selText = null, tdrag = null, selFrame = null, frameMode = "img";
  const FR_NAMES = { pa: "Зүүн polaroid", pb: "Баруун polaroid", neg: "Хальс", poster: "Постер зураг", sp1: "Баруун зураг 1", sp2: "Баруун зураг 2", rl: "Зүүн хальс", rr: "Баруун хальс", stamp: "Маркан хүрээ", f1: "Зураг 2-ын хүрээ", f2: "Зураг 3-ын хүрээ", f3: "Зураг 4-ийн хүрээ", main: "Гол зургийн хүрээ", p1: "Polaroid 2", p2: "Polaroid 3", p3: "Polaroid 4", pmain: "Гол polaroid", fa: "Хальсан зураг 1", fb: "Хальсан зураг 2", strip: "Фото бүхээгийн тууз", print: "Том зураг" };
  const txOf = (key) => {
    order.tx = order.tx || {};
    const t = (order.tx[order.template] = order.tx[order.template] || {});
    return (t[key] = t[key] || { dx: 0, dy: 0, s: 1, r: 0 });
  };
  const curKey = () => (selText ? selText : selFrame ? "fr_" + selFrame : null);
  function updateTextBar() {
    const bar = root.querySelector("#textbar");
    if (!bar) return;
    const key = curKey();
    bar.hidden = !key;
    if (!key) return;
    const v = order.tx?.[order.template]?.[key] || { s: 1 };
    const isFr = !selText;
    const showSize = !isFr || frameMode === "frame";
    root.querySelector("#tb-name").textContent = isFr ? FR_NAMES[selFrame] || "Зураг" : TB_NAMES[selText] || "Текст";
    root.querySelector("#tb-mode").hidden = !isFr;
    root.querySelector("#tb-colors").hidden = isFr;
    root.querySelectorAll("#tb-colors [data-color]").forEach((b) => b.setAttribute("aria-pressed", String((v.c || "") === b.dataset.color)));
    root.querySelectorAll("#tb-mode [data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === frameMode)));
    ["#tb-dec", "#tb-inc", "#tb-val"].forEach((q) => (root.querySelector(q).hidden = !showSize));
    ["#tb-rl", "#tb-rr"].forEach((q) => (root.querySelector(q).hidden = !(isFr && frameMode === "frame")));
    root.querySelector("#tb-dec").textContent = isFr ? "−" : "A−";
    root.querySelector("#tb-inc").textContent = isFr ? "+" : "A+";
    root.querySelector("#tb-val").textContent = Math.round((v.s || 1) * 100) + "%" + (isFr && v.r ? ` · ${v.r}°` : "");
  }
  function markSel() {
    sheet.querySelectorAll(".tsel").forEach((x) => x.classList.remove("tsel"));
    if (selText) sheet.querySelector(`[data-tb="${selText}"]`)?.classList.add("tsel");
    if (selFrame && frameMode === "frame") sheet.querySelector(`[data-fr="${selFrame}"]`)?.classList.add("tsel");
  }
  function selectText(key) {
    selText = key;
    if (key) { selFrame = null; selected = -1; sheet.querySelectorAll(".ph.sel").forEach((x) => x.classList.remove("sel")); }
    markSel();
    updateTextBar();
  }
  function selectFrame(key) {
    selFrame = key;
    selText = null;
    markSel();
    updateTextBar();
  }
  root.addEventListener("click", (e) => {
    const cb = e.target.closest("[data-color]");
    if (cb && selText) { const v = txOf(selText); v.c = cb.dataset.color || ""; if (!v.c) delete v.c; updateTextBar(); render(); return; }
    const m = e.target.closest("[data-mode]");
    if (m) { frameMode = m.dataset.mode; markSel(); updateTextBar(); return; }
    const b = e.target.closest("[data-tbact]");
    const key = curKey();
    if (!b || !key) return;
    if (b.dataset.tbact === "close") { selectText(null); selectFrame(null); sheet.querySelectorAll(".ph.sel").forEach((x) => x.classList.remove("sel")); selected = -1; return; }
    const v = txOf(key);
    const step = selText ? 0.05 : 0.05;
    if (b.dataset.tbact === "inc") v.s = Math.min(selText ? 2.5 : 2, Math.round((v.s + step) * 100) / 100);
    if (b.dataset.tbact === "dec") v.s = Math.max(0.4, Math.round((v.s - step) * 100) / 100);
    if (b.dataset.tbact === "rl") v.r = Math.max(-180, (v.r || 0) - 2);
    if (b.dataset.tbact === "rr") v.r = Math.min(180, (v.r || 0) + 2);
    if (b.dataset.tbact === "reset") { v.dx = 0; v.dy = 0; v.s = 1; v.r = 0; }
    updateTextBar();
    render();
  });
  root.addEventListener("input", (e) => {
    if (e.target.id !== "tb-color" || !selText) return;
    txOf(selText).c = e.target.value;
    updateTextBar();
    render();
  });
  const MM = 96 / 25.4;
  sheet.addEventListener("pointerdown", (e) => {
    const tb = e.target.closest("[data-tb]");
    if (!tb || e.target.closest(".ph")) return;
    selectText(tb.dataset.tb);
    const v = txOf(tb.dataset.tb);
    tdrag = { el: tb, sx: e.clientX, sy: e.clientY, dx: v.dx, dy: v.dy, k: +stage.dataset.k || 1, v, moved: false };
    tb.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  sheet.addEventListener("pointermove", (e) => {
    if (!tdrag) return;
    const ddx = (e.clientX - tdrag.sx) / (tdrag.k * MM), ddy = (e.clientY - tdrag.sy) / (tdrag.k * MM);
    if (Math.abs(ddx) + Math.abs(ddy) > 0.5) tdrag.moved = true;
    tdrag.v.dx = Math.round((tdrag.dx + ddx) * 10) / 10;
    tdrag.v.dy = Math.round((tdrag.dy + ddy) * 10) / 10;
    tdrag.el.style.translate = `${tdrag.v.dx}mm ${tdrag.v.dy}mm`;
  });
  const tend = () => { if (tdrag) { const m = tdrag.moved; tdrag = null; if (m) onChange?.(order); } };
  sheet.addEventListener("pointerup", tend);
  sheet.addEventListener("pointercancel", tend);

  // ── Зургийг чирж байрлуулах ──
  let drag = null;
  sheet.addEventListener("pointerdown", (e) => {
    const ph = e.target.closest(".ph");
    if (!ph) return;
    const i = +ph.dataset.idx;
    sheet.querySelectorAll(".ph.sel").forEach((x) => x.classList.remove("sel"));
    const fr = ph.closest("[data-fr]");
    selected = i;
    selectFrame(fr ? fr.dataset.fr : null);
    if (fr && frameMode === "frame") {
      const v = txOf("fr_" + fr.dataset.fr);
      tdrag = { el: fr, sx: e.clientX, sy: e.clientY, dx: v.dx, dy: v.dy, k: +stage.dataset.k || 1, v, moved: false };
      fr.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }
    ph.classList.add("sel");
    if (!order.photos[i]?.src) { $(`#file-${i}`, form)?.click(); return; }
    const k = +stage.dataset.k || 1;
    const r = ph.getBoundingClientRect();
    drag = { i, ph, sx: e.clientX, sy: e.clientY, x: order.photos[i].x, y: order.photos[i].y, w: r.width, h: r.height, k };
    ph.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  sheet.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const p = order.photos[drag.i];
    const sens = 100 / p.z;
    p.x = Math.max(0, Math.min(100, drag.x - ((e.clientX - drag.sx) / drag.w) * sens));
    p.y = Math.max(0, Math.min(100, drag.y - ((e.clientY - drag.sy) / drag.h) * sens));
    const img = drag.ph.querySelector("img");
    if (img) { img.style.objectPosition = `${p.x}% ${p.y}%`; img.style.transformOrigin = `${p.x}% ${p.y}%`; }
  });
  const end = () => { if (drag) { drag = null; onChange?.(order); } };
  sheet.addEventListener("pointerup", end);
  sheet.addEventListener("pointercancel", end);

  function alertBox(msg) {
    const n = document.createElement("div");
    n.className = "toast err";
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 5000);
  }

  function load(o) {
    const b = blankOrder();
    order = { ...b, ...o, contact: { ...b.contact, ...(o.contact || {}) } };
    order.photos = [0, 1, 2, 3, 4, 5].map((i) => ({ ...b.photos[i], ...(o.photos?.[i] || {}) }));
    order.wishes = [0, 1, 2, 3, 4].map((i) => o.wishes?.[i] || "");
    if (!Array.isArray(o.qa)) order.qa = b.qa;
    order.tx = o.tx && typeof o.tx === "object" ? o.tx : {};
    order.flowers = { ...b.flowers, ...(o.flowers || {}), items: Array.isArray(o.flowers?.items) ? o.flowers.items.map((x) => ({ ...x })) : [] };
    order.delivery = { ...b.delivery, ...(o.delivery || {}) };
    selText = null; selFrame = null; updateTextBar();
    selected = -1;
    const radio = $(`#tpl-${order.template}`, root);
    if (radio) radio.checked = true;
    buildForm();
    render(false);
  }

  function printSheet() {
    let host = document.getElementById("print-host");
    if (!host) { host = document.createElement("div"); host.id = "print-host"; document.body.appendChild(host); }
    const clone = sheet.cloneNode(true);
    clone.removeAttribute("id");
    clone.style.transform = "none";
    clone.style.setProperty("--grain", grain);
    host.replaceChildren(clone);
    fitAll(clone);
    setTimeout(() => window.print(), 50);
  }

  load(order);
  return { get: () => order, load, printSheet, toast: alertBox, price: () => priceOf(order, cat), reloadCatalog: async () => { cat = await loadCatalog(true); refreshFlowers(false); } };
}

export function toast(msg, kind = "ok") {
  const n = document.createElement("div");
  n.className = `toast ${kind}`;
  n.textContent = msg;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 3500);
}
