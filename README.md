# BR MASOOM AI — Gaming Assistant

A static gaming-style website with a PUBG/Free Fire AI chat assistant and a local sensitivity preset builder.

## Files

- `index.html` — complete responsive UI, chat client and local sensitivity builder.
- `functions/api/chat.js` — Cloudflare Pages Function. Calls Gemini from the server so the API key is not exposed in browser code.

## 1. Get a Gemini API key

1. Open https://aistudio.google.com/app/apikey
2. Sign in and create an API key for a project that has Gemini API access.
3. Keep the key private. Do not paste it into `index.html`, GitHub, or a public chat.
4. Check the model and free-tier limits available to your account at https://ai.google.dev/gemini-api/docs/pricing and https://ai.google.dev/gemini-api/docs/rate-limits.

The default model is `gemini-2.5-flash`. If that model is not available in your account, set the `GEMINI_MODEL` variable in Cloudflare to a model name that your AI Studio project can use.

## 2. Upload to GitHub

1. Create a repository at https://github.com/new (for example `br-masoom-ai`).
2. Upload the `index.html`, `README.md`, and the complete `functions` folder, keeping the same folder structure.
3. Make sure `functions/api/chat.js` is inside the `functions/api` folder at the repository root.

## 3. Deploy free with Cloudflare Pages

1. Sign in at https://dash.cloudflare.com/ and open **Workers & Pages**.
2. Choose **Create application** → **Pages** → **Connect to Git**.
3. Select your GitHub repository.
4. For a plain HTML project, use build command `exit 0` and build output directory `.` (the repository root). Do not set a framework preset.
5. Deploy. Cloudflare gives the project a `*.pages.dev` address.

## 4. Add the secret API key

1. In Cloudflare, open your Pages project.
2. Go to **Settings** → **Variables and Secrets** → **Add**.
3. Name: `GEMINI_API_KEY`
4. Value: paste your Gemini API key.
5. Choose **Encrypt** / secret, then save.
6. Optional: add a plain variable named `GEMINI_MODEL` with value `gemini-2.5-flash` (only change this if your account has a different model available).
7. Trigger a new deployment after adding the secret (for example, make a tiny README edit and push it, or use Retry deployment).

## 5. Test

Open your `pages.dev` URL, send a message in the AI chat, and try the sensitivity builder. If the AI says the key is missing, confirm the secret is saved on the correct Pages project and redeploy. If you receive a 429 error, you have reached the API quota/rate limit; wait for it to reset or check AI Studio.

## Important notes

- The sensitivity builder is a simple local preset calculator, not a live PUBG API and not a guarantee of zero recoil. Test and tune values in Training Ground.
- Gemini free-tier availability and quotas vary by model, project and region and can change. Google may process free-tier prompts under its free-tier data terms; do not send private or sensitive information.
- This is a public website. Anyone who discovers the URL may be able to use the chat endpoint and consume your API quota. This starter has basic input-size limits but no account login or robust abuse protection. Use it for a small personal/demo launch first; add authentication and rate limiting before promoting it widely.
- Do not commit API keys to GitHub or put them in browser JavaScript.
- BR MASOOM AI is an unofficial fan-made project and is not affiliated with PUBG MOBILE, KRAFTON, Tencent or Garena.
