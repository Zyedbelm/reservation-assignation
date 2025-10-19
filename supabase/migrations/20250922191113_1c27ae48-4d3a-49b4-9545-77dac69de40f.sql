-- Add RLS policies for GMs to update and delete their own stock movements
CREATE POLICY "GMs can update their own sales stock movements" 
ON stock_movements 
FOR UPDATE 
USING (
  movement_type = 'sale' AND 
  gm_id IN (
    SELECT profiles.gm_id 
    FROM profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'gm'
  )
)
WITH CHECK (
  movement_type = 'sale' AND 
  gm_id IN (
    SELECT profiles.gm_id 
    FROM profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'gm'
  )
);

CREATE POLICY "GMs can delete their own sales stock movements" 
ON stock_movements 
FOR DELETE 
USING (
  movement_type = 'sale' AND 
  gm_id IN (
    SELECT profiles.gm_id 
    FROM profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'gm'
  )
);