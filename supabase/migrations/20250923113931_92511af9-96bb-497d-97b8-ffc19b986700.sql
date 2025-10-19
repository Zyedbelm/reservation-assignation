-- Add menage_hours column to monthly_reports table
ALTER TABLE monthly_reports 
ADD COLUMN menage_hours integer DEFAULT 0;