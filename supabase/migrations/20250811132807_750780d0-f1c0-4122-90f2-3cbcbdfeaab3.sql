
-- 1) Supprimer la politique RLS problématique (référence circulaire)
DROP POLICY IF EXISTS "GMs can update their own GM (no hire_date change)" ON public.game_masters;

-- 2) Fonctions d'aide sécurisées (pas de référence à game_masters)

-- Renvoie le gm_id de l'utilisateur courant (rôle gm)
CREATE OR REPLACE FUNCTION public.get_current_user_gm_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT p.gm_id
  FROM public.profiles p
  WHERE p.user_id = auth.uid() AND p.role = 'gm'
  LIMIT 1
$$;

-- Indique si l'utilisateur courant est admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

-- 3) Nouvelle politique RLS sans lecture de game_masters
CREATE POLICY "GMs can update their own GM"
  ON public.game_masters
  FOR UPDATE
  USING (id = public.get_current_user_gm_id())
  WITH CHECK (id = public.get_current_user_gm_id());

-- 4) Trigger: seul un admin peut modifier hire_date
CREATE OR REPLACE FUNCTION public.enforce_hire_date_admin_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $fn$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.hire_date IS DISTINCT FROM OLD.hire_date THEN
    IF NOT public.is_current_user_admin() THEN
      RAISE EXCEPTION 'Only admins can modify hire_date'
        USING ERRCODE = '42501'; -- insufficient_privilege
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_enforce_hire_date_admin_only ON public.game_masters;
CREATE TRIGGER trg_enforce_hire_date_admin_only
BEFORE UPDATE ON public.game_masters
FOR EACH ROW
EXECUTE FUNCTION public.enforce_hire_date_admin_only();
