
-- Supprimer les anciennes politiques RLS trop restrictives
DROP POLICY IF EXISTS "Allow authenticated users to select their own event game mappin" ON public.event_game_mappings;
DROP POLICY IF EXISTS "Allow authenticated users to insert event game mappings" ON public.event_game_mappings;
DROP POLICY IF EXISTS "Allow authenticated users to update their own event game mappin" ON public.event_game_mappings;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own event game mappin" ON public.event_game_mappings;

-- Créer de nouvelles politiques RLS plus appropriées pour les correspondances globales
CREATE POLICY "Allow authenticated users to view event game mappings" ON public.event_game_mappings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert event game mappings" ON public.event_game_mappings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update event game mappings" ON public.event_game_mappings
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete event game mappings" ON public.event_game_mappings
  FOR DELETE USING (auth.role() = 'authenticated');
