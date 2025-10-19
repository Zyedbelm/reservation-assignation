
-- Create the gm_notifications table that the RPC functions reference
CREATE TABLE IF NOT EXISTS public.gm_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gm_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  event_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  event_data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.gm_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for GM notifications
CREATE POLICY "GMs can view their own notifications" 
  ON public.gm_notifications 
  FOR SELECT 
  USING (gm_id IN (
    SELECT profiles.gm_id 
    FROM profiles 
    WHERE profiles.user_id = auth.uid()
  ));

CREATE POLICY "Services can create notifications" 
  ON public.gm_notifications 
  FOR INSERT 
  WITH CHECK (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Services can update notifications" 
  ON public.gm_notifications 
  FOR UPDATE 
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
  ));

-- Add foreign key constraint
ALTER TABLE public.gm_notifications 
ADD CONSTRAINT gm_notifications_gm_id_fkey 
FOREIGN KEY (gm_id) REFERENCES public.game_masters(id);

-- Add foreign key constraint for event_id (optional reference)
ALTER TABLE public.gm_notifications 
ADD CONSTRAINT gm_notifications_event_id_fkey 
FOREIGN KEY (event_id) REFERENCES public.activities(id);
