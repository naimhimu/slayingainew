import { ChatProvider } from "./base.js";

export class GroqProvider extends ChatProvider {
  constructor(opts = {}) {
    super();
    this.apiKey  = opts.apiKey  || process.env.GROQ_API_KEY;
    this.model   = opts.model   || process.env.GROQ_MODEL || "llama-3.1-70b-versatile";
    this.baseUrl = opts.baseUrl || "https://api.groq.com/openai/v1"; // OpenAI-compatible path
    if (!this.apiKey) throw new Error("Missing GROQ_API_KEY");
  }

  async *stream(messages) {
    const resp = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model: this.model, messages, stream: true })
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Groq error ${resp.status}: ${text}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf("\n\n")) >= 0) {
        const chunk = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") return;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content ?? "";
            if (delta) yield delta;
          } catch {}
        }
      }
    }
  }
}
