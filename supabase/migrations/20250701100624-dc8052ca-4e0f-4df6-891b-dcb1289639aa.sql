
-- Corriger les politiques RLS pour les correspondances événement-jeu
DROP POLICY IF EXISTS "Allow authenticated users to view event game mappings" ON public.event_game_mappings;
DROP POLICY IF EXISTS "Allow authenticated users to insert event game mappings" ON public.event_game_mappings;
DROP POLICY IF EXISTS "Allow authenticated users to update event game mappings" ON public.event_game_mappings;
DROP POLICY IF EXISTS "Allow authenticated users to delete event game mappings" ON public.event_game_mappings;

-- Créer les bonnes politiques RLS
CREATE POLICY "Allow authenticated users to view event game mappings" ON public.event_game_mappings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to insert event game mappings" ON public.event_game_mappings
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update event game mappings" ON public.event_game_mappings
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete event game mappings" ON public.event_game_mappings
  FOR DELETE USING (auth.uid() IS NOT NULL);
