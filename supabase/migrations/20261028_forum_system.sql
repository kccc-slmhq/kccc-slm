-- Forum admin system tables and columns
-- Run this in Supabase SQL editor

-- Add columns to forum_registrations
ALTER TABLE forum_registrations
  ADD COLUMN IF NOT EXISTS fee_paid boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS attended boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS room_number text,
  ADD COLUMN IF NOT EXISTS key_taken boolean DEFAULT false;

-- Forum settings (key-value store)
CREATE TABLE IF NOT EXISTS forum_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz DEFAULT now()
);

-- Meal orders
CREATE TABLE IF NOT EXISTS meal_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  menu_item text NOT NULL,
  created_at timestamptz DEFAULT now()
);
