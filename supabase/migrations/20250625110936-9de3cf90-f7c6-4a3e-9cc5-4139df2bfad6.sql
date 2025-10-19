
-- Créer la table de correspondance entre les noms d'événements et les jeux
CREATE TABLE IF NOT EXISTS public.event_game_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name_pattern TEXT NOT NULL,
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer un index pour optimiser les recherches par pattern
CREATE INDEX IF NOT EXISTS idx_event_game_mappings_pattern ON public.event_game_mappings(event_name_pattern);
CREATE INDEX IF NOT EXISTS idx_event_game_mappings_active ON public.event_game_mappings(is_active) WHERE is_active = TRUE;

-- Ajouter quelques exemples de correspondances courantes (optionnel)
INSERT INTO public.event_game_mappings (event_name_pattern, game_id, is_active)
SELECT 'VR', g.id, true FROM public.games g WHERE g.name ILIKE '%VR%' LIMIT 1
ON CONFLICT DO NOTHING;
