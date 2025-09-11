-- Fix security warnings by setting search_path for functions
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix generate_share_token function
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql SET search_path = public;