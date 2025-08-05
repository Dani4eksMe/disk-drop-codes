-- Create table for MP3 uploads
CREATE TABLE public.mp3_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(6) NOT NULL UNIQUE DEFAULT generate_unique_code(),
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'audio/mpeg',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  download_count INTEGER DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE public.mp3_uploads ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a public file sharing service)
CREATE POLICY "Anyone can view mp3_uploads" 
ON public.mp3_uploads 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create mp3_uploads" 
ON public.mp3_uploads 
FOR INSERT 
WITH CHECK (true);

-- Create function to update download count
CREATE OR REPLACE FUNCTION public.increment_download_count(upload_code VARCHAR(6))
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.mp3_uploads 
  SET download_count = download_count + 1 
  WHERE code = upload_code;
END;
$$;

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('mp3-files', 'mp3-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for public access
CREATE POLICY "Anyone can view mp3 files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'mp3-files');

CREATE POLICY "Anyone can upload mp3 files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'mp3-files');

-- Create index for faster lookups by code
CREATE INDEX idx_mp3_uploads_code ON public.mp3_uploads(code);