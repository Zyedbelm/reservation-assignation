-- Create a security definer function to get GM public names safely
-- This bypasses RLS restrictions for read-only GM name access
CREATE OR REPLACE FUNCTION public.get_gm_public_names()
RETURNS TABLE(
  gm_id uuid,
  display_name text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gm.id as gm_id,
    CASE 
      -- Priority 1: first_name + last_name if both exist
      WHEN gm.first_name IS NOT NULL AND gm.last_name IS NOT NULL 
      THEN trim(gm.first_name || ' ' || gm.last_name)
      
      -- Priority 2: just first_name if exists
      WHEN gm.first_name IS NOT NULL 
      THEN gm.first_name
      
      -- Priority 3: just last_name if exists
      WHEN gm.last_name IS NOT NULL 
      THEN gm.last_name
      
      -- Priority 4: name field if not an email
      WHEN gm.name IS NOT NULL AND gm.name NOT LIKE '%@%' 
      THEN gm.name
      
      -- Fallback: extract from email if needed
      WHEN gm.email IS NOT NULL 
      THEN split_part(gm.email, '@', 1)
      
      ELSE 'GM inconnu'
    END as display_name
  FROM public.game_masters gm
  WHERE gm.is_active = true;
END;
$$;