
-- 1) Normaliser les avs_number vides en NULL
UPDATE public.game_masters
SET avs_number = NULL
WHERE avs_number IS NOT NULL AND btrim(avs_number) = '';

-- 2) Remplacer la contrainte unique par un index unique partiel robuste
DO $$
BEGIN
  -- Supprimer la contrainte unique existante si elle existe
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'game_masters_avs_number_key'
      AND conrelid = 'public.game_masters'::regclass
  ) THEN
    ALTER TABLE public.game_masters
      DROP CONSTRAINT game_masters_avs_number_key;
  END IF;
END$$;

-- Créer un index unique partiel (unicité uniquement quand avs_number non NULL et non vide)
-- Unicité insensible à la casse et aux espaces de bord
CREATE UNIQUE INDEX IF NOT EXISTS game_masters_avs_number_unique_nonnull
ON public.game_masters (lower(btrim(avs_number)))
WHERE avs_number IS NOT NULL AND btrim(avs_number) <> '';

-- 3) Empêcher les GMs de modifier hire_date via la RLS
-- On remplace la policy GM d'UPDATE par une version qui fige hire_date
DROP POLICY IF EXISTS "GMs can update their own game master row" ON public.game_masters;

CREATE POLICY "GMs can update their own GM (no hire_date change)"
ON public.game_masters
FOR UPDATE
USING (
  id IN (
    SELECT p.gm_id
    FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'gm'
  )
)
WITH CHECK (
  id IN (
    SELECT p.gm_id
    FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'gm'
  )
  AND hire_date IS NOT DISTINCT FROM (
    SELECT g.hire_date
    FROM public.game_masters g
    WHERE g.id = public.game_masters.id
  )
);
