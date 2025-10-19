-- Étape 1: Extension de la base de données pour le multi-GM (version simplifiée)

-- Ajouter required_gms à la table games (nombre de GMs requis par jeu)
ALTER TABLE public.games 
ADD COLUMN required_gms integer NOT NULL DEFAULT 1;

-- Ajouter assignment_order à la table event_assignments (ordre d'assignation: 1=principal, 2=secondaire, etc.)
ALTER TABLE public.event_assignments 
ADD COLUMN assignment_order integer DEFAULT 1;

-- Créer un index pour optimiser les requêtes multi-GM
CREATE INDEX idx_event_assignments_activity_order ON public.event_assignments(activity_id, assignment_order);

-- Nettoyer les doublons potentiels d'assignment_order pour le même activity_id
UPDATE public.event_assignments 
SET assignment_order = 1 
WHERE assignment_order IS NULL;

-- Commentaires pour documenter les nouvelles colonnes
COMMENT ON COLUMN public.games.required_gms IS 'Nombre de Game Masters requis pour ce jeu (défaut: 1)';
COMMENT ON COLUMN public.event_assignments.assignment_order IS 'Ordre d''assignation: 1=Principal, 2=Secondaire, etc.';