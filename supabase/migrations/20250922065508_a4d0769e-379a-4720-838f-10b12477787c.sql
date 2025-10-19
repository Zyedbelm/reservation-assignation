-- Créer la table products pour gérer les produits du bar
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- boisson, snack, etc.
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer la table stock_movements pour traquer tous les mouvements de stock
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL, -- 'initial', 'purchase', 'sale', 'adjustment'
  quantity INTEGER NOT NULL, -- peut être négatif pour les ventes
  unit_price NUMERIC(10,2), -- prix unitaire pour les achats
  reference TEXT, -- référence de l'achat, événement, etc.
  notes TEXT,
  event_id UUID, -- référence à l'événement si c'est une vente
  gm_id UUID, -- GM qui a saisi la vente ou l'admin qui a fait l'ajustement
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID -- utilisateur qui a créé le mouvement
);

-- Créer un index pour optimiser les requêtes
CREATE INDEX idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX idx_stock_movements_type ON public.stock_movements(movement_type);
CREATE INDEX idx_stock_movements_event_id ON public.stock_movements(event_id);

-- Fonction pour calculer le stock actuel d'un produit
CREATE OR REPLACE FUNCTION public.get_current_stock(product_id_param UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(quantity)
    FROM public.stock_movements
    WHERE product_id = product_id_param
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Fonction pour calculer la valeur du stock d'un produit
CREATE OR REPLACE FUNCTION public.get_stock_value(product_id_param UUID)
RETURNS NUMERIC AS $$
DECLARE
  current_stock INTEGER;
  product_price NUMERIC;
BEGIN
  -- Récupérer le stock actuel
  SELECT public.get_current_stock(product_id_param) INTO current_stock;
  
  -- Récupérer le prix du produit
  SELECT price INTO product_price FROM public.products WHERE id = product_id_param;
  
  RETURN current_stock * product_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Activer RLS sur les tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour products
CREATE POLICY "Authenticated users can view products" ON public.products
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Politiques RLS pour stock_movements
CREATE POLICY "Authenticated users can view stock movements" ON public.stock_movements
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage stock movements" ON public.stock_movements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "GMs can create sales stock movements" ON public.stock_movements
  FOR INSERT WITH CHECK (
    movement_type = 'sale' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'gm' AND gm_id = stock_movements.gm_id
    )
  );

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();