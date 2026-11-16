const corsHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

export async function onRequestPost({ request, env }) {
  if (!env.GEMINI_API_KEY) {
    return json({ error: "AI is not connected yet. Add GEMINI_API_KEY in Cloudflare Pages > Settings > Variables and Secrets." }, 503);
  }

  let body;
  try {
    const raw = await request.text();
    if (raw.length > 16000) return json({ error: "Message is too long. Please shorten it." }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
  if (!message) return json({ error: "Please enter a message." }, 400);

  const safeHistory = Array.isArray(body.history) ? body.history.slice(-8).map(item => {
    const role = item?.role === "model" ? "model" : "user";
    const text = Array.isArray(item?.parts) ? item.parts.map(p => typeof p?.text === "string" ? p.text : "").join(" ").slice(0, 2000) : "";
    return text ? { role, parts: [{ text }] } : null;
  }).filter(Boolean) : [];

  const system = typeof body.modePrompt === "string"
    ? body.modePrompt.slice(0, 1200)
    : "You are BR MASOOM AI, a helpful gaming assistant. Focus on PUBG Mobile and other games. Be clear, practical and honest about uncertainty.";

  const contents = safeHistory;
  // Ensure the current user message is the final turn exactly once.
  if (!contents.length || contents[contents.length - 1].role !== "user" || contents[contents.length - 1].parts[0].text !== message) {
    contents.push({ role: "user", parts: [{ text: message }] });
  }

  const model = env.GEMINI_MODEL || "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 650 }
      })
    });
    const result = await upstream.json();
    if (!upstream.ok) {
      const detail = result?.error?.message || "Gemini API request failed.";
      return json({ error: detail.slice(0, 350) }, upstream.status === 429 ? 429 : 502);
    }
    const reply = (result?.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("\n").trim();
    if (!reply) return json({ error: "The AI returned an empty response. Please try again." }, 502);
    return json({ reply });
  } catch {
    return json({ error: "Could not connect to the AI service. Please try again later." }, 502);
  }
}
