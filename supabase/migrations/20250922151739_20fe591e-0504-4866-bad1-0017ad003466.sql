-- Fix duplicate event mapping patterns for "Serviteur de la Rédemption" games
-- Update the first mapping to be more specific for "Serviteur de la Rédemption I"
UPDATE event_game_mappings 
SET event_name_pattern = 'serviteur de la rédemption i'
WHERE id = '54132da7-7a6a-4959-a785-cc3a94d0a1d9';

-- Update the second mapping to be more specific for "Serviteur de la Rédemption II"  
UPDATE event_game_mappings 
SET event_name_pattern = 'serviteur de la rédemption ii'
WHERE id = '9424479b-e255-438a-8e31-177e1d450c4f';