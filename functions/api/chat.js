
const corsHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.GEMINI_API_KEY) {
    return json({
      error: "GEMINI_API_KEY is missing. Check Cloudflare Pages settings."
    }, 503);
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
    : "You are BR MASOOM AI, a helpful gaming assistant. Help users with PUBG Mobile, Free Fire, sensitivity settings, recoil control, weapons, maps, gaming tips and strategies. Give clear and practical answers. Be friendly and honest.";

  const history = Array.isArray(body.history)
    ? body.history.slice(-8).map(item => {
        const role = item?.role === "model" ? "Assistant" : "User";

        const text = Array.isArray(item?.parts)
          ? item.parts.map(part =>
              typeof part?.text === "string" ? part.text : ""
            ).join(" ").slice(0, 1500)
          : "";

        return text ? `${role}: ${text}` : "";
      }).filter(Boolean)
    : [];

  if (history[history.length - 1] !== `User: ${message}`) {
    history.push(`User: ${message}`);
  }

  const conversation = history.join("\n");

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
          model: "gemini-3.5-flash-lite",
          input: conversation,
          system_instruction: system,
          store: false
        })
      }
    );

    const rawResponse = await upstream.text();

    let result;

    try {
      result = JSON.parse(rawResponse);
    } catch {
      return json({
        error: "Gemini returned an invalid response."
      }, 502);
    }

    if (!upstream.ok) {
      const detail = result?.error?.message ||
        "Gemini API request failed.";

      return json({
        error: detail.slice(0, 400)
      }, 502);
    }

    let reply = result?.output_text || "";

    if (!reply && Array.isArray(result?.steps)) {
      reply = result.steps
        .filter(step => step.type === "model_output")
        .flatMap(step => step.content || [])
        .filter(item => item.type === "text")
        .map(item => item.text || "")
        .join("\n");
    }

    reply = reply.trim();

    if (!reply) {
      return json({
        error: "AI returned an empty response. Please try again."
      }, 502);
    }

    return json({ reply });

  } catch {
    return json({
      error: "Could not connect to Gemini. Please try again later."
    }, 502);
  }
}
