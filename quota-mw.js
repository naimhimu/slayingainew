import { planQuotas } from "./quota.js";
import { pool, todayInTz, getUsage, incrUsage } from "./usage.js";

export function requireAuth(_req, res, next) {
  // Placeholder: real auth should set req.user
  next();
}

async function withPg(fn) {
  const client = await pool.connect();
  try { return await fn(client); } finally { client.release(); }
}

export function quotaMessage() {
  return async (req, res, next) => {
    const { id: userId, plan = "free" } = req.user || {};
    if (!userId) return res.status(401).json({ error: "unauthorized" });
    const usageDate = todayInTz();
    await withPg(async (client) => {
      const quotas = planQuotas(plan);
      const usage = await getUsage(client, userId, usageDate);
      if (usage.messages_used >= quotas.messages) {
        return res.status(429).json({ error: "message quota exceeded for today" });
      }
      await incrUsage(client, userId, usageDate, { messages: 1 });
      next();
    });
  };
}

export function quotaUpload() {
  return async (req, res, next) => {
    const { id: userId, plan = "free" } = req.user || {};
    if (!userId) return res.status(401).json({ error: "unauthorized" });
    const usageDate = todayInTz();
    await withPg(async (client) => {
      const quotas = planQuotas(plan);
      const usage = await getUsage(client, userId, usageDate);
      if (usage.uploads_used >= quotas.uploads) {
        return res.status(429).json({ error: "upload quota exceeded for today" });
      }
      await incrUsage(client, userId, usageDate, { uploads: 1 });
      next();
    });
  };
}

export async function quotaCallAddSeconds(user, seconds) {
  const usageDate = todayInTz();
  const { id: userId, plan = "free" } = user || {};
  if (!userId) throw new Error("unauthorized");
  const client = await pool.connect();
  try {
    const quotas = planQuotas(plan);
    const usage = await getUsage(client, userId, usageDate);
    if (usage.call_seconds_used + seconds > quotas.callSeconds) {
      const remaining = Math.max(0, quotas.callSeconds - usage.call_seconds_used);
      if (remaining <= 0) throw new Error("call quota exceeded for today");
      await incrUsage(client, userId, usageDate, { callSeconds: remaining });
      throw new Error("call quota reached during this call");
    }
    await incrUsage(client, userId, usageDate, { callSeconds: seconds });
  } finally {
    client.release();
  }
}
