
-- Créer la table profiles pour stocker les informations des utilisateurs
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'gm')),
    gm_id UUID REFERENCES public.game_masters(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS sur la table profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Créer des politiques RLS pour la table profiles
CREATE POLICY "Allow all operations on profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- Fonction pour créer automatiquement un profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Créer un profil GM par défaut pour les nouveaux utilisateurs
    -- L'admin sera créé manuellement
    INSERT INTO public.profiles (user_id, email, role)
    VALUES (NEW.id, NEW.email, 'gm');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer automatiquement un profil lors de l'inscription
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Créer le profil administrateur
INSERT INTO public.profiles (user_id, email, role, created_at, updated_at) 
VALUES (
    null, -- sera lié quand l'utilisateur se connectera
    'info@genieculturel.ch',
    'admin',
    now(),
    now()
);
