
-- Extend game_masters table with HR information
ALTER TABLE public.game_masters 
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT,
ADD COLUMN birth_date DATE,
ADD COLUMN avs_number TEXT UNIQUE,
ADD COLUMN hire_date DATE,
ADD COLUMN is_active BOOLEAN DEFAULT true,
ADD COLUMN termination_date DATE,
ADD COLUMN phone TEXT,
ADD COLUMN address TEXT;

-- Update existing names to split into first_name and last_name
UPDATE public.game_masters 
SET first_name = SPLIT_PART(name, ' ', 1),
    last_name = CASE 
        WHEN SPLIT_PART(name, ' ', 2) != '' THEN SPLIT_PART(name, ' ', 2)
        ELSE ''
    END;

-- Create table for GM documents
CREATE TABLE public.gm_documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    gm_id UUID REFERENCES public.game_masters(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL, -- 'resignation_letter', 'payslip', 'medical_certificate', 'contract', 'other'
    document_name TEXT NOT NULL,
    file_path TEXT,
    upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for game trainings/formations
CREATE TABLE public.games (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT, -- 'Escape Game', 'Racing', 'Action', 'Horror', etc.
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for GM game competencies
CREATE TABLE public.gm_game_competencies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    gm_id UUID REFERENCES public.game_masters(id) ON DELETE CASCADE,
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
    competency_level INTEGER CHECK (competency_level >= 1 AND competency_level <= 6),
    training_date DATE,
    last_assessment_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(gm_id, game_id)
);

-- Enable RLS on new tables
ALTER TABLE public.gm_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gm_game_competencies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables
CREATE POLICY "Allow all operations on gm_documents" ON public.gm_documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on games" ON public.games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on gm_game_competencies" ON public.gm_game_competencies FOR ALL USING (true) WITH CHECK (true);

-- Insert some sample games
INSERT INTO public.games (name, category, description) VALUES
('Half-Life: Alyx', 'Action', 'Jeu VR d''action et d''aventure'),
('Beat Saber', 'Rythme', 'Jeu de rythme avec sabres laser'),
('The Walking Dead: Saints & Sinners', 'Horror', 'Survie zombie en VR'),
('Superhot VR', 'Action', 'Jeu d''action au ralenti'),
('Job Simulator', 'Simulation', 'Simulation d''emplois humoristique'),
('Arizona Sunshine', 'Horror', 'Shooter zombie en VR'),
('Pavlov VR', 'Action', 'Jeu de tir tactique multijoueur'),
('Escape the Lost Pyramid', 'Escape Game', 'Escape game Assassin''s Creed');

-- Update existing GM competencies to reference games table
-- (This will need to be done manually based on existing skills data)
