
-- Phase 1: Nettoyage complet de la base de données GM (ordre corrigé)

-- 1. Supprimer les rapports mensuels en premier (à cause des contraintes FK)
DELETE FROM public.monthly_reports;

-- 2. Supprimer toutes les assignations d'événements
DELETE FROM public.event_assignments;

-- 3. Supprimer toutes les disponibilités GM
DELETE FROM public.gm_availabilities;

-- 4. Désassigner tous les événements et réinitialiser les statuts
UPDATE public.activities 
SET assigned_gm_id = NULL, 
    is_assigned = false, 
    assignment_date = NULL, 
    assignment_score = NULL;

-- 5. Supprimer tous les Game Masters
DELETE FROM public.game_masters;

-- 6. Supprimer tous les profils GM (garder seulement l'admin)
DELETE FROM public.profiles WHERE role = 'gm';

-- 7. Ajouter les champs first_name et last_name à la table profiles si pas déjà présents
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;
