# slayingAI — Groq backend (Node + Express)

Ready-to-deploy backend with:
- SSE streaming chat via Groq (`/v1/chat/completions`)
- Daily quotas per signed-in user (messages, uploads, voice seconds)
- Dockerfile for Render/Railway/Fly
- Health check (`/healthz`)

## Quick start (local)

```bash
npm install
cp .env.example .env
# set GROQ_API_KEY and DATABASE_URL (if you want quotas to persist)
npm run dev
# open http://localhost:8000/
```

## Deploy (Render)
- Create a **Web Service** from this repo, enable **Use Docker**.
- Set env vars:
  - `PROVIDER=groq`
  - `GROQ_API_KEY=...`
  - `TIMEZONE=Asia/Dhaka`
  - `DATABASE_URL=...` (Render Postgres free or Neon)
- Deploy.

## Database schema
Run `schema.sql` on your Postgres once.

## Quotas (per day, timezone-based)
- Free: 20 messages, 5 uploads, 15 minutes calls
- Premium: 150 messages, 50 uploads, 5 hours calls

Use headers in dev (replace with real auth later):
- `x-user-id: <uuid-or-id>`
- `x-user-plan: free|premium`
