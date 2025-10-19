-- 1) Normaliser les valeurs existantes d'AVS (vides -> NULL)
UPDATE public.game_masters
SET avs_number = NULL
WHERE avs_number IS NOT NULL AND btrim(avs_number) = '';

-- 2) Remplacer la contrainte unique par un index unique partiel (trim + lower), en autorisant NULL/vides
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'game_masters_avs_number_key'
  ) THEN
    ALTER TABLE public.game_masters DROP CONSTRAINT game_masters_avs_number_key;
  END IF;
END $$;

-- créer un index unique partiel, robuste aux espaces et à la casse
CREATE UNIQUE INDEX IF NOT EXISTS uniq_game_masters_avs_number
ON public.game_masters (lower(btrim(avs_number)))
WHERE avs_number IS NOT NULL AND btrim(avs_number) <> '';

-- 3) Corriger RLS: retirer la politique ajoutée récemment qui pouvait contourner l'interdiction sur hire_date
DROP POLICY IF EXISTS "GMs can update their own game master row" ON public.game_masters;