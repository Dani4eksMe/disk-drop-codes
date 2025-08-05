/*
  # Create storage bucket for MP3 files

  1. Storage
    - Create `mp3-files` bucket
    - Set up public access policies for the bucket
    - Configure bucket settings for audio files
*/

-- Create storage bucket for MP3 files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'mp3-files',
    'mp3-files',
    false,
    20971520, -- 20MB limit
    ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/flac']
) ON CONFLICT (id) DO NOTHING;

-- Create policy for public uploads
CREATE POLICY "Anyone can upload mp3 files"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'mp3-files');

-- Create policy for public downloads (needed for our edge function)
CREATE POLICY "Anyone can download mp3 files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'mp3-files');