
-- 1. Créer le bucket de stockage pour les documents GM
INSERT INTO storage.buckets (id, name, public)
VALUES ('gm-documents', 'gm-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Ajouter les colonnes manquantes à la table games
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS average_duration INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Créer les politiques RLS pour le bucket gm-documents
CREATE POLICY "Admins can upload GM documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'gm-documents' AND 
  auth.uid() IN (
    SELECT user_id FROM profiles WHERE role = 'admin'
  )
);

CREATE POLICY "Admins can view GM documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'gm-documents' AND 
  auth.uid() IN (
    SELECT user_id FROM profiles WHERE role = 'admin'
  )
);

CREATE POLICY "Admins can delete GM documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'gm-documents' AND 
  auth.uid() IN (
    SELECT user_id FROM profiles WHERE role = 'admin'
  )
);

CREATE POLICY "GMs can view GM documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'gm-documents' AND 
  auth.uid() IN (
    SELECT user_id FROM profiles WHERE role = 'gm'
  )
);

-- 4. Créer les politiques RLS pour la table gm_documents
CREATE POLICY "Admins can manage GM documents"
ON gm_documents FOR ALL
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM profiles WHERE role = 'admin'
  )
);

CREATE POLICY "GMs can view their own documents"
ON gm_documents FOR SELECT
TO authenticated
USING (
  gm_id IN (
    SELECT gm_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- 5. Assurer que RLS est activé sur toutes les tables nécessaires
ALTER TABLE gm_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
