
-- Créer le bucket pour les documents GM
INSERT INTO storage.buckets (id, name, public) 
VALUES ('gm-documents', 'gm-documents', false);

-- Politique pour permettre aux utilisateurs de télécharger leurs propres documents
CREATE POLICY "Users can view own documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'gm-documents' AND 
  (auth.uid()::text = (storage.foldername(name))[1] OR 
   EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'))
);

-- Politique pour permettre aux utilisateurs de télécharger leurs propres documents
CREATE POLICY "Users can upload own documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'gm-documents' AND 
  (auth.uid()::text = (storage.foldername(name))[1] OR 
   EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'))
);

-- Politique pour permettre aux admins de supprimer les documents
CREATE POLICY "Admins can delete documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'gm-documents' AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
