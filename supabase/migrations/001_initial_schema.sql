-- Initial schema for AI Context Organizer (Single User - No Auth)
-- Run this in your Supabase SQL editor

-- Projects table (no user_id for single user setup)
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE, -- unique project names
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_opened_at TIMESTAMPTZ,
  thumbnail TEXT,
  viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb
);

-- Canvas states table
CREATE TABLE IF NOT EXISTS canvas_states (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  nodes JSONB DEFAULT '[]'::jsonb,
  edges JSONB DEFAULT '[]'::jsonb,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);

-- Row Level Security DISABLED for single-user setup
-- RLS will be added when authentication is implemented
-- For now, the anon key has full access to all tables
-- This is acceptable for local development and single-user scenarios

-- Note: When adding auth later, enable RLS with:
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE canvas_states ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
