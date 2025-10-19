
-- Audit des données existantes et corrections avant d'appliquer les contraintes

-- 1. Vérifier les statuts actuels dans la table activities
-- et les corriger si nécessaire
UPDATE public.activities 
SET status = 'pending' 
WHERE status NOT IN ('pending', 'confirmed', 'completed', 'cancelled');

-- 2. Vérifier les types d'activités actuels et les corriger
UPDATE public.activities 
SET activity_type = 'gaming' 
WHERE activity_type NOT IN ('gaming', 'formation', 'maintenance', 'admin');

-- 3. Corriger les durées négatives ou nulles
UPDATE public.activities 
SET duration = 60 
WHERE duration <= 0 OR duration IS NULL;

-- 4. Corriger les heures de fin qui sont antérieures aux heures de début
UPDATE public.activities 
SET end_time = (start_time::time + (duration || ' minutes')::interval)::time
WHERE start_time >= end_time;

-- 5. Vérifier et corriger les niveaux de compétence hors limites
UPDATE public.gm_game_competencies 
SET competency_level = CASE 
  WHEN competency_level < 1 THEN 1
  WHEN competency_level > 10 THEN 10
  ELSE competency_level
END
WHERE competency_level < 1 OR competency_level > 10;

-- 6. Vérifier et corriger les rôles invalides dans profiles
UPDATE public.profiles 
SET role = 'gm' 
WHERE role NOT IN ('admin', 'gm');

-- Maintenant appliquer les contraintes de validation
ALTER TABLE public.activities 
ADD CONSTRAINT check_valid_status 
CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'));

ALTER TABLE public.activities 
ADD CONSTRAINT check_valid_activity_type 
CHECK (activity_type IN ('gaming', 'formation', 'maintenance', 'admin'));

ALTER TABLE public.activities 
ADD CONSTRAINT check_activity_times 
CHECK (start_time < end_time);

ALTER TABLE public.activities 
ADD CONSTRAINT check_duration_positive 
CHECK (duration > 0);

ALTER TABLE public.gm_game_competencies 
ADD CONSTRAINT check_competency_level 
CHECK (competency_level >= 1 AND competency_level <= 10);

ALTER TABLE public.profiles 
ADD CONSTRAINT check_valid_role 
CHECK (role IN ('admin', 'gm'));
