-- Create files table to track uploaded files
CREATE TABLE public.files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  password_hash TEXT,
  burn_after_download BOOLEAN DEFAULT false,
  download_count INTEGER DEFAULT 0,
  max_downloads INTEGER DEFAULT NULL,
  is_deleted BOOLEAN DEFAULT false
);

-- Create shares table to track share links
CREATE TABLE public.shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID REFERENCES public.files(id) ON DELETE CASCADE NOT NULL,
  share_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for files
CREATE POLICY "Users can view their own files" ON public.files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files" ON public.files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files" ON public.files
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files" ON public.files
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for shares
CREATE POLICY "Users can view shares for their files" ON public.shares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.files 
      WHERE files.id = shares.file_id AND files.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create shares for their files" ON public.shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.files 
      WHERE files.id = shares.file_id AND files.user_id = auth.uid()
    )
  );

-- Create storage bucket for uploaded files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('uploads', 'uploads', false);

-- Storage policies
CREATE POLICY "Users can upload their own files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'uploads' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'uploads' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'uploads' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create function to clean up expired files
CREATE OR REPLACE FUNCTION public.cleanup_expired_files()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER := 0;
  file_record RECORD;
BEGIN
  -- Get all expired files
  FOR file_record IN 
    SELECT id, storage_path, user_id 
    FROM public.files 
    WHERE expires_at < now() AND is_deleted = false
  LOOP
    -- Mark as deleted
    UPDATE public.files 
    SET is_deleted = true 
    WHERE id = file_record.id;
    
    expired_count := expired_count + 1;
  END LOOP;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate share token
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;