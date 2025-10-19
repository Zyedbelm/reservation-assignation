-- Create helper function to ensure GM record and profile link exist for a user
CREATE OR REPLACE FUNCTION public.ensure_gm_profile_for_user(
  p_user_id uuid,
  p_email text,
  p_first text DEFAULT NULL,
  p_last text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_gm_id uuid;
  v_profile_id uuid;
  v_first text := NULLIF(p_first, '');
  v_last text := NULLIF(p_last, '');
  v_name text;
BEGIN
  -- Derive name
  v_name := trim(both ' ' from coalesce(v_first,'') || ' ' || coalesce(v_last,''));
  IF v_name = '' THEN
    v_name := split_part(p_email, '@', 1);
  END IF;

  -- Find existing GM by email
  SELECT id INTO v_gm_id FROM public.game_masters WHERE lower(email) = lower(p_email) LIMIT 1;

  -- Create GM if missing
  IF v_gm_id IS NULL THEN
    INSERT INTO public.game_masters (name, email, is_active, is_available, first_name, last_name)
    VALUES (v_name, p_email, true, true, v_first, v_last)
    RETURNING id INTO v_gm_id;
  ELSE
    -- Soft update name fields if empty
    UPDATE public.game_masters
      SET name = COALESCE(NULLIF(name,''), v_name),
          first_name = COALESCE(first_name, v_first),
          last_name = COALESCE(last_name, v_last),
          updated_at = now()
    WHERE id = v_gm_id;
  END IF;

  -- Ensure profile exists and is linked
  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = p_user_id LIMIT 1;
  IF v_profile_id IS NULL THEN
    SELECT id INTO v_profile_id FROM public.profiles WHERE lower(email) = lower(p_email) ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF v_profile_id IS NULL THEN
    -- Create profile if none exists
    INSERT INTO public.profiles (user_id, email, role, gm_id, first_name, last_name)
    VALUES (p_user_id, p_email, 'gm', v_gm_id, v_first, v_last)
    RETURNING id INTO v_profile_id;
  ELSE
    -- Update linkage
    UPDATE public.profiles
      SET user_id = COALESCE(user_id, p_user_id),
          gm_id = COALESCE(gm_id, v_gm_id),
          first_name = COALESCE(first_name, v_first),
          last_name = COALESCE(last_name, v_last),
          updated_at = now()
    WHERE id = v_profile_id;
  END IF;

  RETURN v_gm_id;
END;
$$;

-- Replace signup trigger function to create GM and link profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_gm_id uuid;
  v_first text;
  v_last text;
BEGIN
  v_first := NULLIF(NEW.raw_user_meta_data->>'first_name', '');
  v_last := NULLIF(NEW.raw_user_meta_data->>'last_name', '');

  -- Ensure GM and Profile linkage
  v_gm_id := public.ensure_gm_profile_for_user(NEW.id, NEW.email, v_first, v_last);

  RETURN NEW;
END;
$$;

-- Ensure trigger is present on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();