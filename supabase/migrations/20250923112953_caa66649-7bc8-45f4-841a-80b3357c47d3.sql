-- Update the check constraint on activities table to include "menage"
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_activity_type_check;
ALTER TABLE activities ADD CONSTRAINT activities_activity_type_check 
CHECK (activity_type IN ('gaming', 'formation', 'maintenance', 'admin', 'travaux_informatiques', 'menage'));