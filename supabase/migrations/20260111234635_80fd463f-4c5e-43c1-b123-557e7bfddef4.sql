-- Create storage bucket for support attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('support-attachments', 'support-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to support-attachments bucket
CREATE POLICY "Authenticated users can upload support attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'support-attachments');

-- Allow anyone to view support attachments (for displaying in tickets)
CREATE POLICY "Anyone can view support attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'support-attachments');

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete their own support attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'support-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);