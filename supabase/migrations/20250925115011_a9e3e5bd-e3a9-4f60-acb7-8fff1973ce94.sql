-- Suppression de l'événement Da Vinci Code (doublon) 
DELETE FROM activities 
WHERE id = '564cef8a-c4dd-43b5-98b2-753c6c28fb0c' 
  AND make_event_id = '5tm83hktk1du3u6qnni9mv1uj1' 
  AND title = 'Da Vinci Code';