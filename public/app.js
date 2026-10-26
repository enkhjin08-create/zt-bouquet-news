import { TEMPLATES, SIGNS, MASTHEADS, renderSheet, fitAll } from "./render.js";

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
  photos: [0, 1, 2, 3].map(() => ({ src: "", caption: "", x: 50, y: 50, z: 1 })),
  contact: { name: "", phone: "", pickup: "", note: "" },
});

// ── Зураг шахах: урт тал 1800px, JPEG ──
async function compress(file, max = 1800, q = 0.85) {
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
            <span class="pick-name">${t.label}</span>
          </label>`).join("")}
      </div>
    </section>
    <section class="area-preview">
      <div class="preview-card">
        <div class="stage" id="stage"><div class="sheet" id="sheet"></div></div>
        <p class="hint">A3 хэмжээ · Зураг дээр дарж чирээд байрлалыг тааруулна. Саарал үсэг бол жишээ — хэвлэхэд гарахгүй.</p>
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
      if (selected >= 0) sheet.querySelector(`.ph[data-idx="${selected}"]`)?.classList.add("sel");
      rescale();
      if (user) onChange?.(order);
    });
  };
  document.fonts?.ready.then(() => fitAll(sheet));

  // ── Талбарын маягт ──
  const has = (f) => TEMPLATES[order.template].fields.includes(f);
  function buildForm() {
    const t = TEMPLATES[order.template];
    const slots = t.photos;
    form.innerHTML = `
      <h2 class="step"><b>2</b>Зургаа оруулна уу</h2>
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

      <h2 class="step"><b>3</b>Үгээ бичнэ үү</h2>
      <div class="fields">
        <div class="row2">
          <div class="field"><label for="f-name">Хэнд зориулах вэ?</label><input id="f-name" data-k="name" maxlength="40" placeholder="Жишээ: Хонгорзул" value="${esc(order.name)}"></div>
          <div class="field"><label for="f-date">Огноо</label><input id="f-date" type="date" data-k="date" value="${esc(order.date)}"></div>
        </div>
        <div class="row2">
          <div class="field"><label for="f-mastsel">Сонины нэр</label>
            <select id="f-mastsel" data-mast="1">
              ${MASTHEADS.map((m) => `<option ${order.masthead === m ? "selected" : ""}>${m}</option>`).join("")}
              <option value="__custom" ${MASTHEADS.includes(order.masthead) ? "" : "selected"}>Өөрөө бичих…</option>
            </select></div>
          ${MASTHEADS.includes(order.masthead) ? "" : `<div class="field"><label for="f-mast-c">Өөрийн нэр</label><input id="f-mast-c" data-k="masthead" maxlength="24" value="${esc(order.masthead)}"></div>`}
          ${order.template === "letter" ? `<div class="field"><label for="f-headline2">Гарчиг</label><input id="f-headline2" data-k="headline" maxlength="80" placeholder="Миний бүхэл болсон чамдаа" value="${esc(order.headline)}"></div>` : ""}
        </div>
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
              <textarea id="a-${i}" data-a="${i}" rows="2" maxlength="500" placeholder="Хариулт">${esc(x.a)}</textarea>
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

      <h2 class="step"><b>4</b>${mode === "admin" ? "Захиалагч" : "Холбоо барих"}</h2>
      <div class="fields">
        <div class="row2">
          <div class="field"><label for="c-name">Таны нэр</label><input id="c-name" data-c="name" maxlength="60" value="${esc(order.contact.name)}"></div>
          <div class="field"><label for="c-phone">Утас <em>*</em></label><input id="c-phone" data-c="phone" inputmode="tel" maxlength="20" placeholder="9911 2233" value="${esc(order.contact.phone)}"></div>
        </div>
        <div class="field"><label for="c-pickup">Хэзээ авах вэ?</label><input id="c-pickup" type="date" data-c="pickup" value="${esc(order.contact.pickup)}"></div>
        <div class="field"><label for="c-note">Нэмэлт хүсэлт (цэцгийн өнгө, хүргэлт г.м)</label><textarea id="c-note" data-c="note" rows="3" maxlength="800">${esc(order.contact.note)}</textarea></div>
      </div>`;
    updateCount();
  }

  const updateCount = () => {
    const el = $("#cnt-message", form);
    if (el) el.textContent = `${order.message.length} / 900`;
  };

  // ── Үйлдлүүд ──
  root.addEventListener("change", async (e) => {
    const t = e.target;
    if (t.name === "tpl") {
      order.template = t.value;
      selected = -1;
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
    if (t.id === "add-q") { order.qa.push({ q: "", a: "" }); buildForm(); render(); }
    if (t.dataset.delq) { order.qa.splice(+t.dataset.delq, 1); buildForm(); render(); }
    if (t.dataset.remove) { order.photos[+t.dataset.remove] = { src: "", caption: order.photos[+t.dataset.remove].caption, x: 50, y: 50, z: 1 }; buildForm(); render(); }
  });

  // ── Зургийг чирж байрлуулах ──
  let drag = null;
  sheet.addEventListener("pointerdown", (e) => {
    const ph = e.target.closest(".ph");
    if (!ph) return;
    const i = +ph.dataset.idx;
    sheet.querySelectorAll(".ph.sel").forEach((x) => x.classList.remove("sel"));
    ph.classList.add("sel");
    selected = i;
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
    order.photos = [0, 1, 2, 3].map((i) => ({ ...b.photos[i], ...(o.photos?.[i] || {}) }));
    order.wishes = [0, 1, 2, 3, 4].map((i) => o.wishes?.[i] || "");
    if (!Array.isArray(o.qa)) order.qa = b.qa;
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
  return { get: () => order, load, printSheet, toast: alertBox };
}

export function toast(msg, kind = "ok") {
  const n = document.createElement("div");
  n.className = `toast ${kind}`;
  n.textContent = msg;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 3500);
}
