-- Phase 1: CORRECTION CRITIQUE DE SÉCURITÉ
-- Supprimer les policies dangereuses "Allow all operations" et les remplacer par des policies sécurisées

-- 1. ACTIVITIES TABLE - Remplacer la policy dangereuse
DROP POLICY IF EXISTS "Allow all operations on activities" ON public.activities;

-- Nouvelles policies sécurisées pour activities
CREATE POLICY "Authenticated users can view activities" 
ON public.activities 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage activities" 
ON public.activities 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "GMs can view their assigned activities" 
ON public.activities 
FOR SELECT 
USING (
  assigned_gm_id IN (
    SELECT gm_id FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'gm'
  )
);

-- 2. GM_AVAILABILITIES TABLE - Remplacer la policy dangereuse
DROP POLICY IF EXISTS "Allow all operations on gm_availabilities" ON public.gm_availabilities;

-- Nouvelles policies sécurisées pour gm_availabilities
CREATE POLICY "Admins can manage all availabilities" 
ON public.gm_availabilities 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "GMs can manage their own availabilities" 
ON public.gm_availabilities 
FOR ALL 
USING (
  gm_id IN (
    SELECT gm_id FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'gm'
  )
)
WITH CHECK (
  gm_id IN (
    SELECT gm_id FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'gm'
  )
);

-- 3. GAMES TABLE - Remplacer la policy dangereuse
DROP POLICY IF EXISTS "Allow all operations on games" ON public.games;

-- Nouvelles policies sécurisées pour games
CREATE POLICY "Authenticated users can view games" 
ON public.games 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage games" 
ON public.games 
FOR INSERT, UPDATE, DELETE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- 4. GAME_MASTERS TABLE - Remplacer la policy dangereuse  
DROP POLICY IF EXISTS "Allow all operations on game_masters" ON public.game_masters;

-- Nouvelles policies sécurisées pour game_masters
CREATE POLICY "Admins can view all game masters" 
ON public.game_masters 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins can manage game masters" 
ON public.game_masters 
FOR INSERT, UPDATE, DELETE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "GMs can view their own profile" 
ON public.game_masters 
FOR SELECT 
USING (
  id IN (
    SELECT gm_id FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'gm'
  )
);

-- 5. MONTHLY_REPORTS TABLE - Remplacer la policy dangereuse
DROP POLICY IF EXISTS "Allow all operations on monthly_reports" ON public.monthly_reports;

-- Nouvelles policies sécurisées pour monthly_reports
CREATE POLICY "Admins can manage all reports" 
ON public.monthly_reports 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "GMs can view their own reports" 
ON public.monthly_reports 
FOR SELECT 
USING (
  gm_id IN (
    SELECT gm_id FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'gm'
  )
);

-- 6. GM_GAME_COMPETENCIES TABLE - Remplacer la policy dangereuse
DROP POLICY IF EXISTS "Allow all operations on gm_game_competencies" ON public.gm_game_competencies;

-- Nouvelles policies sécurisées pour gm_game_competencies
CREATE POLICY "Admins can manage all competencies" 
ON public.gm_game_competencies 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "GMs can view their own competencies" 
ON public.gm_game_competencies 
FOR SELECT 
USING (
  gm_id IN (
    SELECT gm_id FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'gm'
  )
);