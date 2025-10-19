-- Remove the old constraint that doesn't include "menage"
ALTER TABLE activities DROP CONSTRAINT IF EXISTS check_valid_activity_type;