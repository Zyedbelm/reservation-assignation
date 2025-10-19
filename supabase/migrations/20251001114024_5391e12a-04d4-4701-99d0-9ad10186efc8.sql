-- Corriger le statut des créneaux du 11 octobre pour Ainoa et Arsenii
UPDATE activities 
SET status = 'assigned', updated_at = now()
WHERE date = '2025-10-11' 
AND activity_type = 'menage'
AND assigned_gm_id IN (
  SELECT id FROM game_masters WHERE name IN ('Ainoa', 'Arsenii')
)
AND status = 'pending';

-- Corriger tous les créneaux avec is_assigned=true mais status=pending (pour éviter le problème à l'avenir)
UPDATE activities
SET status = 'assigned', updated_at = now()
WHERE is_assigned = true 
AND status = 'pending';