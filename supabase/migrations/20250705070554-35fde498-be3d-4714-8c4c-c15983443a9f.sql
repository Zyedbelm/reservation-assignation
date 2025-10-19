
-- Corriger les fonctions de notifications GM pour sécuriser le search_path
CREATE OR REPLACE FUNCTION public.get_gm_notifications(gm_id_param UUID)
RETURNS TABLE (
  id UUID,
  gm_id UUID,
  notification_type TEXT,
  event_id UUID,
  title TEXT,
  message TEXT,
  event_data JSONB,
  is_read BOOLEAN,
  email_sent BOOLEAN,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.gm_id,
    n.notification_type,
    n.event_id,
    n.title,
    n.message,
    n.event_data,
    n.is_read,
    n.email_sent,
    n.email_sent_at,
    n.created_at,
    n.updated_at
  FROM public.gm_notifications n
  WHERE n.gm_id = gm_id_param
  ORDER BY n.created_at DESC;
END;
$$;

-- Corriger la fonction pour récupérer les notifications non lues
CREATE OR REPLACE FUNCTION public.get_gm_unread_notifications(gm_id_param UUID)
RETURNS TABLE (
  id UUID,
  gm_id UUID,
  notification_type TEXT,
  event_id UUID,
  title TEXT,
  message TEXT,
  event_data JSONB,
  is_read BOOLEAN,
  email_sent BOOLEAN,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.gm_id,
    n.notification_type,
    n.event_id,
    n.title,
    n.message,
    n.event_data,
    n.is_read,
    n.email_sent,
    n.email_sent_at,
    n.created_at,
    n.updated_at
  FROM public.gm_notifications n
  WHERE n.gm_id = gm_id_param AND n.is_read = false
  ORDER BY n.created_at DESC;
END;
$$;

-- Corriger la fonction pour marquer une notification comme lue
CREATE OR REPLACE FUNCTION public.mark_notification_as_read(notification_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.gm_notifications
  SET is_read = true, updated_at = now()
  WHERE id = notification_id_param;
END;
$$;

-- Corriger la fonction pour marquer toutes les notifications d'un GM comme lues
CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read(gm_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.gm_notifications
  SET is_read = true, updated_at = now()
  WHERE gm_id = gm_id_param AND is_read = false;
END;
$$;

-- Corriger la fonction pour mettre à jour le statut d'envoi d'email
CREATE OR REPLACE FUNCTION public.update_notification_email_status(notification_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.gm_notifications
  SET email_sent = true, email_sent_at = now(), updated_at = now()
  WHERE id = notification_id_param;
END;
$$;
