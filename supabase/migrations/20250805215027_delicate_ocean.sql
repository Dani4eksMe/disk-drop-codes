/*
  # MP3 Upload System Migration

  1. New Tables
    - `mp3_uploads`
      - `id` (uuid, primary key) - Unique identifier for each upload
      - `code` (varchar(6), unique) - 6-character unique code for file access
      - `filename` (text) - Generated filename for storage
      - `original_filename` (text) - Original filename from user upload
      - `file_path` (text) - Path to file in Supabase storage
      - `file_size` (integer) - Size of the file in bytes
      - `mime_type` (text) - MIME type of the uploaded file
      - `created_at` (timestamptz) - Upload timestamp
      - `download_count` (integer) - Number of times file was downloaded

  2. Functions
    - `generate_unique_code()` - Generates unique 6-character codes
    - `increment_download_count()` - Increments download counter

  3. Security
    - Enable RLS on `mp3_uploads` table
    - Add policies for public read and insert access
    - Add indexes for performance

  4. Storage
    - Create storage bucket for MP3 files with public access
*/

-- Create the mp3_uploads table
CREATE TABLE IF NOT EXISTS mp3_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code character varying(6) UNIQUE NOT NULL DEFAULT generate_unique_code(),
  filename text NOT NULL,
  original_filename text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL,
  mime_type text NOT NULL DEFAULT 'audio/mpeg',
  created_at timestamptz DEFAULT now(),
  download_count integer DEFAULT 0
);

-- Create function to generate unique 6-character codes
CREATE OR REPLACE FUNCTION generate_unique_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer;
  code_exists boolean;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM mp3_uploads WHERE code = result) INTO code_exists;
    
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to increment download count
CREATE OR REPLACE FUNCTION increment_download_count(upload_code text)
RETURNS void AS $$
BEGIN
  UPDATE mp3_uploads 
  SET download_count = download_count + 1 
  WHERE code = upload_code;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE mp3_uploads ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Anyone can view mp3_uploads"
  ON mp3_uploads
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create mp3_uploads"
  ON mp3_uploads
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mp3_uploads_code ON mp3_uploads (code);
CREATE INDEX IF NOT EXISTS idx_mp3_uploads_created_at ON mp3_uploads (created_at);

-- Create storage bucket for MP3 files (this needs to be done via Supabase dashboard or API)
-- The bucket should be named 'mp3-files' with public access enabled