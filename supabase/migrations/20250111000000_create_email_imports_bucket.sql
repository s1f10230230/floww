-- Create storage bucket for email imports
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-imports', 'email-imports', false);

-- Set up RLS policies for email-imports bucket
CREATE POLICY "Users can upload their own email files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'email-imports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read their own email files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'email-imports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own email files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'email-imports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
