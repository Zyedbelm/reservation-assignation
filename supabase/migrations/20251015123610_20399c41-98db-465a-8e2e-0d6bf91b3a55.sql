
-- Supprimer l'événement "Le Serviteur de la rédemption I [5]" de Solene Masloh du 25/10/2025
-- Cet événement a été déplacé à avril 2026 mais apparaissait toujours dans le calendrier

-- D'abord supprimer les assignations liées à cet événement
DELETE FROM event_assignments 
WHERE activity_id = '8c6b8e3a-03d3-48eb-a7fd-b726cca3ba20';

-- Ensuite supprimer les mouvements de stock liés
DELETE FROM stock_movements 
WHERE event_id = '8c6b8e3a-03d3-48eb-a7fd-b726cca3ba20';

-- Supprimer les notifications liées
DELETE FROM gm_notifications 
WHERE event_id = '8c6b8e3a-03d3-48eb-a7fd-b726cca3ba20';

-- Enfin supprimer l'événement lui-même
DELETE FROM activities 
WHERE id = '8c6b8e3a-03d3-48eb-a7fd-b726cca3ba20';
