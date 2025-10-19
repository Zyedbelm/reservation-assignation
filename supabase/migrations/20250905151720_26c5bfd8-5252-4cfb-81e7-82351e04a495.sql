-- After cleanup, create the unique index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_unique_normalized_event 
ON activities (
  (REPLACE(make_event_id, '@google.com', '')),
  COALESCE(calendar_source, 'unknown')
) 
WHERE make_event_id IS NOT NULL;