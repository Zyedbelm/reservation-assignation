-- Add column for IT work hours in monthly reports
ALTER TABLE public.monthly_reports 
ADD COLUMN travaux_informatiques_hours integer DEFAULT 0;