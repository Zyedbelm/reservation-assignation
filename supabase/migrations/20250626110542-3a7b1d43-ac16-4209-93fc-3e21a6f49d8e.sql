
-- Ajouter le champ délai minimum aux jeux
ALTER TABLE public.games 
ADD COLUMN minimum_break_minutes INTEGER DEFAULT 30;

-- Mettre à jour la description
COMMENT ON COLUMN public.games.minimum_break_minutes IS 'Délai minimum en minutes entre deux assignations du même GM pour ce type de jeu';

-- Mettre à jour les jeux existants avec des valeurs par défaut logiques
UPDATE public.games 
SET minimum_break_minutes = CASE 
  WHEN category = 'VR' THEN 15  -- VR nécessite moins de pause
  WHEN category = 'Escape Game' THEN 30  -- Standard
  WHEN category = 'Formation' THEN 60    -- Plus de temps entre formations
  ELSE 30
END;
