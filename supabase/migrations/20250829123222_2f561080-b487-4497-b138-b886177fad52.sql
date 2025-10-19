-- Add flag to prevent automatic GM recreation for deleted GMs
ALTER TABLE public.profiles 
ADD COLUMN gm_auto_create_disabled boolean NOT NULL DEFAULT false;

-- Create index for better performance on this flag
CREATE INDEX idx_profiles_gm_auto_create_disabled ON public.profiles(gm_auto_create_disabled) WHERE gm_auto_create_disabled = true;

-- Update existing profiles that have null gm_id (likely deleted GMs) to have the flag set
UPDATE public.profiles 
SET gm_auto_create_disabled = true 
WHERE gm_id IS NULL AND role = 'gm';