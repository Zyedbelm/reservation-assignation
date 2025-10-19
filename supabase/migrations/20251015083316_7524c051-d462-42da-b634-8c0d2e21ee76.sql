-- Phase 2: Nettoyer les doublons créés avec calendar_source='unknown'
-- Version corrigée: Supprimer les assignations des doublons puis les doublons

-- Étape 1: Supprimer les assignations des doublons
-- (Les événements EL corrects ont déjà leurs propres assignations)
DELETE FROM event_assignments
WHERE activity_id IN (
  SELECT id
  FROM activities
  WHERE calendar_source = 'unknown'
  AND created_at >= '2025-10-15 08:00:00'
  AND created_at <= '2025-10-15 08:15:00'
);

-- Étape 2: Supprimer les événements doublons avec calendar_source='unknown'
DELETE FROM activities
WHERE calendar_source = 'unknown'
AND created_at >= '2025-10-15 08:00:00'
AND created_at <= '2025-10-15 08:15:00';