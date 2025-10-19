-- Add "ménage" to the activity_type enum
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'menage';

-- Update the check constraint to include the new type
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_activity_type_check;
ALTER TABLE activities ADD CONSTRAINT activities_activity_type_check 
CHECK (activity_type IN ('gaming', 'formation', 'maintenance', 'admin', 'travaux_informatiques', 'menage'));