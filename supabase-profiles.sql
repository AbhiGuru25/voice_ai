-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS farmer_profiles (
  phone_number TEXT PRIMARY KEY,
  name TEXT,
  primary_crop TEXT,
  location TEXT,
  land_size_acres NUMERIC,
  language_preference TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert a mock profile for your own phone number so we can test the memory!
-- REPLACE '+919876543210' with the actual phone number you are calling from via Twilio/WhatsApp
INSERT INTO farmer_profiles (phone_number, name, primary_crop, location, land_size_acres)
VALUES ('+919876543210', 'Ramesh Bhai', 'Wheat', 'Surat', 5.5)
ON CONFLICT (phone_number) DO NOTHING;
