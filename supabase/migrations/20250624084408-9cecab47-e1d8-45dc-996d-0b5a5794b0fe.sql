
-- Create game_masters table
CREATE TABLE public.game_masters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  specialties TEXT[] DEFAULT '{}',
  skills JSONB DEFAULT '{}',
  total_hours INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create availabilities table
CREATE TABLE public.gm_availabilities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gm_id UUID REFERENCES public.game_masters(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slots TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(gm_id, date)
);

-- Create activities table
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration INTEGER NOT NULL, -- in minutes
  activity_type TEXT NOT NULL DEFAULT 'gaming', -- gaming, formation, maintenance, admin
  required_skills TEXT[] DEFAULT '{}',
  assigned_gm_id UUID REFERENCES public.game_masters(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, assigned, confirmed, cancelled, completed
  google_event_id TEXT UNIQUE,
  bookeo_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create monthly_reports table
CREATE TABLE public.monthly_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month_year TEXT NOT NULL, -- format: YYYY-MM
  gm_id UUID REFERENCES public.game_masters(id),
  total_hours INTEGER DEFAULT 0,
  gaming_hours INTEGER DEFAULT 0,
  formation_hours INTEGER DEFAULT 0,
  maintenance_hours INTEGER DEFAULT 0,
  admin_hours INTEGER DEFAULT 0,
  earnings DECIMAL(10,2) DEFAULT 0,
  report_data JSONB DEFAULT '{}',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(month_year, gm_id)
);

-- Create sync_logs table for Google Calendar integration
CREATE TABLE public.sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL, -- full, incremental, manual
  status TEXT NOT NULL, -- success, error, in_progress
  events_processed INTEGER DEFAULT 0,
  events_created INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  events_deleted INTEGER DEFAULT 0,
  error_message TEXT,
  sync_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sync_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.game_masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gm_availabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (public access for now, can be restricted later with authentication)
CREATE POLICY "Allow all operations on game_masters" ON public.game_masters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on gm_availabilities" ON public.gm_availabilities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on activities" ON public.activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on monthly_reports" ON public.monthly_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on sync_logs" ON public.sync_logs FOR ALL USING (true) WITH CHECK (true);

-- Insert sample game masters
INSERT INTO public.game_masters (name, email, specialties, skills) VALUES
('Marie Dubois', 'marie.dubois@vrcenter.com', ARRAY['Escape Game', 'Aventure'], '{"Escape Game": 90, "Aventure": 85, "Puzzle": 80, "Horror": 60}'),
('Thomas Martin', 'thomas.martin@vrcenter.com', ARRAY['Racing', 'Action'], '{"Racing": 95, "Action": 90, "Horror": 85, "Aventure": 70}'),
('Julie Lemaire', 'julie.lemaire@vrcenter.com', ARRAY['Puzzle', 'Détente'], '{"Puzzle": 95, "Détente": 90, "Escape Game": 75, "Aventure": 80}'),
('Antoine Robert', 'antoine.robert@vrcenter.com', ARRAY['Horror', 'Action'], '{"Horror": 95, "Action": 90, "Racing": 75, "Escape Game": 85}');

-- Create function to update monthly reports
CREATE OR REPLACE FUNCTION update_monthly_reports()
RETURNS TRIGGER AS $$
BEGIN
  -- Update monthly report when activity is completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO public.monthly_reports (
      month_year,
      gm_id,
      total_hours,
      gaming_hours,
      formation_hours,
      maintenance_hours,
      admin_hours
    )
    VALUES (
      TO_CHAR(NEW.date, 'YYYY-MM'),
      NEW.assigned_gm_id,
      CASE WHEN NEW.activity_type = 'gaming' THEN NEW.duration / 60.0 ELSE 0 END +
      CASE WHEN NEW.activity_type = 'formation' THEN NEW.duration / 60.0 ELSE 0 END +
      CASE WHEN NEW.activity_type = 'maintenance' THEN NEW.duration / 60.0 ELSE 0 END +
      CASE WHEN NEW.activity_type = 'admin' THEN NEW.duration / 60.0 ELSE 0 END,
      CASE WHEN NEW.activity_type = 'gaming' THEN NEW.duration / 60.0 ELSE 0 END,
      CASE WHEN NEW.activity_type = 'formation' THEN NEW.duration / 60.0 ELSE 0 END,
      CASE WHEN NEW.activity_type = 'maintenance' THEN NEW.duration / 60.0 ELSE 0 END,
      CASE WHEN NEW.activity_type = 'admin' THEN NEW.duration / 60.0 ELSE 0 END
    )
    ON CONFLICT (month_year, gm_id) DO UPDATE SET
      total_hours = monthly_reports.total_hours + EXCLUDED.total_hours,
      gaming_hours = monthly_reports.gaming_hours + EXCLUDED.gaming_hours,
      formation_hours = monthly_reports.formation_hours + EXCLUDED.formation_hours,
      maintenance_hours = monthly_reports.maintenance_hours + EXCLUDED.maintenance_hours,
      admin_hours = monthly_reports.admin_hours + EXCLUDED.admin_hours,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for monthly reports
CREATE TRIGGER update_monthly_reports_trigger
  AFTER UPDATE ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_reports();
