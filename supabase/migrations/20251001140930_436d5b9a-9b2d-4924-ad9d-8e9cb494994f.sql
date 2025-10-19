-- Correction des événements incohérents : synchroniser is_assigned et status avec assigned_gm_id
UPDATE activities
SET 
  is_assigned = true,
  status = 'assigned',
  updated_at = now()
WHERE assigned_gm_id IS NOT NULL
AND is_assigned = false;