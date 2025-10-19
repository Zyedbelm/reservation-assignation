-- Create table for weekly unassigned events logs
CREATE TABLE IF NOT EXISTS public.weekly_unassigned_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unassigned_count INTEGER NOT NULL DEFAULT 0,
  urgent_count INTEGER NOT NULL DEFAULT 0,
  webhook_sent BOOLEAN NOT NULL DEFAULT false,
  webhook_url TEXT,
  summary JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weekly_unassigned_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view weekly logs" 
ON public.weekly_unassigned_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
));

CREATE POLICY "Services can insert weekly logs" 
ON public.weekly_unassigned_logs 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role' OR EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
));