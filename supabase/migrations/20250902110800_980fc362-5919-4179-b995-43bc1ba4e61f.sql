-- Add details column to auto_assignment_logs for diagnostic information
ALTER TABLE public.auto_assignment_logs 
ADD COLUMN details JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.auto_assignment_logs.details IS 'Diagnostic details including per-event skip reasons and category totals';