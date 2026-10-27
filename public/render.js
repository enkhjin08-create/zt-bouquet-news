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
  party: "Хөөрхөн найздаа хорвоод мэндэлсэн өдрийн мэнд! Амьдрал чинь аз жаргал, зайрмагаар дүүрэн байг ♥",
  missed: "Энэ мөчийг би 5 сар хүлээсэн.\n\nХайр минь, бид эцэст нь уулзаж байна. Яг одоо чиний хажууд ичингүйрээд зогсож байгаа байх даа. Чамайг маш их санасан. Өдөр бүр чамтай уулзаж, чамайг харж, хажууд чинь байхыг хүсдэг байсан.\n\nМиний хамгийн том бэлэг нь чи. Хайртай шүү.",
  sport: "МИНИЙ ТАМИРЧИН\nЧи онооны самбар дээрх тоог хардаг бол би түүний ард байгаа хөдөлмөр, хөлс, хэзээ ч бууж өгдөггүй зоригийг чинь хардаг. Хэн ч харахгүй байхад давтсан бэлтгэл бүр чинь өнөөдрийн ялалт болсон.\n\nЧАМААРАА БАХАРХАЖ БАЙНА\nТалбай дээр гарах бүрт чинь зүрх минь чамтай хамт гүйдэг. Чи зөвхөн гайхалтай тамирчин биш, бүр гайхалтай хүн.\n\nМИНИЙ MVP\nОнооны самбар юу ч гэж харуулсан, чи надад үргэлж хамгийн шилдэг нь. Гэрэлтэж яваарай, од минь!",
  film: "Төрсөн өдрийн мэнд хүргэе, миний гоё найз аа!\nӨнөөдөр чи дэлхий дээр ирсэн өдөр учраас чамд хамгийн сайхан бүхнийг хүсье.\n\nҮргэлж ингэж гэрэлтэж, инээмсэглэж, мөрөөдөл бүртээ хүрээрэй. Чамтай хамт байсан мөч бүр минь хамгийн үнэтэй дурсамж.\n\nЧи бол үнэхээр мундаг, үнэнч найз минь. Насан туршдаа хамтдаа байцгаая!",
  bff: "Хайрт найздаа төрсөн өдрийн баярын мэнд! Чамтай өнгөрүүлсэн мөч бүр хамгийн сайхан дурсамж болдог. Ирэх жилүүдэд чи улам хөгжилтэй, аз жаргалтай байж, мөрөөдөл бүртээ хүрээрэй. Амьдрал чинь хайр, инээд хөөрөөр дүүрэн байх болтугай. Чамд хамгийн сайн сайхныг хүсэж байна.",
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

// ───────────── 5. Скрапбүүк (BFF) ─────────────
function torn(seed, edge, amp = 2.2, n = 46) {
  // edge: "top" | "bottom" — хуудасны өргөнөөр урагдсан ирмэгийн clip-path
  let r = seed;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * 100;
    const y = amp * (0.3 + rnd());
    pts.push(edge === "top" ? `${x}% ${y}mm` : `${x}% calc(100% - ${y}mm)`);
  }
  return edge === "top" ? `polygon(${pts.join(",")},100% 100%,0 100%)` : `polygon(0 0,100% 0,${pts.reverse().join(",")})`;
}
const NEWS_TXT = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. ";
const newsScrap = (cls, cols = 2) => `<div class="sc-news ${cls}" aria-hidden="true">${Array.from({ length: cols }, () => `<p>${NEWS_TXT.repeat(6)}</p>`).join("")}</div>`;
const starOutline = (cls) => `<svg class="${cls}" viewBox="0 0 100 95"><path d="M50 4l13 29 32 3-24 21 7 32-28-17-28 17 7-32L5 36l32-3z"/></svg>`;
const filmStrip = (cls) => `<div class="sc-film ${cls}" aria-hidden="true"><i></i><i></i><i></i><i></i></div>`;
function scrap(o) {
  const ph = o.photos || [];
  return `
  <section class="page sc-left">
    ${newsScrap("n1", 2)}${newsScrap("n2", 2)}${newsScrap("n3", 3)}
    <div class="sc-sticky"></div>
    ${filmStrip("fl1")}${filmStrip("fl2")}
    <div class="sc-vinyl"></div>
    ${starOutline("sc-star o1")}${starOutline("sc-star o2")}
    <svg class="sc-blackstar" viewBox="0 0 100 95"><path d="M50 2l10 30 33-6-23 24 18 30-30-13-12 28-6-31-32 6 22-24L13 18l32 10z"/></svg>
    <div class="sc-envelope"><div class="env-flap"></div></div>
    <div class="sc-card">
      <div class="sc-msg fit" data-base="17" data-tb="msg"><p>${or(o.message, SAMPLE.bff)} <span class="sc-heart">♥</span></p></div>
    </div>
    <div class="sc-top"><span>002</span></div>
  </section>
  <section class="page sc-right">
    <div class="sc-kraft top" style="clip-path:${torn(7, "bottom")}"></div>
    <h1 class="sc-mast fitw" data-tb="mast">${esc(o.masthead || "BIRTHDAY TIMES")}</h1>
    <div class="sc-dateline"><span>Зөвхөн түүнд, Улаанбаатар</span><span>${dateMn(o.date)}</span></div>
    <div class="sc-dots d1"></div><div class="sc-dots d2"></div>
    <figure class="sc-stamp" data-fr="stamp"><div class="sc-stamp-in">${photo(ph[0], "", 0)}</div></figure>
    <div class="sc-xoxo" data-tb="s1"><span>${esc(o.s1 || "XOXO")}</span></div>
    <div class="sc-bff" data-tb="s2"><span data-t="${esc(o.s2 || "BFF")}">${esc(o.s2 || "BFF")}</span></div>
    <span class="sc-x x1">✕</span><span class="sc-x x2">✕</span>
    <div class="sc-kraft bottom" style="clip-path:${torn(19, "top")}"></div>
  </section>`;
}

// ───────────── 6. Кино хальс ─────────────
const kiss = (cls) => `<svg class="kiss ${cls}" viewBox="0 0 120 70" aria-hidden="true"><path d="M4 30c14-10 28-22 40-20 7 1 12 6 16 6s9-5 16-6c12-2 26 10 40 20-14 4-22 26-56 30C26 56 18 34 4 30z"/><path class="ln" d="M10 31c16 2 32 6 50 6s34-4 50-6"/></svg>`;
const cherries = `<svg class="cherry" viewBox="0 0 120 130" aria-hidden="true"><path class="st" d="M62 6c-4 30-22 52-36 74M62 6c6 30 18 50 40 66"/><path class="lf" d="M62 8c16-10 34-6 40 4-16 6-30 4-40-4z"/><circle cx="28" cy="96" r="24"/><circle cx="96" cy="86" r="22"/><circle class="hl" cx="20" cy="88" r="5"/><circle class="hl" cx="89" cy="79" r="4"/></svg>`;
const disco = (cls) => `<div class="disco ${cls}" aria-hidden="true"></div>`;
const reel = (ph, idx, cls) => `<div class="reel ${cls}" data-fr="${cls}">${idx.map((i) => `<div class="reel-cell">${photo(ph[i], "", i)}</div>`).join("")}</div>`;
function ransom(word) {
  const st = ["r1", "r2", "r3", "r4", "r5"];
  return [...(word || "BFF")].map((ch, i) => (ch === " " ? `<i class="sp"></i>` : `<b class="${st[i % st.length]}">${esc(ch)}</b>`)).join("");
}
function filmTpl(o) {
  const ph = o.photos || [];
  return `
  <section class="page fm-left">
    <div class="fm-top"><span>002</span></div>
    ${cherries}
    ${disco("d1")}${disco("d2")}
    ${reel(ph, [0, 1], "rl")}
    <span class="tape-label t1" data-tb="l1">${esc(o.l1 || "cutiepie")}</span>
    ${kiss("k1")}
    <div class="fm-bottom"></div>
  </section>
  <section class="page fm-right">
    <div class="fm-top r"><span>№ ${esc(o.id || "0247")}</span></div>
    <h1 class="fm-mast fitw" data-tb="mast">${esc(o.masthead || "BIRTHDAY TIMES")}</h1>
    <div class="fm-dateline"><span>Зөвхөн түүнд, Улаанбаатар</span><span>${dateMn(o.date)}</span></div>
    <div class="fm-msg fit" data-base="15" data-tb="msg"><p>${or(o.message, SAMPLE.film)}</p></div>
    <div class="ransom" data-tb="s2">${ransom(o.s2 || "BFF")}</div>
    <span class="tape-label t2" data-tb="l2">${esc(o.l2 || "best friends")}</span>
    <span class="tape-label t3" data-tb="l3">${esc(o.l3 || "forever")}</span>
    ${reel(ph, [2, 3], "rr")}
    ${kiss("k2")}
    <span class="fm-xoxo" data-tb="s1">${esc(o.s1 || "XOXO")}</span>
    <div class="fm-bottom"></div>
  </section>`;
}

// ───────────── 7. Спорт (сагсан бөмбөг) ─────────────
const bball = (cls) => `<svg class="bball ${cls}" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="#e06a1f"/><circle cx="62" cy="62" r="40" fill="#b9520f" opacity=".35"/><circle cx="34" cy="30" r="14" fill="#f8b277" opacity=".55"/><g fill="none" stroke="#3a1a08" stroke-width="2.6"><path d="M2 50h96M50 2v96"/><path d="M16 16c14 12 14 56 0 68M84 16c-14 12-14 56 0 68"/></g></svg>`;
const doodle = {
  hoop: `<svg class="doodle hoop" viewBox="0 0 120 120" aria-hidden="true"><path d="M30 10h60v34H30z"/><path d="M48 24h24v20H48z"/><ellipse cx="60" cy="50" rx="26" ry="6"/><path d="M36 52l8 46M48 55l4 44M60 56v44M72 55l-4 44M84 52l-8 46M38 64h44M41 78h38M44 92h32"/></svg>`,
  ball: `<svg class="doodle dball" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44"/><path d="M6 50h88M50 6v88M20 18c14 14 14 50 0 64M80 18c-14 14-14 50 0 64"/></svg>`,
  trophy: `<svg class="doodle trophy" viewBox="0 0 100 130" aria-hidden="true"><path d="M26 10h48v26c0 18-10 30-24 30S26 54 26 36z"/><path d="M26 18H12c0 18 8 26 16 26M74 18h14c0 18-8 26-16 26"/><path d="M42 66v18h16V66M30 84h40v12H30zM24 96h52v14H24z"/><path d="M50 26l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z"/></svg>`,
};
function bodyLines(text) {
  return esc(text).split("\n").map((l) => {
    const t = l.trim();
    if (!t) return `<span class="gap"></span>`;
    const letters = t.replace(/[^A-Za-zА-Яа-яЁёӨөҮү]/g, "");
    return letters.length > 2 && letters === letters.toUpperCase() ? `<b>${t}</b>` : `<span>${t}</span>`;
  }).join("");
}
function sport(o) {
  const ph = o.photos || [];
  const body = o.message && o.message.trim() ? bodyLines(o.message) : `<span class="ghost">${bodyLines(SAMPLE.sport)}</span>`;
  return `
  <section class="page sp-left">
    <div class="court"></div>
    <div class="sp-top"><span>002</span></div>
    ${doodle.hoop}
    <figure class="sp-poster" data-fr="poster">${photo(ph[0], "", 0)}</figure>
    <div class="sp-balls">${bball("b1")}${bball("b2")}${bball("b3")}</div>
    ${doodle.ball.replace('class="doodle dball"', 'class="doodle dball l"')}
    ${doodle.trophy}
    <div class="sp-bottom"></div>
  </section>
  <section class="page sp-right">
    <div class="court r"></div>
    <div class="sp-top r"><span>№ ${esc(o.id || "0247")}</span></div>
    <h1 class="sp-mast fit" data-base="40" data-tb="mast"><span>${esc(o.masthead || "BIRTHDAY TIMES")}</span></h1>
    <div class="sp-dateline"><span>Зөвхөн түүнд, Улаанбаатар</span><span>${dateMn(o.date)}</span></div>
    <div class="sp-body fit" data-base="10.5" data-tb="body">${body}</div>
    <figure class="sp-pol p1" data-fr="sp1">${photo(ph[1], "", 1)}</figure>
    <span class="sp-cap" data-tb="l1">${esc(o.l1 || "MY MVP")}</span>
    <figure class="sp-pol p2" data-fr="sp2">${photo(ph[2], "", 2)}</figure>
    <span class="sp-num" data-tb="s1">${esc(o.s1 || "#44")}</span>
    ${doodle.ball}
    <div class="sp-bottom"></div>
  </section>`;
}

// ───────────── 8. Хальсан захидал ─────────────
const negEdge = (side) => `<div class="neg-edge ${side}" aria-hidden="true"><span>FILM 135</span><span>7</span><span class="k">▮▯▮ ▯▮▯</span><span>100</span><span class="k">▯▮▮ ▮▯▮</span><span>6A</span><span>FILM 135</span></div>`;
const heartMail = `<svg class="heartmail" viewBox="0 0 120 70" aria-hidden="true"><path d="M4 22h34M2 32h36M6 42h30"/><path d="M68 62C50 48 44 36 48 24c3-10 16-12 22-2 6-10 20-8 22 2 3 12-4 24-24 38z"/><path d="M58 30c2-4 6-5 9-3"/></svg>`;
function missed(o) {
  const ph = o.photos || [];
  return `
  <section class="page ms-left">
    <div class="crease"></div>
    <div class="ms-top"><span>002</span></div>
    <div class="negative" data-fr="neg">
      ${negEdge("l")}
      <div class="neg-frames"><div class="neg-cell a">${photo(ph[0], "", 0)}</div><div class="neg-cell b">${photo(ph[1], "", 1)}</div></div>
      ${negEdge("r")}
    </div>
    <div class="ms-bottom"></div>
  </section>
  <section class="page ms-right">
    <div class="crease r"></div>
    <div class="ms-top r"><span>№ ${esc(o.id || "0247")}</span></div>
    <h1 class="ms-mast fitw" data-tb="mast">${esc(o.masthead || "MISSED YOU")}</h1>
    <div class="ms-dateline"><span>Зөвхөн түүнд, Улаанбаатар</span><span>${dateMn(o.date)}</span></div>
    <div class="ms-msg fit" data-base="21" data-tb="msg"><p>${or(o.message, SAMPLE.missed)}</p></div>
    ${heartMail}
    <div class="ms-bottom"></div>
  </section>`;
}

// ───────────── 9. Улаан үдэшлэг ─────────────
function wavyRect(x, y, w, h, amp = 3, per = 15) {
  // Долгионтой тэгш өнцөгт (мм), SVG path
  const pts = [];
  const edge = (x1, y1, x2, y2, nx, ny) => {
    const len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(2, Math.round(len / per * 16));
    for (let i = 0; i < n; i++) {
      const t = i / n, s = Math.sin((t * len / per) * Math.PI * 2) * amp;
      pts.push(`${(x1 + (x2 - x1) * t + nx * s).toFixed(2)},${(y1 + (y2 - y1) * t + ny * s).toFixed(2)}`);
    }
  };
  edge(x, y, x + w, y, 0, 1); edge(x + w, y, x + w, y + h, 1, 0); edge(x + w, y + h, x, y + h, 0, 1); edge(x, y + h, x, y, 1, 0);
  return `<svg class="wavy-frame" viewBox="0 0 210 297" preserveAspectRatio="none" aria-hidden="true"><polygon points="${pts.join(" ")}"/></svg>`;
}
const starSvg = (cls, fill) => `<svg class="pstar ${cls}" viewBox="0 0 100 95" aria-hidden="true"><path fill="${fill}" stroke="#fff" stroke-width="4" stroke-linejoin="round" d="M50 4l13 29 32 3-24 21 7 32-28-17-28 17 7-32L5 36l32-3z"/></svg>`;
const wine = (cls) => `<svg class="wine ${cls}" viewBox="0 0 60 130" aria-hidden="true"><path d="M8 6h44c2 30-6 52-22 54C14 58 6 36 8 6z" fill="#d9d9d9" stroke="#fff" stroke-width="3"/><path d="M10 26h40c-1 20-8 30-20 31-12-1-19-11-20-31z" fill="#7d7d7d"/><path d="M30 60v52M14 120c8-6 24-6 32 0" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M30 60v52M14 120c8-6 24-6 32 0" stroke="#bdbdbd" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="44" cy="6" r="5" fill="#111"/></svg>`;
const shades = (cls) => `<svg class="shades ${cls}" viewBox="0 0 120 50" aria-hidden="true"><path d="M8 12c10-10 24-8 26 4 2-12 16-14 26-4 4 16-8 30-26 36C16 42 4 28 8 12z" fill="#111" stroke="#fff" stroke-width="3"/><path d="M60 12c10-10 24-8 26 4 2-12 16-14 26-4 4 16-8 30-26 36-18-6-30-20-26-36z" fill="#111" stroke="#fff" stroke-width="3"/><path d="M50 20h22" stroke="#fff" stroke-width="3"/></svg>`;
function party(o) {
  const ph = o.photos || [];
  const words = (o.s1 || "happy Birthday").split(/\s+/).slice(0, 3);
  return `
  <section class="page pt-left">
    ${wavyRect(14, 16, 182, 266)}
    ${disco("pd")}
    ${wine("w1")}
    ${starSvg("s1", "#c9c9c9")}${starSvg("s2", "#d42a35")}${starSvg("s3", "#c9c9c9")}${starSvg("s4", "#1b1918")}${starSvg("s5", "#d42a35")}${starSvg("s6", "#bdbdbd")}
    <div class="pt-msg fit" data-base="15" data-tb="msg"><p>${or(o.message, SAMPLE.party)}</p></div>
    <figure class="pt-pol a" data-fr="pa"><i class="pt-tape"></i>${photo(ph[0], "", 0)}</figure>
    ${shades("g1")}
    <div class="pt-bottom"></div>
  </section>
  <section class="page pt-right">
    ${wavyRect(14, 16, 182, 266)}
    <div class="pt-top"><span>№ ${esc(o.id || "0247")}</span></div>
    <h1 class="pt-mast fitw" data-tb="mast">${esc(o.masthead || "BIRTHDAY TIMES")}</h1>
    <div class="pt-dateline"><span>Зөвхөн түүнд, Улаанбаатар</span><span>${dateMn(o.date)}</span></div>
    <div class="pt-ransom" data-tb="s1">${words.map((w) => `<div class="ransom">${ransom(w)}</div>`).join("")}</div>
    ${starSvg("s7", "#d42a35")}${starSvg("s8", "#bdbdbd")}${starSvg("s9", "#c9c9c9")}${starSvg("s10", "#1b1918")}${starSvg("s11", "#d42a35")}${starSvg("s12", "#c9c9c9")}
    <figure class="pt-pol b" data-fr="pb"><i class="pt-tape"></i>${photo(ph[1], "", 1)}<figcaption data-tb="l1">${esc(o.l1 || "Love you!")}</figcaption></figure>
    ${shades("g2")}${wine("w2")}
    <div class="pt-bottom"></div>
  </section>`;
}

// ───────────── 10. Энгийн мэндчилгээ (зөвхөн үг, хямд) ─────────────
function tulip(o) {
  return `
  <section class="page tu-left">
    <div class="tu-bg"></div>
    <div class="tu-top"><span>002</span></div>
    <div class="tu-bottom"></div>
  </section>
  <section class="page tu-right">
    <div class="tu-bg flip"></div>
    <div class="tu-top r"><span>№ ${esc(o.id || "0247")}</span></div>
    <h1 class="tu-mast fitw" data-tb="mast">${esc(o.masthead || "ХҮНДЭТ БАГШДАА")}</h1>
    <div class="tu-dateline"><span>Зөвхөн түүнд, Улаанбаатар</span><span>${dateMn(o.date)}</span></div>
    <div class="tu-msg fit" data-base="48" data-tb="msg"><p>${or(o.message, "Багш нарын\nбаярын мэнд хүргэе!")}</p></div>
    <div class="tu-bottom"></div>
  </section>`;
}

export const MASTHEADS = ["BIRTHDAY TIMES", "ХҮНДЭТ БАГШДАА", "MISSED YOU", "ВАЛЕНТИНЫ МЭДЭЭ", "БАЯРЫН МЭДЭЭ", "ЭЭЖИЙН МЭДЭЭ", "НАЙЗЫН МЭДЭЭ"];

export const CHEAP_TEMPLATES = ["tulip"];
export const TEMPLATES = {
  tulip: { label: "Энгийн мэндчилгээ", cheap: true, render: tulip, photos: [], fields: ["masthead", "message"] },
  letter: { label: "Захидал сонин", render: letter, photos: ["Том зураг (зүүн нүүр)", "Фото бүхээг 1", "Фото бүхээг 2", "Фото бүхээг 3"], fields: ["name", "masthead", "headline", "message", "captions"] },
  news: { label: "Хар цагаан сонин", render: news, photos: ["Гол зураг (баруун нүүр)", "Зураг 2", "Зураг 3", "Зураг 4"], fields: ["name", "edition", "masthead", "qa", "message", "captions"] },
  polaroid: { label: "Ягаан polaroid", render: polaroid, photos: ["Гол зураг (баруун нүүр)", "Зураг 2", "Зураг 3", "Зураг 4"], fields: ["name", "masthead", "message", "wishes", "captions"] },
  party: { label: "Улаан үдэшлэг", render: party, photos: ["Зүүн polaroid", "Баруун polaroid"], fields: ["masthead", "message", "partylabels"] },
  missed: { label: "Хальсан захидал", render: missed, photos: ["Хальсны дээд зураг", "Хальсны доод том зураг"], fields: ["masthead", "message"] },
  sport: { label: "Спорт", render: sport, photos: ["Том постер зураг (зүүн нүүр)", "Баруун зураг 1", "Баруун зураг 2"], fields: ["masthead", "message", "sportlabels"] },
  film: { label: "Кино хальс", render: filmTpl, photos: ["Зүүн хальс 1", "Зүүн хальс 2", "Баруун хальс 1", "Баруун хальс 2"], fields: ["masthead", "message", "labels", "stickers"] },
  scrap: { label: "Скрапбүүк", render: scrap, photos: ["Гол зураг (маркан хүрээ)"], fields: ["masthead", "message", "stickers"] },
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
    if (v.c) { n.style.setProperty("--tc", v.c); n.classList.add("tc"); }
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
