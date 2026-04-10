-- Schema for Mini-CRM DB (Supabase/Postgres)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";

-- specialists table
CREATE TABLE specialists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text,
  full_name text NOT NULL,
  timezone text DEFAULT 'Europe/Moscow',
  created_at timestamptz DEFAULT now()
);

-- clients table
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id uuid NOT NULL REFERENCES specialists(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  contact_channel text NOT NULL CHECK (contact_channel IN ('telegram','email','phone','other')),
  contact_value text NOT NULL,
  status text NOT NULL CHECK (status IN ('new','active','paused','closed')),
  source text NOT NULL CHECK (source IN ('manual','mental_helper','other')),
  created_at timestamptz DEFAULT now()
);

-- sessions table
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  start_time timestamptz,
  duration_minutes integer DEFAULT 60,
  format text CHECK (format IN ('online','offline')),
  status text CHECK (status IN ('scheduled','done','no_show','cancelled')),
  short_summary text,
  price numeric(12,2),
  is_paid boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- leads table
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id uuid NOT NULL REFERENCES specialists(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id),
  campaign_id uuid,
  mh_segment_code text,
  contact_channel text NOT NULL CHECK (contact_channel IN ('telegram','email','in_app','other')),
  contact_value text NOT NULL,
  status text NOT NULL CHECK (status IN ('new','contacted','booked','no_response','declined')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX leads_specialist_status_idx ON leads (specialist_id, status);

-- RLS policies (enable if needed)
-- ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY specialist_leads ON leads FOR ALL USING (specialist_id = auth.uid()); etc. (add later)

