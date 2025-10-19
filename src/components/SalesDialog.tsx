import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, ShoppingCart } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useCreateBulkStockMovements } from '@/hooks/useStockMovements';
import { useAuth } from '@/hooks/useAuth';

interface SaleItem {
  product_id: string;
  quantity: number;
}

interface SalesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  assignedGmId?: string;
}

const SalesDialog = ({ open, onOpenChange, eventId, eventTitle, assignedGmId }: SalesDialogProps) => {
  const { data: products } = useProducts();
  const { profile } = useAuth();
  const createBulkMovements = useCreateBulkStockMovements();
  
  const [salesItems, setSalesItems] = useState<SaleItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [globalPaymentMethod, setGlobalPaymentMethod] = useState('twint');

  const handleAddItem = () => {
    if (!selectedProductId || quantity <= 0) return;

    const existingIndex = salesItems.findIndex(item => item.product_id === selectedProductId);
    
    if (existingIndex >= 0) {
      // Ajouter à la quantité existante
      const updatedItems = [...salesItems];
      updatedItems[existingIndex].quantity += quantity;
      setSalesItems(updatedItems);
    } else {
      // Ajouter un nouvel item
      setSalesItems([...salesItems, { product_id: selectedProductId, quantity }]);
    }

    setSelectedProductId('');
    setQuantity(1);
  };

  const handleRemoveItem = (index: number) => {
    setSalesItems(salesItems.filter((_, i) => i !== index));
  };

  const handleUpdateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(index);
      return;
    }

    const updatedItems = [...salesItems];
    updatedItems[index].quantity = newQuantity;
    setSalesItems(updatedItems);
  };

  const handleSubmit = async () => {
    if (salesItems.length === 0) {
      return;
    }

    // Déterminer le GM ID à utiliser pour la vente
    let gmIdForSale: string | null = null;
    
    if (profile?.role === 'admin') {
      // Admin peut créer des ventes pour n'importe quel GM (ou aucun)
      gmIdForSale = assignedGmId || null;
    } else if (profile?.role === 'gm') {
      // GM peut créer des ventes seulement pour ses propres événements
      if (assignedGmId && profile.gm_id !== assignedGmId) {
        alert('Erreur: Vous ne pouvez pas enregistrer des ventes pour un événement assigné à un autre GM.');
        return;
      }
      gmIdForSale = profile.gm_id;
    } else {
      alert('Erreur: Vous n\'avez pas les permissions pour enregistrer des ventes.');
      return;
    }

    try {
      // Créer les mouvements de stock (quantités négatives pour les ventes)
      const movements = salesItems.map(item => ({
        product_id: item.product_id,
        movement_type: 'sale' as const,
        quantity: -item.quantity, // Négatif pour les ventes
        reference: `Événement: ${eventTitle}`,
        notes: `Vente lors de l'événement du ${new Date().toLocaleDateString('fr-FR')} - Mode de paiement: ${globalPaymentMethod === 'twint' ? 'Twint' : 'CB - Stripe'}`,
        event_id: eventId,
        gm_id: gmIdForSale
      }));

      await createBulkMovements.mutateAsync(movements);
      
      // Réinitialiser le formulaire
      setSalesItems([]);
      setGlobalPaymentMethod('twint');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to record sales:', error);
    }
  };

  const getTotalValue = () => {
    return salesItems.reduce((total, item) => {
      const product = products?.find(p => p.id === item.product_id);
      return total + (product ? product.price * item.quantity : 0);
    }, 0);
  };

  const getProductById = (productId: string) => {
    return products?.find(p => p.id === productId);
  };

  const availableProducts = products?.filter(
    p => !salesItems.some(item => item.product_id === p.id)
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Saisir les Ventes - {eventTitle}
          </DialogTitle>
          <DialogDescription>
            Enregistrez les ventes réalisées lors de cet événement
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ajouter un produit */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ajouter un produit vendu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="product">Produit</Label>
                  <select
                    id="product"
                    className="w-full p-2 border rounded-md"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                  >
                    <option value="">Sélectionnez un produit</option>
                    {availableProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {product.price.toFixed(2)} CHF
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-32">
                  <Label htmlFor="quantity">Quantité</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>

                <Button 
                  onClick={handleAddItem}
                  disabled={!selectedProductId || quantity <= 0}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Mode de paiement global */}
          {salesItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mode de paiement</CardTitle>
                <CardDescription>
                  Sélectionnez le mode de paiement pour cette vente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="global-payment">Mode de paiement pour toute la vente</Label>
                    <select
                      id="global-payment"
                      className="w-full p-3 border rounded-md"
                      value={globalPaymentMethod}
                      onChange={(e) => setGlobalPaymentMethod(e.target.value)}
                    >
                      <option value="twint">Twint</option>
                      <option value="stripe">CB - Stripe</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Badge variant="outline" className="mb-1">
                      {globalPaymentMethod === 'twint' ? 'Twint' : 'CB - Stripe'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Liste des ventes */}
          {salesItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Produits vendus</CardTitle>
                <CardDescription>
                  {salesItems.length} produit{salesItems.length > 1 ? 's' : ''} - 
                  Total: {getTotalValue().toFixed(2)} CHF
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {salesItems.map((item, index) => {
                    const product = getProductById(item.product_id);
                    if (!product) return null;

                    return (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{product.name}</div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Badge variant="outline">{product.type}</Badge>
                            <span>{product.price.toFixed(2)} CHF/unité</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 0)}
                              className="w-20"
                            />
                            <span className="text-sm text-gray-600">unités</span>
                          </div>

                          <div className="text-right min-w-20">
                            <div className="font-bold">
                              {(product.price * item.quantity).toFixed(2)} CHF
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSubmit}
              disabled={salesItems.length === 0 || createBulkMovements.isPending}
              className="flex-1"
            >
              {createBulkMovements.isPending ? 'Enregistrement...' : 'Enregistrer les Ventes'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SalesDialog;