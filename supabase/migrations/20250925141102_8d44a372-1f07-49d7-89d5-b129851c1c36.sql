-- Update Serviteur de la Rédemption I to require 2 GMs for multi-GM testing
UPDATE games 
SET required_gms = 2, updated_at = now()
WHERE name = 'Serviteur de la Rédemption I';