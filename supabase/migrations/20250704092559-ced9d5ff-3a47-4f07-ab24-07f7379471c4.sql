
-- Create a table for auto-assignment logs
CREATE TABLE IF NOT EXISTS public.auto_assignment_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  trigger_type TEXT NOT NULL DEFAULT 'manual', -- 'manual' or 'auto'
  assignments_made INTEGER DEFAULT 0,
  events_processed INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  execution_duration INTEGER, -- in milliseconds
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for the new table
ALTER TABLE public.auto_assignment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view auto assignment logs" 
ON public.auto_assignment_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

CREATE POLICY "Services can insert auto assignment logs" 
ON public.auto_assignment_logs 
FOR INSERT 
WITH CHECK (
  (auth.role() = 'service_role') OR 
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  ))
);

-- Create a cron job for auto-assignment every 6 hours
SELECT cron.schedule(
  'auto-assignment-every-6-hours',
  '0 */6 * * *', -- At minute 0 of every 6th hour
  $$
  SELECT
    extensions.http_post(
        url:='https://dnxyidnkmtrmkxucqrry.supabase.co/functions/v1/auto-assign-gms',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRueHlpZG5rbXRybWt4dWNxcnJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NTM4NTUsImV4cCI6MjA2NjMyOTg1NX0.CQNSkJFpA1y_p2tpwzvavV0Ee4Cn1WrBcEx1IhIOdJo"}'::jsonb,
        body:='{"trigger": "auto_cron", "timestamp": "' || now() || '"}'::jsonb
    ) as request_id;
  $$
);
