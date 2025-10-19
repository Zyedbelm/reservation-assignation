-- Créer la table des inventaires de stock
CREATE TABLE public.stock_inventories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_date DATE NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer la table des éléments d'inventaire (détails par produit)
CREATE TABLE public.stock_inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID NOT NULL REFERENCES public.stock_inventories(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  counted_quantity INTEGER NOT NULL,
  theoretical_quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  variance_quantity INTEGER GENERATED ALWAYS AS (counted_quantity - theoretical_quantity) STORED,
  variance_value NUMERIC GENERATED ALWAYS AS ((counted_quantity - theoretical_quantity) * unit_price) STORED,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(inventory_id, product_id)
);

-- Activer RLS
ALTER TABLE public.stock_inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_inventory_items ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour stock_inventories
CREATE POLICY "Admins can manage all inventories" 
ON public.stock_inventories 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Authenticated users can view inventories" 
ON public.stock_inventories 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Politiques RLS pour stock_inventory_items
CREATE POLICY "Admins can manage all inventory items" 
ON public.stock_inventory_items 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Authenticated users can view inventory items" 
ON public.stock_inventory_items 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Trigger pour updated_at
CREATE TRIGGER update_stock_inventories_updated_at
  BEFORE UPDATE ON public.stock_inventories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour obtenir les écarts de stock par rapport au dernier inventaire
CREATE OR REPLACE FUNCTION public.get_stock_variance_since_last_inventory(product_id_param uuid)
RETURNS TABLE (
  theoretical_stock INTEGER,
  last_counted_stock INTEGER,
  current_variance INTEGER,
  last_inventory_date DATE
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  last_inventory_item RECORD;
  current_theoretical INTEGER;
BEGIN
  -- Obtenir le dernier inventaire pour ce produit
  SELECT sii.counted_quantity, si.inventory_date
  INTO last_inventory_item
  FROM stock_inventory_items sii
  JOIN stock_inventories si ON sii.inventory_id = si.id
  WHERE sii.product_id = product_id_param 
    AND si.status = 'completed'
  ORDER BY si.inventory_date DESC, si.created_at DESC
  LIMIT 1;
  
  -- Obtenir le stock théorique actuel
  SELECT public.get_current_stock(product_id_param) INTO current_theoretical;
  
  -- Retourner les résultats
  RETURN QUERY SELECT 
    current_theoretical,
    COALESCE(last_inventory_item.counted_quantity, 0),
    current_theoretical - COALESCE(last_inventory_item.counted_quantity, 0),
    last_inventory_item.inventory_date;
END;
$function$;