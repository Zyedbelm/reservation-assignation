
-- Ajouter les colonnes manquantes à la table game_masters
ALTER TABLE public.game_masters 
ADD COLUMN IF NOT EXISTS termination_reason TEXT;

-- Vérifier que toutes les colonnes nécessaires existent
-- (termination_date existe déjà d'après le schéma)
