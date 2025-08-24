import "dotenv/config";
import express from "express";
import cors from "cors";
import { quotaMessage, quotaUpload, quotaCallAddSeconds, requireAuth } from "./quota-mw.js";
import { GroqProvider } from "./providers/groq.js";
import { planQuotas } from "./quota.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Demo auth stub: replace with real auth later
app.use((req, _res, next) => {
  // Expect client to pass headers for demo; in production, use JWT/session
  req.user = {
    id: req.header("x-user-id") || "demo-user-id",
    plan: (req.header("x-user-plan") || "free").toLowerCase()
  };
  next();
});

app.get("/healthz", (_req, res) => res.json({ ok: true }));

// Expose today's quotas & usage (so your UI can show progress bars)
app.get("/v1/quotas", async (req, res) => {
  try {
    const quotas = planQuotas(req.user.plan || "free");
    // Lazy import to avoid circular
    const { getUsageToday } = await import("./usage.js");
    const usage = await getUsageToday(req.user.id);
    res.json({ plan: req.user.plan, quotas, usage });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// Chat completions (streams SSE tokens from Groq)
app.post("/v1/chat/completions", requireAuth, quotaMessage(), async (req, res) => {
  const messages = req.body?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages required" });
  }

  // SSE headers
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  res.write(`event: open\ndata: {}\n\n`);

  const provider = new GroqProvider();

  try {
    for await (const token of provider.stream(messages)) {
      res.write(`data: ${JSON.stringify(token)}\n\n`);
    }
    res.write("data: [DONE]\n\n");
  } catch (e) {
    res.write(`event: error\ndata: ${JSON.stringify(String(e.message || e))}\n\n`);
  } finally {
    res.end();
  }
});

// Upload counter demo endpoint (your real upload handler goes here)
app.post("/v1/upload", requireAuth, quotaUpload(), async (req, res) => {
  // Simulate accepting a doc/image
  res.json({ ok: true });
});

// Voice calling usage endpoint: call this when a call ends (send elapsed seconds)
app.post("/v1/call/end", requireAuth, async (req, res) => {
  const seconds = Number(req.body?.seconds || 0);
  try {
    await quotaCallAddSeconds(req.user, seconds);
    res.json({ ok: true });
  } catch (e) {
    res.status(429).json({ error: String(e.message || e) });
  }
});

// Simple web test page
app.get("/", (_req, res) =>
  res.type("html").send(`
  <h2>slayingAI (Groq) — SSE demo</h2>
  <form onsubmit="send(event)">
    <textarea id="q" rows="4" cols="60">Say hi in five words.</textarea><br/>
    <button>Send</button>
  </form>
  <pre id="out" style="white-space:pre-wrap;border:1px solid #ccc;padding:8px;"></pre>
  <script>
    async function send(e){
      e.preventDefault();
      const q = document.getElementById('q').value;
      const resp = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: {'Content-Type':'application/json', 'x-user-id': 'demo', 'x-user-plan': 'free'},
        body: JSON.stringify({messages:[{role:'user',content:q}]})
      });
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let text = "";
      while(true){
        const {value, done} = await reader.read();
        if(done) break;
        const chunk = dec.decode(value);
        chunk.split("\\n").forEach(line=>{
          if(line.startsWith("data: ")){
            const payload = line.slice(6);
            if(payload === "[DONE]") return;
            try { text += JSON.parse(payload); } catch {}
            document.getElementById('out').textContent = text;
          }
        });
      }
    }
  </script>
`)
);

const port = process.env.PORT || 8000;
app.listen(port, () => console.log("Listening on " + port));
