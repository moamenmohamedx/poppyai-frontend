-- Google OAuth 2.0 tokens table for user authentication
-- Migration: 20250107_google_oauth_tokens.sql

-- Create OAuth tokens table
CREATE TABLE IF NOT EXISTS google_oauth_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,           -- Encrypted access token
  refresh_token TEXT NOT NULL,          -- Encrypted refresh token
  token_expiry TIMESTAMPTZ NOT NULL,    -- When access token expires
  scope TEXT NOT NULL,                  -- OAuth scopes granted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON google_oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expiry ON google_oauth_tokens(token_expiry);

-- Enable Row Level Security
ALTER TABLE google_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own tokens
CREATE POLICY "Users can read own OAuth tokens"
  ON google_oauth_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own OAuth tokens"
  ON google_oauth_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own OAuth tokens"
  ON google_oauth_tokens
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own OAuth tokens"
  ON google_oauth_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_oauth_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_oauth_tokens_timestamp
  BEFORE UPDATE ON google_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_oauth_tokens_updated_at();

-- Add comment for documentation
COMMENT ON TABLE google_oauth_tokens IS 'Stores encrypted Google OAuth 2.0 tokens for user authentication';
COMMENT ON COLUMN google_oauth_tokens.access_token IS 'Fernet-encrypted access token';
COMMENT ON COLUMN google_oauth_tokens.refresh_token IS 'Fernet-encrypted refresh token for token renewal';
COMMENT ON COLUMN google_oauth_tokens.token_expiry IS 'UTC timestamp when access token expires';
