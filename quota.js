export const TIMEZONE = process.env.TIMEZONE || "Asia/Dhaka";
export const FREE = { messages: 20, uploads: 5, callSeconds: 15 * 60 };
export const PREMIUM = { messages: 150, uploads: 50, callSeconds: 5 * 60 * 60 };

export function planQuotas(plan) {
  return plan === "premium" ? PREMIUM : FREE;
}
