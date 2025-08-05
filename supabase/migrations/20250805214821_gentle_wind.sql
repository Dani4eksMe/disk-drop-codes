/*
  # Create MP3 uploads system

  1. New Tables
    - `mp3_uploads`
      - `id` (uuid, primary key)
      - `code` (varchar(6), unique, auto-generated)
      - `filename` (text)
      - `original_filename` (text)
      - `file_path` (text)
      - `file_size` (integer)
      - `mime_type` (text, default 'audio/mpeg')
      - `created_at` (timestamptz, default now())
      - `download_count` (integer, default 0)

  2. Functions
    - `generate_unique_code()` - generates unique 6-digit codes
    - `increment_download_count()` - increments download counter

  3. Security
    - Enable RLS on `mp3_uploads` table
    - Add policies for public read/insert access
    - Add index on code for fast lookups
*/

-- Create function to generate unique codes
CREATE OR REPLACE FUNCTION generate_unique_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 6-digit random code
        new_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM mp3_uploads WHERE code = new_code) INTO code_exists;
        
        -- If code doesn't exist, return it
        IF NOT code_exists THEN
            RETURN new_code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create the mp3_uploads table
CREATE TABLE IF NOT EXISTS mp3_uploads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(6) UNIQUE NOT NULL DEFAULT generate_unique_code(),
    filename text NOT NULL,
    original_filename text NOT NULL,
    file_path text NOT NULL,
    file_size integer NOT NULL,
    mime_type text NOT NULL DEFAULT 'audio/mpeg',
    created_at timestamptz DEFAULT now(),
    download_count integer DEFAULT 0
);

-- Create index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_mp3_uploads_code ON mp3_uploads(code);

-- Enable Row Level Security
ALTER TABLE mp3_uploads ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Anyone can view mp3_uploads"
    ON mp3_uploads FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Anyone can create mp3_uploads"
    ON mp3_uploads FOR INSERT
    TO public
    WITH CHECK (true);

-- Create function to increment download count
CREATE OR REPLACE FUNCTION increment_download_count(upload_code TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE mp3_uploads 
    SET download_count = download_count + 1 
    WHERE code = upload_code;
END;
$$ LANGUAGE plpgsql;