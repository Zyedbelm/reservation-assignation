-- Fix RLS policies for profiles table
DROP POLICY IF EXISTS "Allow all operations on profiles" ON public.profiles;

-- Create more specific policies for profiles
CREATE POLICY "Users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Fix the cron schedule calculation function
DROP FUNCTION IF EXISTS get_next_sync_time();

CREATE OR REPLACE FUNCTION get_next_sync_time()
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
AS $$
DECLARE
    next_sync TIMESTAMP WITH TIME ZONE;
    current_hour INTEGER;
BEGIN
    current_hour := EXTRACT(hour FROM NOW())::integer;
    
    -- Calculate next 6-hour interval (0, 6, 12, 18)
    IF current_hour < 6 THEN
        next_sync := date_trunc('day', NOW()) + INTERVAL '6 hours';
    ELSIF current_hour < 12 THEN
        next_sync := date_trunc('day', NOW()) + INTERVAL '12 hours';
    ELSIF current_hour < 18 THEN
        next_sync := date_trunc('day', NOW()) + INTERVAL '18 hours';
    ELSE
        next_sync := date_trunc('day', NOW()) + INTERVAL '1 day';
    END IF;
    
    RETURN next_sync;
END;
$$;