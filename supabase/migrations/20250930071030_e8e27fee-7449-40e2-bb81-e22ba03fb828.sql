-- Ajouter la colonne game_id pour tracer le jeu associé
ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS game_id UUID REFERENCES public.games(id) ON DELETE SET NULL;

-- Ajouter la colonne duration_source pour tracer l'origine de la durée
ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS duration_source TEXT CHECK (duration_source IN ('make_import', 'game_mapping', 'manual_edit'));

-- Index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_activities_game_id ON public.activities(game_id);
CREATE INDEX IF NOT EXISTS idx_activities_duration_source ON public.activities(duration_source);

-- Commentaires pour documentation
COMMENT ON COLUMN public.activities.game_id IS 'Référence au jeu associé (si reconnu automatiquement ou manuellement)';
COMMENT ON COLUMN public.activities.duration_source IS 'Source de la durée: make_import (durée Make.com), game_mapping (durée admin appliquée automatiquement), manual_edit (modifié manuellement)';