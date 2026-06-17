-- MemoryAI Notifications + Web Push
-- Migration 003: in-app notification feed + device push subscriptions.
-- Powers the delivery engine that turns due reminders into real notifications.

-- Devices a user has opted in to receive Web Push on. One row per browser/device.
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  -- One subscription per endpoint per user; re-subscribing upserts instead of duplicating.
  UNIQUE (user_id, endpoint)
);

-- In-app notification feed (the bell). Survives whether or not the device was reachable by push.
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  memory_id uuid REFERENCES memories ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) <= 200),
  body text CHECK (char_length(body) <= 1000),
  type text NOT NULL DEFAULT 'reminder' CHECK (type IN ('reminder', 'digest', 'nudge', 'system')),
  url text,
  -- Which channels actually delivered this (e.g. {"inapp": true, "webpush": 2, "email": false}).
  channels jsonb NOT NULL DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions (user_id);
CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id) WHERE read_at IS NULL;

-- Row Level Security: users own their devices and their feed.
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_push_subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_own_notifications"
  ON notifications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
