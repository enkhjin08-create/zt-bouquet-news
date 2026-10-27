// Загварын рендер — A3 хэвтээ (420 × 297 мм), хоёр A4 нүүр
// Хоосон талбарт саарал жишээ текст (ghost) гарна; хэвлэхэд нуугдана.

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nl = (s) => esc(s).replace(/\n/g, "<br>");
const or = (val, sample) => (val && String(val).trim() ? nl(val) : `<span class="ghost">${nl(sample)}</span>`);

const MONTHS_EN = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const pad = (n) => String(n).padStart(2, "0");
function parseDate(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || "");
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
}
export const dateEn = (d) => { const p = parseDate(d); return p ? `${MONTHS_EN[p.m - 1]} ${p.d}, ${p.y}` : ""; };
export const dateMn = (d) => { const p = parseDate(d); return p ? `${p.y} оны ${pad(p.m)} дугаар сарын ${pad(p.d)}` : ""; };

export const SIGNS = [
  { key: "capricorn", en: "Capricorn", mn: "Матар", g: "♑", from: [12, 22], tag: "Climbs every mountain, one step at a time", kw: "determined, wise, disciplined" },
  { key: "aquarius", en: "Aquarius", mn: "Хумх", g: "♒", from: [1, 20], tag: "Unafraid of thinking outside the box", kw: "visionary, unique, progressive" },
  { key: "pisces", en: "Pisces", mn: "Загас", g: "♓", from: [2, 19], tag: "Dreams in colour and feels in depth", kw: "creative, gentle, empathetic" },
  { key: "aries", en: "Aries", mn: "Хонь", g: "♈", from: [3, 21], tag: "Bold, fearless and full of fire", kw: "brave, energetic, ambitious" },
  { key: "taurus", en: "Taurus", mn: "Үхэр", g: "♉", from: [4, 20], tag: "Grounded, loyal and quietly strong", kw: "reliable, patient, devoted" },
  { key: "gemini", en: "Gemini", mn: "Ихэр", g: "♊", from: [5, 21], tag: "A curious mind and endless conversations", kw: "witty, adaptable, social" },
  { key: "cancer", en: "Cancer", mn: "Мэлхий", g: "♋", from: [6, 21], tag: "A heart that holds everyone close", kw: "caring, intuitive, protective" },
  { key: "leo", en: "Leo", mn: "Арслан", g: "♌", from: [7, 23], tag: "Born to shine and light up the room", kw: "confident, generous, warm" },
  { key: "virgo", en: "Virgo", mn: "Охин", g: "♍", from: [8, 23], tag: "Thoughtful in every little detail", kw: "kind, precise, practical" },
  { key: "libra", en: "Libra", mn: "Жинлүүр", g: "♎", from: [9, 23], tag: "Grace, balance and a lot of charm", kw: "fair, gentle, romantic" },
  { key: "scorpio", en: "Scorpio", mn: "Хилэнц", g: "♏", from: [10, 23], tag: "Deep, magnetic and true to the core", kw: "passionate, loyal, fearless" },
  { key: "sagittarius", en: "Sagittarius", mn: "Нум", g: "♐", from: [11, 22], tag: "Always chasing the next horizon", kw: "optimistic, free, adventurous" },
];
export function signFor(date, override) {
  if (override && override !== "auto") return SIGNS.find((s) => s.key === override) || SIGNS[0];
  const p = parseDate(date);
  if (!p) return SIGNS[1];
  const v = p.m * 100 + p.d;
  let found = SIGNS[0], best = -1; // Матар оныг дамжина
  for (const s of SIGNS) {
    const f = s.from[0] * 100 + s.from[1];
    if (v >= f && f > best) { best = f; found = s; }
  }
  return found;
}

const SAMPLE = {
  name: "Хонгорзул",
  message:
    "Төрсөн өдрийн мэнд хүргэе! Үргэлж инээмсэглэлээрээ бусдын өдрийг гэрэлтүүлдэг чамдаа хамгийн сайн сайхныг хүсье. Мөрөөдөл бүхэн чинь биелж, эргэн тойрон чинь хайраар дүүрэн байх болтугай.",
  answers: [
    "Анх танилцсан өдрөө хоёулаа автобусны буудал дээр нэг цаг инээгээд суусан минь.",
    "Юмыг жижиг сажиггүй, бүх зүрхээрээ хийдэг зан нь.",
    "Ажил амьдрал хоёроо зэрэг авч яваад, хэзээ ч бууж өгдөггүйд нь.",
    "Эрүүл энх, сэтгэл нь үргэлж амар тайван байхыг.",
    "Хамтдаа Европоор аялж, гэрэл зураг дүүрэн дурсамж бүтээх.",
  ],
  letter:
    "Чамтайгаа учирсан тэр өдрөөс хойш миний амьдралын өнгө өөр болсон юм шиг санагддаг. Хамтдаа инээсэн, уйлсан, аялсан бүх л мөч маань надад хамгийн үнэтэй дурсамж болон үлдсэн.\n\nЧи миний хамгийн дотно хүн, хамгийн сайн найз минь. Ямар ч үед хажууд минь байж, намайг өөрийнхөөрөө байхад тусалдагт чинь баярлалаа.\n\nТөрсөн өдрөөр чинь чамд эрүүл энх, аз жаргал, мөрөөдөл бүхэн чинь биелэхийг хүсье. Үргэлж хамтдаа байцгаая. Хайртай шүү ♥",
  note: "Төрсөн өдрийн мэнд хүргэе, миний хайр.\nЧамтайгаа хамт хөгширч, олон жилийн дараа өнөөдрийнхөө тухай инээмсэглэн дурсаж суухыг хүсэж байна.\nЧамдаа маш их хайртай шүү. Өнөөдөр, маргааш, бас насан туршдаа.",
  captions: ["Анх хамтдаа аялсан өдөр", "Төрсөн өдрийн бялуу", "Гэр бүлээрээ"],
  wishes: ["Миний хайртай", "Эгэл даруу", "Үргэлж инээмсэглэдэг", "Гэр бүлийн гол", "Хамгийн сайн найз"],
};

function photo(p, cls, idx, { gray = false } = {}) {
  const has = p && p.src;
  const x = p?.x ?? 50, y = p?.y ?? 50, z = p?.z ?? 1;
  const img = has
    ? `<img src="${p.src}" alt="" draggable="false" style="object-position:${x}% ${y}%;transform:scale(${z});transform-origin:${x}% ${y}%;${gray ? "filter:grayscale(1) contrast(1.05);" : ""}">`
    : `<span class="ph-empty"><span>Зураг ${idx + 1}</span></span>`;
  return `<div class="ph ${cls || ""}" data-idx="${idx}">${img}</div>`;
}

const heart = (x, y, s, r = 0, o = 1) =>
  `<svg class="heart" viewBox="0 0 32 29" style="left:${x}mm;top:${y}mm;width:${s}mm;transform:rotate(${r}deg);opacity:${o}"><path d="M16 28.6S0 18.7 0 8.6C0 3.6 3.8 0 8.3 0c3.4 0 6.2 2 7.7 4.9C17.5 2 20.3 0 23.7 0 28.2 0 32 3.6 32 8.6c0 10.1-16 20-16 20z"/></svg>`;
const flower = `<svg class="flower" viewBox="0 0 20 20"><g><circle cx="10" cy="5" r="4"/><circle cx="15" cy="9" r="4"/><circle cx="13" cy="15" r="4"/><circle cx="7" cy="15" r="4"/><circle cx="5" cy="9" r="4"/></g><circle class="c" cx="10" cy="10.5" r="3"/></svg>`;

// ───────────── 1. Хар цагаан сонин ─────────────
function news(o) {
  const ph = o.photos || [];
  const qa = (o.qa || []).filter((x) => x.q && x.q.trim());
  const qaHtml = qa.length
    ? qa.map((x, i) => `<div class="qa"><p class="q">${nl(x.q)}</p><p class="a">${or(x.a, SAMPLE.answers[i % SAMPLE.answers.length])}</p></div>`).join("")
    : `<div class="qa"><p class="a">${or(o.message, SAMPLE.message)}</p></div>`;
  const cap = (i) => or(ph[i]?.caption, SAMPLE.captions[i - 1]);
  const top = `<div class="n-top"><span>${esc(o.edition || "SPECIAL EDITION")}</span><span>${dateEn(o.date) || "&nbsp;"}</span></div>`;
  return `
  <section class="page n-left">
    ${top}
    <div class="scallop f1" data-fr="f1">${photo(ph[1], "", 1, { gray: true })}</div>
    <p class="n-cap c1" data-tb="c1">${cap(1)}</p>
    <div class="scallop f2" data-fr="f2">${photo(ph[2], "", 2, { gray: true })}</div>
    <p class="n-cap c2" data-tb="c2">${cap(2)}</p>
    <div class="scallop f3" data-fr="f3">${photo(ph[3], "", 3, { gray: true })}</div>
    <p class="n-cap c3" data-tb="c3">${cap(3)}</p>
    <div class="n-bottom"></div>
  </section>
  <section class="page n-right">
    ${top}
    <h1 class="n-mast fitw" data-tb="mast">${esc(o.masthead || "BIRTHDAY TIMES")}</h1>
    <div class="n-rule"></div>
    <p class="n-its fitw" data-tb="its">It's ${or(o.name, SAMPLE.name)}'s</p>
    <p class="n-bday" data-tb="bday">BIRTHDAY!</p>
    <div class="n-body">
      <div class="n-main" data-fr="main">${photo(ph[0], "", 0, { gray: true })}</div>
      <div class="n-qa fit" data-base="10.5" data-tb="qa">${qaHtml}</div>
    </div>
    <div class="n-bottom"></div>
  </section>`;
}

// ───────────── 2. Ягаан polaroid ─────────────
function polaroid(o) {
  const ph = o.photos || [];
  const wishes = (o.wishes || []).filter((w) => w && w.trim());
  const list = (wishes.length ? wishes.map(esc) : SAMPLE.wishes.map((w) => `<span class="ghost">${w}</span>`))
    .map((w) => `<li>${flower}<span>${w}</span></li>`).join("");
  const pc = (i, cls) => `<figure class="pol ${cls}" data-fr="${cls}">${photo(ph[i], "", i)}<figcaption>${ph[i]?.caption ? esc(ph[i].caption) : ""}</figcaption><i class="tape"></i></figure>`;
  return `
  <section class="page p-left">
    <div class="p-top"><span>002</span></div>
    ${pc(1, "p1")}${pc(2, "p2")}${pc(3, "p3")}
    <ul class="p-wish" data-tb="wish">${list}</ul>
    ${heart(14, 128, 11, -15)}${heart(26, 132, 9, 12)}${heart(170, 248, 12, 10)}${heart(155, 270, 9, -8)}${heart(8, 70, 7, -20, .8)}
    <div class="p-bottom"></div>
  </section>
  <section class="page p-right">
    <div class="p-top r"><span>№ ${esc(o.id || "0001")}</span></div>
    <h1 class="p-mast fitw" data-tb="mast">${esc(o.masthead || "BIRTHDAY TIMES")}</h1>
    <div class="p-dateline"><span>Зөвхөн түүнд, Улаанбаатар</span><span>${dateMn(o.date)}</span></div>
    <div class="p-msg fit" data-base="22" data-tb="msg"><p>${or(o.message, SAMPLE.message)}</p></div>
    <figure class="pol pmain" data-fr="pmain">${photo(ph[0], "", 0)}<figcaption>${or(o.name, SAMPLE.name)}</figcaption><i class="tape"></i></figure>
    ${heart(150, 58, 10, 15)}${heart(166, 66, 7, -10)}${heart(18, 250, 12, -12)}${heart(176, 228, 9, 18)}${heart(160, 262, 7, 5, .8)}
    <div class="p-bottom"></div>
  </section>`;
}

// ───────────── 3. Фото бүхээг (To / From захидал) ─────────────
const pearl = (ph, i) => `<div class="pearl"><div class="pearl-in">${photo(ph[i], "", i)}</div></div>`;
const film = (ph, i, cls, code) => `<figure class="film ${cls}" data-fr="${cls.replace("-", "")}"><span class="film-code">${code}</span>${photo(ph[i], "", i)}<span class="film-code b">▸ ${i + 43}A</span></figure>`;
function booth(o) {
  const ph = o.photos || [];
  return `
  <section class="page b-left">
    <div class="wavy"></div>
    <div class="b-top"><span>002</span></div>
    <div class="b-strip" data-fr="strip">
      <span class="strip-code">2026 F 8.0 &nbsp;&nbsp; 43 &nbsp;&nbsp; 045/2.8 120 &nbsp;&nbsp; TRA</span>
      <div class="strip-grid">${pearl(ph, 2)}${pearl(ph, 3)}${pearl(ph, 4)}${pearl(ph, 5)}</div>
    </div>
    ${film(ph, 0, "f-a", "RTRA &nbsp; 44 &nbsp;&nbsp; TRA")}
    ${film(ph, 1, "f-b", "TRA &nbsp; 45 &nbsp;&nbsp; RTRA")}
    <div class="b-note" data-tb="note"><p>${or(o.note, SAMPLE.note)}</p><p class="b-heart">♥</p></div>
    <div class="b-bottom"></div>
  </section>
  <section class="page b-right">
    <div class="wavy"></div>
    <div class="b-top r"><span>№ ${esc(o.id || "0247")}</span></div>
    <h1 class="b-mast fitw" data-tb="mast">${esc(o.masthead || "BIRTHDAY TIMES")}</h1>
    <div class="b-dateline"><span>Зөвхөн түүнд, Улаанбаатар</span><span>${dateMn(o.date)}</span></div>
    <div class="b-tofrom" data-tb="tofrom">
      <p><span class="tf-l">TO:</span><span class="tf-v">${or(o.to, "My husband")}</span></p>
      <p><span class="tf-l">FROM:</span><span class="tf-v">${or(o.from, "Your wife")}</span></p>
    </div>
    <div class="b-stamps">${stamp("♥")}${stamp("❦")}</div>
    <div class="b-body fit" data-base="12" data-tb="body"><p>${or(o.message, SAMPLE.letter)}</p></div>
    <div class="b-bottom"></div>
  </section>`;
}

// ───────────── 4. Захидал сонин (Illustrator загвар дээр үндэслэсэн) ─────────────
const stamp = (glyph) => `<span class="stamp"><span class="st-in"><span class="st-g">${glyph}</span><span class="st-t">POSTAGE</span></span></span>`;
function letter(o) {
  const ph = o.photos || [];
  const mast = o.masthead || "BIRTHDAY TIMES";
  const head = o.headline && o.headline.trim() ? nl(o.headline) : `<span class="ghost">Миний бүхэл болсон ${esc(o.name || "чамдаа")}</span>`;
  const strip = [1, 2, 3].map((i) => `<div class="booth-cell">${photo(ph[i], "", i)}</div>`).join("");
  return `
  <section class="page l-left">
    <div class="l-num">002</div>
    <div class="booth" data-fr="strip">${strip}<p class="booth-cap">${esc(dateMn(o.date))}</p></div>
    <figure class="l-print" data-fr="print">${photo(ph[0], "", 0)}</figure>
    <p class="l-cap fit" data-base="11" data-tb="cap"><span>${or(ph[1]?.caption || ph[0]?.caption, "Хамтдаа өнгөрүүлсэн хамгийн гоё өдрүүд маань")}</span></p>
  </section>
  <section class="page l-right">
    <div class="l-num r">№ ${esc(o.id || "0247")}</div>
    <h1 class="l-mast fitw" data-tb="mast">${esc(mast)}</h1>
    <div class="l-dateline"><span>Зөвхөн түүнд, Улаанбаатар</span><span>${dateMn(o.date)}</span></div>
    <div class="l-headrow">
      <h2 class="l-head" data-tb="head">${head}<br><span class="l-hearts">♥ ♥</span></h2>
      <div class="stamps">${stamp("♥")}${stamp("✉")}</div>
    </div>
    <div class="l-body fit" data-base="14" data-tb="body"><p>${or(o.message, SAMPLE.letter)}</p></div>
    <div class="l-bottom"></div>
  </section>`;
}

export const MASTHEADS = ["BIRTHDAY TIMES", "ВАЛЕНТИНЫ МЭДЭЭ", "БАЯРЫН МЭДЭЭ", "ЭЭЖИЙН МЭДЭЭ", "НАЙЗЫН МЭДЭЭ"];

export const TEMPLATES = {
  letter: { label: "Захидал сонин", render: letter, photos: ["Том зураг (зүүн нүүр)", "Фото бүхээг 1", "Фото бүхээг 2", "Фото бүхээг 3"], fields: ["name", "masthead", "headline", "message", "captions"] },
  news: { label: "Хар цагаан сонин", render: news, photos: ["Гол зураг (баруун нүүр)", "Зураг 2", "Зураг 3", "Зураг 4"], fields: ["name", "edition", "masthead", "qa", "message", "captions"] },
  polaroid: { label: "Ягаан polaroid", render: polaroid, photos: ["Гол зураг (баруун нүүр)", "Зураг 2", "Зураг 3", "Зураг 4"], fields: ["name", "masthead", "message", "wishes", "captions"] },
  booth: { label: "Фото бүхээг", render: booth, photos: ["Хальсан зураг 1 (дээд)", "Хальсан зураг 2 (доод)", "Бүхээг 1", "Бүхээг 2", "Бүхээг 3", "Бүхээг 4"], fields: ["masthead", "tofrom", "note", "message"] },
};

export function renderSheet(el, order) {
  const t = TEMPLATES[order.template] || TEMPLATES.news;
  el.className = `sheet t-${order.template}`;
  el.innerHTML = t.render(order);
  const tx = order.tx?.[order.template] || {};
  el.querySelectorAll("[data-fr]").forEach((n) => {
    const v = tx["fr_" + n.dataset.fr];
    if (!v) return;
    if (v.dx || v.dy) n.style.translate = `${v.dx || 0}mm ${v.dy || 0}mm`;
    if (v.s && v.s !== 1) n.style.scale = v.s;
    if (v.r) n.style.rotate = `${v.r}deg`;
  });
  el.querySelectorAll("[data-tb]").forEach((n) => {
    const v = tx[n.dataset.tb];
    if (!v) return;
    if (v.dx || v.dy) n.style.translate = `${v.dx || 0}mm ${v.dy || 0}mm`;
    if (v.s && v.s !== 1) n.dataset.s = v.s;
  });
  fitAll(el);
}

export function fitAll(root) {
  root.querySelectorAll("[data-tb]:not(.fit):not(.fitw)").forEach((el) => {
    el.style.fontSize = "";
    const s = parseFloat(el.dataset.s) || 1;
    if (s !== 1) el.style.fontSize = parseFloat(getComputedStyle(el).fontSize) * s + "px";
  });
  root.querySelectorAll(".fitw").forEach((el) => {
    el.style.fontSize = "";
    let size = parseFloat(getComputedStyle(el).fontSize);
    let guard = 0;
    while (el.scrollWidth > el.clientWidth + 1 && size > 8 && guard++ < 80) {
      size *= 0.97;
      el.style.fontSize = size + "px";
    }
    const s = parseFloat(el.dataset.s) || 1;
    if (s !== 1) { el.style.fontSize = size * s + "px"; el.style.overflow = "visible"; }
  });
  root.querySelectorAll(".fit").forEach((el) => {
    let size = parseFloat(el.dataset.base) || 12;
    el.style.fontSize = size + "pt";
    let guard = 0;
    while (el.scrollHeight > el.clientHeight + 1 && size > 6 && guard++ < 60) {
      size -= 0.25;
      el.style.fontSize = size + "pt";
    }
    const s = parseFloat(el.dataset.s) || 1;
    if (s !== 1) { el.style.fontSize = size * s + "pt"; el.style.overflow = "visible"; }
  });
}
