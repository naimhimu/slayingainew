import pkg from "pg";
import { DateTime } from "luxon";
const { Pool } = pkg;

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export function todayInTz() {
  const tz = process.env.TIMEZONE || "Asia/Dhaka";
  return DateTime.now().setZone(tz).toISODate(); // YYYY-MM-DD
}

export async function getUsage(client, userId, usageDate) {
  const { rows } = await client.query(
    `select messages_used, uploads_used, call_seconds_used
     from daily_usage where user_id=$1 and usage_date=$2`,
    [userId, usageDate]
  );
  return rows[0] || { messages_used: 0, uploads_used: 0, call_seconds_used: 0 };
}

export async function incrUsage(client, userId, usageDate, delta) {
  await client.query(
    `insert into daily_usage (user_id, usage_date, messages_used, uploads_used, call_seconds_used)
     values ($1,$2,$3,$4,$5)
     on conflict (user_id, usage_date)
     do update set
       messages_used = daily_usage.messages_used + EXCLUDED.messages_used,
       uploads_used = daily_usage.uploads_used + EXCLUDED.uploads_used,
       call_seconds_used = daily_usage.call_seconds_used + EXCLUDED.call_seconds_used`,
    [
      userId,
      usageDate,
      delta.messages || 0,
      delta.uploads || 0,
      delta.callSeconds || 0,
    ]
  );
}

export async function getUsageToday(userId) {
  const client = await pool.connect();
  try {
    const usageDate = todayInTz();
    return await getUsage(client, userId, usageDate);
  } finally {
    client.release();
  }
}
