-- Create unique index to prevent duplicate events with same normalized ID and calendar source
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_unique_normalized_event 
ON activities (
  (REPLACE(make_event_id, '@google.com', '')),
  COALESCE(calendar_source, 'unknown')
) 
WHERE make_event_id IS NOT NULL;