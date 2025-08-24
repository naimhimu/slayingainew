-- Enable pgcrypto for gen_random_uuid if needed
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  plan text NOT NULL DEFAULT 'free',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_usage (
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  messages_used int NOT NULL DEFAULT 0,
  uploads_used int NOT NULL DEFAULT 0,
  call_seconds_used int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date)
);
