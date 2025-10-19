
-- Corriger les fonctions avec search_path mutable pour la sécurité
-- Ajouter SET search_path = '' pour sécuriser les fonctions

-- Correction de la fonction update_monthly_reports
CREATE OR REPLACE FUNCTION public.update_monthly_reports()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Update monthly report when activity is completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO public.monthly_reports (
      month_year,
      gm_id,
      total_hours,
      gaming_hours,
      formation_hours,
      maintenance_hours,
      admin_hours
    )
    VALUES (
      TO_CHAR(NEW.date, 'YYYY-MM'),
      NEW.assigned_gm_id,
      CASE WHEN NEW.activity_type = 'gaming' THEN NEW.duration / 60.0 ELSE 0 END +
      CASE WHEN NEW.activity_type = 'formation' THEN NEW.duration / 60.0 ELSE 0 END +
      CASE WHEN NEW.activity_type = 'maintenance' THEN NEW.duration / 60.0 ELSE 0 END +
      CASE WHEN NEW.activity_type = 'admin' THEN NEW.duration / 60.0 ELSE 0 END,
      CASE WHEN NEW.activity_type = 'gaming' THEN NEW.duration / 60.0 ELSE 0 END,
      CASE WHEN NEW.activity_type = 'formation' THEN NEW.duration / 60.0 ELSE 0 END,
      CASE WHEN NEW.activity_type = 'maintenance' THEN NEW.duration / 60.0 ELSE 0 END,
      CASE WHEN NEW.activity_type = 'admin' THEN NEW.duration / 60.0 ELSE 0 END
    )
    ON CONFLICT (month_year, gm_id) DO UPDATE SET
      total_hours = public.monthly_reports.total_hours + EXCLUDED.total_hours,
      gaming_hours = public.monthly_reports.gaming_hours + EXCLUDED.gaming_hours,
      formation_hours = public.monthly_reports.formation_hours + EXCLUDED.formation_hours,
      maintenance_hours = public.monthly_reports.maintenance_hours + EXCLUDED.maintenance_hours,
      admin_hours = public.monthly_reports.admin_hours + EXCLUDED.admin_hours,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Correction de la fonction handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Créer un profil GM par défaut pour les nouveaux utilisateurs
    -- L'admin sera créé manuellement
    INSERT INTO public.profiles (user_id, email, role)
    VALUES (NEW.id, NEW.email, 'gm');
    
    RETURN NEW;
END;
$$;
