
-- Supprimer les politiques existantes s'elles existent
DROP POLICY IF EXISTS "Admins can view sync logs" ON public.make_sync_logs;
DROP POLICY IF EXISTS "Services can insert sync logs" ON public.make_sync_logs;
DROP POLICY IF EXISTS "Admins can view all event assignments" ON public.event_assignments;
DROP POLICY IF EXISTS "GMs can view their own assignments" ON public.event_assignments;
DROP POLICY IF EXISTS "Admins can insert event assignments" ON public.event_assignments;
DROP POLICY IF EXISTS "Admins can update event assignments" ON public.event_assignments;
DROP POLICY IF EXISTS "Admins can delete event assignments" ON public.event_assignments;

-- Activer RLS sur les tables (ne fait rien si déjà activé)
ALTER TABLE public.make_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_assignments ENABLE ROW LEVEL SECURITY;

-- Créer les politiques pour make_sync_logs
CREATE POLICY "Admins can view sync logs" ON public.make_sync_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Services can insert sync logs" ON public.make_sync_logs
FOR INSERT WITH CHECK (
  auth.role() = 'service_role' OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Créer les politiques pour event_assignments
CREATE POLICY "Admins can view all event assignments" ON public.event_assignments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "GMs can view their own assignments" ON public.event_assignments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'gm'
    AND p.gm_id = event_assignments.gm_id
  )
);

CREATE POLICY "Admins can insert event assignments" ON public.event_assignments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update event assignments" ON public.event_assignments
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete event assignments" ON public.event_assignments
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);
