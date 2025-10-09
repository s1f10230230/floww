-- Add Yahoo OAuth token columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS yahoo_access_token TEXT,
ADD COLUMN IF NOT EXISTS yahoo_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS yahoo_token_expiry TIMESTAMP WITH TIME ZONE;

-- Add comment
COMMENT ON COLUMN profiles.yahoo_access_token IS 'Yahoo OAuth access token for Mail API';
COMMENT ON COLUMN profiles.yahoo_refresh_token IS 'Yahoo OAuth refresh token';
COMMENT ON COLUMN profiles.yahoo_token_expiry IS 'Yahoo access token expiry time';
