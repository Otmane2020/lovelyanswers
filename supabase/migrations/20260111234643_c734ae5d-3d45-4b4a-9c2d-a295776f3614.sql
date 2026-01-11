-- Add attachment_url column to support_messages table
ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS attachment_url TEXT;