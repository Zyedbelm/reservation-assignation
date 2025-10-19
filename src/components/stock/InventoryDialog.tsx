import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Save } from 'lucide-react';
import { useProductsWithStock } from '@/hooks/useProducts';
import { useCreateInventory } from '@/hooks/useInventories';
import { format } from 'date-fns';

const InventoryDialog = () => {
  const [open, setOpen] = useState(false);
  const [inventoryDate, setInventoryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [countedQuantities, setCountedQuantities] = useState<Record<string, number>>({});

  const { data: products, isLoading } = useProductsWithStock();
  const createInventory = useCreateInventory();

  const handleQuantityChange = (productId: string, quantity: string) => {
    const numQuantity = parseInt(quantity) || 0;
    setCountedQuantities(prev => ({
      ...prev,
      [productId]: numQuantity
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!products) return;

    const items = products.map(product => ({
      product_id: product.id,
      counted_quantity: countedQuantities[product.id] || 0,
      theoretical_quantity: product.current_stock,
      unit_price: product.price,
      notes: ''
    }));

    await createInventory.mutateAsync({
      inventory_date: inventoryDate,
      notes,
      items
    });

    // Reset form
    setCountedQuantities({});
    setNotes('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ClipboardList className="h-4 w-4" />
          Nouvel Inventaire
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvel Inventaire de Stock</DialogTitle>
          <DialogDescription>
            Saisissez les quantités réellement comptées pour chaque produit
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="inventory_date">Date d'inventaire</Label>
              <Input
                id="inventory_date"
                type="date"
                value={inventoryDate}
                onChange={(e) => setInventoryDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Notes sur cet inventaire..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Produits à inventorier</h3>
            {isLoading ? (
              <div>Chargement des produits...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Stock Théorique</TableHead>
                    <TableHead>Quantité Comptée</TableHead>
                    <TableHead>Écart</TableHead>
                    <TableHead>Valeur Écart</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products?.map((product) => {
                    const countedQty = countedQuantities[product.id] || 0;
                    const variance = countedQty - product.current_stock;
                    const varianceValue = variance * product.price;
                    
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.type}</Badge>
                        </TableCell>
                        <TableCell>{product.current_stock}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={countedQuantities[product.id] || ''}
                            onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell className={variance !== 0 ? (variance > 0 ? 'text-green-600' : 'text-red-600') : ''}>
                          {variance !== 0 ? (variance > 0 ? '+' : '') + variance : '0'}
                        </TableCell>
                        <TableCell className={variance !== 0 ? (variance > 0 ? 'text-green-600' : 'text-red-600') : ''}>
                          {varianceValue !== 0 ? (varianceValue > 0 ? '+' : '') + varianceValue.toFixed(2) + ' CHF' : '0 CHF'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createInventory.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {createInventory.isPending ? 'Sauvegarde...' : 'Sauvegarder Inventaire'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryDialog;