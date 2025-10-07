-- Fix RLS policies for shares table to handle file upload and public access

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view shares for their files" ON public.shares;
DROP POLICY IF EXISTS "Users can create shares for their files" ON public.shares;

-- Policy for users to view shares for their own files
CREATE POLICY "Users can view shares for their files" ON public.shares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.files 
      WHERE files.id = shares.file_id AND files.user_id = auth.uid()
    )
  );

-- Policy for users to create shares for their own files
CREATE POLICY "Users can create shares for their files" ON public.shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.files 
      WHERE files.id = shares.file_id AND files.user_id = auth.uid()
    )
  );

-- Policy to allow public access to shares by token (for downloading)
CREATE POLICY "Public can view shares by token" ON public.shares
  FOR SELECT USING (true);

-- Policy to allow updates to share access tracking
CREATE POLICY "Public can update share access" ON public.shares
  FOR UPDATE USING (true)
  WITH CHECK (true);