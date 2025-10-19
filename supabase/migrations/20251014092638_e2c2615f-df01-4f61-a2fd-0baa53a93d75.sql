-- Activer la réplication complète pour la table activities
-- Cela permet à Supabase Realtime de capturer toutes les données de la ligne
ALTER TABLE public.activities REPLICA IDENTITY FULL;

-- Vérifier que la table est dans la publication realtime
-- (Par défaut, toutes les tables publiques sont dans la publication supabase_realtime)
-- Cette étape est informative et n'est pas strictement nécessaire car la table
-- devrait déjà être dans la publication par défaut

-- Note: Les changements seront immédiatement visibles pour tous les clients
-- qui écoutent les changements via le canal Supabase Realtime