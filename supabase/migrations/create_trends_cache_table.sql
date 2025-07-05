-- Create trends_cache table
CREATE TABLE IF NOT EXISTS trends_cache (
  id TEXT PRIMARY KEY DEFAULT 'latest',
  trends JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create an index on id for faster lookups
CREATE INDEX IF NOT EXISTS idx_trends_cache_id ON trends_cache(id);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trends_cache_updated_at BEFORE UPDATE
  ON trends_cache FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust based on your needs)
ALTER TABLE trends_cache ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role to read/write
CREATE POLICY "Service role can manage trends" ON trends_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy to allow anon users to read (optional)
CREATE POLICY "Anyone can read trends" ON trends_cache
  FOR SELECT
  TO anon
  USING (true);