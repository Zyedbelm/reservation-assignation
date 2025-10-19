
-- Create storage bucket for GM documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('gm-documents', 'gm-documents', false);

-- Create RLS policies for GM documents storage
CREATE POLICY "Users can view their own GM documents" ON storage.objects
FOR SELECT USING (bucket_id = 'gm-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own GM documents" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'gm-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own GM documents" ON storage.objects
FOR UPDATE USING (bucket_id = 'gm-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own GM documents" ON storage.objects
FOR DELETE USING (bucket_id = 'gm-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
