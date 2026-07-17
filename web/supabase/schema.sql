-- Run this entirely in the Supabase SQL Editor

-- 1. Create table for Interaction Logs
CREATE TABLE IF NOT EXISTS interaction_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    query TEXT NOT NULL,
    intent_category TEXT NOT NULL,
    intent_parameters JSONB,
    response TEXT,
    phone_number TEXT -- For future when telephony is connected
);

-- 2. Create table for Active Alerts (Cron Jobs)
CREATE TABLE IF NOT EXISTS alert_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    crop TEXT NOT NULL,
    location TEXT NOT NULL,
    condition TEXT NOT NULL, -- 'above' or 'below'
    target_price NUMERIC NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL, -- 'active' or 'fulfilled'
    phone_number TEXT -- For future when telephony is connected
);

-- Optional: Enable Row Level Security (RLS) but allow anonymous inserts for this MVP dashboard
ALTER TABLE interaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (since our Next.js backend uses the anon key for now)
CREATE POLICY "Enable insert for anonymous users" ON interaction_logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Enable read for anonymous users" ON interaction_logs FOR SELECT TO anon USING (true);

CREATE POLICY "Enable insert for anonymous users" ON alert_subscriptions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Enable read for anonymous users" ON alert_subscriptions FOR SELECT TO anon USING (true);
