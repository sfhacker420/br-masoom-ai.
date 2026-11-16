
const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.GEMINI_API_KEY) {
    return json({ error: "GEMINI_API_KEY is missing." }, 503);
  }

  let body;

  try {
    const raw = await request.text();

    if (raw.length > 16000) {
      return json({ error: "Message is too long." }, 413);
    }

    body = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const message = typeof body.message === "string"
    ? body.message.trim().slice(0, 2000)
    : "";

  if (!message) {
    return json({ error: "Please enter a message." }, 400);
  }

  const system = typeof body.modePrompt === "string"
    ? body.modePrompt.slice(0, 1200)
    : "You are BR MASOOM AI, a helpful gaming assistant. Help with PUBG Mobile, Free Fire, sensitivity, recoil, weapons and gaming tips. Be clear and honest.";

  const history = Array.isArray(body.history)
    ? body.history.slice(-8).map(item => {
        const role = item?.role === "model" ? "Assistant" : "User";
        const text = Array.isArray(item?.parts)
          ? item.parts.map(p =>
              typeof p?.text === "string" ? p.text : ""
            ).join(" ").slice(0, 1500)
          : "";
        return text ? `${role}: ${text}` : "";
      }).filter(Boolean)
    : [];

  const conversation = [
    ...history,
    `User: ${message}`
  ].join("\n");

  try {
    const upstream = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          model: "gemini-3.8-flash",
          input: conversation,
          system_instruction: system,
          store: false,
          generation_config: {
            thinking_level: "low",
            max_output_tokens: 1200
          }
        })
      }
    );

    const rawResponse = await upstream.text();

    let result;
    try {
      result = JSON.parse(rawResponse);
    } catch {
      return json({
        error: "Gemini returned an invalid response. Please try again."
      }, 502);
    }

    if (!upstream.ok) {
      return json({
        error: result?.error?.message || "Gemini API request failed."
      }, 502);
    }

    const reply = (result.steps || [])
      .filter(step => step.type === "model_output")
      .flatMap(step => step.content || [])
      .filter(item => item.type === "text")
      .map(item => item.text || "")
      .join("\n")
      .trim();

    if (!reply) {
      return json({
        error: "AI returned an empty response. Please try again."
      }, 502);
    }

    return json({ reply });

  } catch (error) {
    return json({
      error: "Could not connect to Gemini. Please try again."
    }, 502);
  }
}
