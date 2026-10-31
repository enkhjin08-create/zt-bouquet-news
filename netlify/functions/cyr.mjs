import { json } from "./_shared/lib.mjs";

// POST /api/cyr { text } → { text } — латинаар бичсэн монгол үгийг кирилл болгоно (AI)
// ANTHROPIC_API_KEY эсвэл GEMINI_API_KEY Netlify дээр тохируулсан байх ёстой; байхгүй бол 501 буцааж,
// хөтөч өөрөө энгийн дүрмээр хөрвүүлнэ.
const PROMPT = `Та монгол хэлний редактор. Доорх текстийг латин үсгээр (чат маягаар) бичсэн монгол хэлнээс зөв монгол кирилл бичиг рүү хөрвүүл.
Дүрэм:
- Утга, үг, өгүүлбэрийн дарааллыг өөрчлөхгүй; шинэ үг, emoji нэмэхгүй.
- Зөв бичгийн алдааг засна (ө/ү, э/е, ы/ий, үсэг орхисон гэх мэт), цэг таслалыг зөв тавина.
- Emoji, тоо, мөр шилжилтийг яг хэвээр нь үлдээнэ.
- Англи хэл дээрх үг, хэллэг (жишээ нь Happy birthday, I love you) болон хүний нэрийг латинаар нь үлдээж болно.
- Аль хэдийн кириллээр бичсэн хэсгийг өөрчлөхгүй.
Зөвхөн хөрвүүлсэн текстийг буцаа, тайлбар бүү бич.

Текст:
`;

const hits = new Map(); // IP → [timestamps] — энгийн хязгаар
function limited(ip) {
  const now = Date.now(), arr = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  arr.push(now); hits.set(ip, arr);
  return arr.length > 30;
}

async function viaClaude(key, text) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: Netlify.env.get("CYR_MODEL") || "claude-haiku-5-5", max_tokens: 4000, messages: [{ role: "user", content: PROMPT + text }] }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || "AI алдаа");
  return (j.content || []).map((c) => c.text || "").join("").trim();
}
async function viaGemini(key, text) {
  const model = Netlify.env.get("CYR_GEMINI_MODEL") || "gemini-2.5-flash";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: PROMPT + text }] }], generationConfig: { temperature: 0.2 } }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || "AI алдаа");
  return (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
}

export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "Not found" }, 404);
  const claude = Netlify.env.get("ANTHROPIC_API_KEY"), gemini = Netlify.env.get("GEMINI_API_KEY");
  if (!claude && !gemini) return json({ error: "AI тохируулаагүй", fallback: true }, 501);
  if (limited(context.ip || "x")) return json({ error: "Түр хүлээгээд дахин оролдоно уу.", fallback: true }, 429);
  try {
    const { text } = await req.json();
    const t = String(text || "").slice(0, 3000);
    if (!t.trim()) return json({ text: "" });
    const out = claude ? await viaClaude(claude, t) : await viaGemini(gemini, t);
    if (!out) throw new Error("Хоосон хариу");
    return json({ text: out });
  } catch (e) {
    return json({ error: e.message || "Алдаа", fallback: true }, 502);
  }
};

export const config = { path: "/api/cyr" };
