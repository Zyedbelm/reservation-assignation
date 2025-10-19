
-- Supprimer les colonnes liées à Google Calendar de la table activities
ALTER TABLE public.activities 
DROP COLUMN IF EXISTS google_event_id;

-- Ajouter de nouvelles colonnes pour le système Make.com
ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS make_event_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS event_source TEXT DEFAULT 'make',
ADD COLUMN IF NOT EXISTS assignment_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS is_assigned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS assignment_date TIMESTAMP WITH TIME ZONE;

-- Créer une table pour les logs de synchronisation Make.com
CREATE TABLE IF NOT EXISTS public.make_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sync_completed_at TIMESTAMP WITH TIME ZONE,
  events_processed INTEGER DEFAULT 0,
  events_created INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  assignments_made INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress',
  error_message TEXT,
  webhook_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer une table pour gérer les attributions d'événements
CREATE TABLE IF NOT EXISTS public.event_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
  gm_id UUID REFERENCES public.game_masters(id) ON DELETE CASCADE,
  assignment_score DECIMAL(3,2),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'assigned',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(activity_id, gm_id)
);

-- Supprimer l'ancienne table sync_logs (remplacée par make_sync_logs)
DROP TABLE IF EXISTS public.sync_logs;

-- Créer un index pour optimiser les requêtes d'attribution
CREATE INDEX IF NOT EXISTS idx_activities_unassigned ON public.activities(is_assigned, date) WHERE is_assigned = FALSE;
CREATE INDEX IF NOT EXISTS idx_event_assignments_gm_date ON public.event_assignments(gm_id, assigned_at);
CREATE INDEX IF NOT EXISTS idx_make_sync_logs_status ON public.make_sync_logs(status, sync_started_at);
