-- Create api_configurations table for webhook management
CREATE TABLE public.api_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('webhook', 'api_key')),
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_configurations ENABLE ROW LEVEL SECURITY;

-- Create policies for api_configurations
CREATE POLICY "Admins can manage API configurations" 
ON public.api_configurations 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Create trigger for updated_at
CREATE TRIGGER update_api_configurations_updated_at
BEFORE UPDATE ON public.api_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default webhook configuration for Make.com notifications
INSERT INTO public.api_configurations (name, type, config, is_active)
VALUES (
  'Notifications Quotidiennes GM',
  'webhook',
  jsonb_build_object(
    'url', '',
    'description', 'Webhook pour les notifications quotidiennes des changements d evenements aux GMs',
    'schedule', '0 18 * * *'
  ),
  true
);