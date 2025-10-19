
-- Supprimer tous les enregistrements GM et données associées, sauf l'admin
-- D'abord supprimer les données dépendantes

-- Supprimer les disponibilités des GM
DELETE FROM public.gm_availabilities 
WHERE gm_id IN (
  SELECT id FROM public.game_masters 
  WHERE email != 'info@genieculturel.ch'
);

-- Supprimer les documents des GM
DELETE FROM public.gm_documents 
WHERE gm_id IN (
  SELECT id FROM public.game_masters 
  WHERE email != 'info@genieculturel.ch'
);

-- Supprimer les compétences des GM
DELETE FROM public.gm_game_competencies 
WHERE gm_id IN (
  SELECT id FROM public.game_masters 
  WHERE email != 'info@genieculturel.ch'
);

-- Supprimer les assignations d'événements
DELETE FROM public.event_assignments 
WHERE gm_id IN (
  SELECT id FROM public.game_masters 
  WHERE email != 'info@genieculturel.ch'
);

-- Retirer les assignations des activités
UPDATE public.activities 
SET assigned_gm_id = NULL, 
    is_assigned = false,
    assignment_date = NULL,
    assignment_score = NULL
WHERE assigned_gm_id IN (
  SELECT id FROM public.game_masters 
  WHERE email != 'info@genieculturel.ch'
);

-- Supprimer les rapports mensuels des GM
DELETE FROM public.monthly_reports 
WHERE gm_id IN (
  SELECT id FROM public.game_masters 
  WHERE email != 'info@genieculturel.ch'
);

-- Supprimer les enregistrements game_masters (sauf admin si il existe)
DELETE FROM public.game_masters 
WHERE email != 'info@genieculturel.ch';

-- Supprimer les profils GM (garder seulement l'admin)
DELETE FROM public.profiles 
WHERE email != 'info@genieculturel.ch';
