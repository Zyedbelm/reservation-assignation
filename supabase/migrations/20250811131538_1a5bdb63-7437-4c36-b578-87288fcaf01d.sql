-- Allow GMs to update their own game_masters row
CREATE POLICY "GMs can update their own game master row"
ON public.game_masters
FOR UPDATE
USING (
  id IN (
    SELECT p.gm_id FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'gm'
  )
)
WITH CHECK (
  id IN (
    SELECT p.gm_id FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'gm'
  )
);