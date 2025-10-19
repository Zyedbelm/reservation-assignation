import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Package, ShoppingCart, Settings, TrendingUp, Edit, Trash2 } from 'lucide-react';
import { useStockMovements, useCreateStockMovement, useUpdateStockMovement, useDeleteStockMovement } from '@/hooks/useStockMovements';
import { useProducts } from '@/hooks/useProducts';
import { useGMPublicNames } from '@/hooks/useGMPublicNames';
import { useActivities } from '@/hooks/useActivities';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MovementFormData {
  product_id: string;
  movement_type: 'initial' | 'purchase' | 'sale' | 'adjustment';
  quantity: number;
  unit_price?: string | number;
  reference: string;
  notes: string;
}

interface MovementFormProps {
  formData: MovementFormData;
  setFormData: React.Dispatch<React.SetStateAction<MovementFormData>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
  products: any[] | undefined;
}

const MovementForm: React.FC<MovementFormProps> = ({ 
  formData, 
  setFormData, 
  onSubmit, 
  onCancel, 
  products 
}) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div>
      <Label htmlFor="product">Produit</Label>
      <Select
        value={formData.product_id}
        onValueChange={(value) => setFormData({ ...formData, product_id: value })}
        required
      >
        <SelectTrigger>
          <SelectValue placeholder="Sélectionnez un produit" />
        </SelectTrigger>
        <SelectContent>
          {products?.map((product) => (
            <SelectItem key={product.id} value={product.id}>
              {product.name} - {product.type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div>
      <Label htmlFor="type">Type de mouvement</Label>
      <Select
        value={formData.movement_type}
        onValueChange={(value: any) => setFormData({ ...formData, movement_type: value })}
        required
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="initial">Stock Initial</SelectItem>
          <SelectItem value="purchase">Achat</SelectItem>
          <SelectItem value="sale">Vente</SelectItem>
          <SelectItem value="adjustment">Ajustement Manuel</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div>
      <Label htmlFor="quantity">
        Quantité {formData.movement_type === 'adjustment' ? '(+ pour ajouter, - pour retirer)' : ''}
      </Label>
      <Input
        id="quantity"
        type="number"
        value={formData.quantity}
        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
        required
      />
    </div>

    {(formData.movement_type === 'purchase' || formData.movement_type === 'initial' || formData.movement_type === 'sale') && (
      <div>
        <Label htmlFor="unit_price">Prix unitaire (CHF)</Label>
        <Input
          id="unit_price"
          type="text"
          value={formData.unit_price}
          onChange={(e) => {
            const value = e.target.value;
            // Permettre seulement les chiffres, points et virgules
            if (/^[0-9]*[.,]?[0-9]*$/.test(value) || value === '') {
              setFormData({ ...formData, unit_price: value });
            }
          }}
          placeholder="Ex: 2,50 ou 2.50"
        />
      </div>
    )}

    <div>
      <Label htmlFor="reference">Référence</Label>
      <Input
        id="reference"
        value={formData.reference}
        onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
        placeholder="Ex: Facture #123, Inventaire 2024"
      />
    </div>

    <div>
      <Label htmlFor="notes">Notes</Label>
      <Textarea
        id="notes"
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        placeholder="Notes optionnelles..."
      />
    </div>

    <div className="flex gap-2 pt-4">
      <Button type="submit" className="flex-1">
        Enregistrer
      </Button>
      <Button 
        type="button" 
        variant="outline" 
        onClick={onCancel}
      >
        Annuler
      </Button>
    </div>
  </form>
);

const StockMovements = () => {
  const { data: movements, isLoading } = useStockMovements();
  const { data: products } = useProducts();
  const { data: gmPublicNames } = useGMPublicNames();
  const { data: activities } = useActivities();
  const createMovement = useCreateStockMovement();
  const updateMovement = useUpdateStockMovement();
  const deleteMovement = useDeleteStockMovement();

  // Helper functions
  const getGMDisplayName = (gmId: string) => {
    const gmName = gmPublicNames?.find(gm => gm.gm_id === gmId);
    return gmName?.display_name || 'GM inconnu';
  };

  const getEventTitle = (eventId: string) => {
    const event = activities?.find(activity => activity.id === eventId);
    return event?.title || 'Événement inconnu';
  };

  const getLastKnownUnitPrice = (productId: string, currentMovementDate: string) => {
    if (!movements) return null;
    
    // Trouver le dernier mouvement avec un prix unitaire pour ce produit
    // avant ou égal à la date du mouvement actuel
    const relevantMovements = movements
      .filter(m => 
        m.product_id === productId && 
        m.unit_price && 
        new Date(m.created_at) <= new Date(currentMovementDate)
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return relevantMovements[0]?.unit_price || null;
  };

  const synthesizeNotes = (notes: string, movementType: string, createdAt: string) => {
    if (!notes || notes === '-') return '-';
    
    // Pour les ventes, extraire le mode de paiement
    if (movementType === 'sale') {
      const date = format(new Date(createdAt), 'dd/MM/yyyy', { locale: fr });
      
      // Extraire le mode de paiement des notes
      let paymentMethod = '';
      if (notes.toLowerCase().includes('twint')) {
        paymentMethod = 'Twint';
      } else if (notes.toLowerCase().includes('stripe') || notes.toLowerCase().includes('cb')) {
        paymentMethod = 'CB';
      }
      
      return paymentMethod ? `Vente du ${date} - Paiement : ${paymentMethod}` : `Vente du ${date}`;
    }
    
    // Pour les autres types, garder une version courte
    const shortNotes = notes.length > 50 ? notes.substring(0, 47) + '...' : notes;
    return shortNotes;
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingMovementId, setEditingMovementId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MovementFormData>({
    product_id: '',
    movement_type: 'purchase',
    quantity: 1,
    unit_price: '',
    reference: '',
    notes: ''
  });

  const movementTypeLabels = {
    initial: 'Stock Initial',
    purchase: 'Achat',
    sale: 'Vente',
    adjustment: 'Ajustement Manuel'
  };

  const movementTypeColors = {
    initial: 'bg-blue-100 text-blue-800',
    purchase: 'bg-green-100 text-green-800',
    sale: 'bg-red-100 text-red-800',
    adjustment: 'bg-yellow-100 text-yellow-800'
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.product_id || formData.quantity === 0) {
      return;
    }

    // Convertir le prix en number si c'est une string
    const unitPriceValue = formData.unit_price && formData.unit_price !== '' 
      ? (typeof formData.unit_price === 'string' 
          ? parseFloat(formData.unit_price.replace(',', '.')) 
          : formData.unit_price)
      : undefined;

    try {
      if (isEditMode && editingMovementId) {
        await updateMovement.mutateAsync({
          id: editingMovementId,
          data: {
            product_id: formData.product_id,
            movement_type: formData.movement_type,
            quantity: formData.quantity,
            reference: formData.reference,
            notes: formData.notes,
            unit_price: unitPriceValue
          }
        });
      } else {
        await createMovement.mutateAsync({
          product_id: formData.product_id,
          movement_type: formData.movement_type,
          quantity: formData.quantity,
          reference: formData.reference,
          notes: formData.notes,
          unit_price: unitPriceValue
        });
      }
      
      setIsDialogOpen(false);
      setIsEditMode(false);
      setEditingMovementId(null);
      setFormData({
        product_id: '',
        movement_type: 'purchase',
        quantity: 1,
        unit_price: '',
        reference: '',
        notes: ''
      });
    } catch (error) {
      console.error('Movement operation failed:', error);
    }
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setIsEditMode(false);
    setEditingMovementId(null);
    setFormData({
      product_id: '',
      movement_type: 'purchase',
      quantity: 1,
      unit_price: '',
      reference: '',
      notes: ''
    });
  };

  const handleEditMovement = (movement: any) => {
    setIsEditMode(true);
    setEditingMovementId(movement.id);
    setFormData({
      product_id: movement.product_id,
      movement_type: movement.movement_type,
      quantity: movement.quantity,
      unit_price: movement.unit_price ? movement.unit_price.toString().replace('.', ',') : '',
      reference: movement.reference || '',
      notes: movement.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDeleteMovement = async (movementId: string) => {
    try {
      await deleteMovement.mutateAsync(movementId);
    } catch (error) {
      console.error('Delete movement failed:', error);
    }
  };

  if (isLoading) {
    return <div>Chargement des mouvements...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Mouvements de Stock</h2>
          <p className="text-gray-600">Historique des achats et ajustements</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Mouvement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {isEditMode ? 'Modifier le mouvement de stock' : 'Ajouter un mouvement de stock'}
              </DialogTitle>
            </DialogHeader>
            <MovementForm 
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              products={products}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Tous
          </TabsTrigger>
          <TabsTrigger value="initial" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Stock Initial
          </TabsTrigger>
          <TabsTrigger value="purchase" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Achats
          </TabsTrigger>
          <TabsTrigger value="sale" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Ventes
          </TabsTrigger>
          <TabsTrigger value="adjustment" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Ajustements
          </TabsTrigger>
        </TabsList>

        {['all', 'initial', 'purchase', 'sale', 'adjustment'].map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue}>
            <Card>
              <CardHeader>
                <CardTitle>
                 {tabValue === 'all' ? 'Tous les mouvements' : 
                   tabValue === 'initial' ? 'Stock initial' :
                   tabValue === 'purchase' ? 'Achats' : 
                   tabValue === 'sale' ? 'Ventes' : 'Ajustements manuels'}
                </CardTitle>
                <CardDescription>
                  Historique des mouvements de stock
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead>Prix unitaire</TableHead>
                      <TableHead>GM/Événement</TableHead>
                      <TableHead>Référence</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                     {movements
                       ?.filter(movement => tabValue === 'all' || movement.movement_type === tabValue)
                       ?.map((movement) => (
                       <TableRow key={movement.id}>
                         <TableCell>
                           {format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                         </TableCell>
                         <TableCell>
                           <div>
                             <div className="font-medium">{movement.products?.name}</div>
                             <div className="text-sm text-gray-600">{movement.products?.type}</div>
                           </div>
                         </TableCell>
                         <TableCell>
                           <Badge 
                             variant="outline" 
                             className={movementTypeColors[movement.movement_type]}
                           >
                             {movementTypeLabels[movement.movement_type]}
                           </Badge>
                         </TableCell>
                          <TableCell>
                            <span className={`font-medium ${
                              movement.movement_type === 'sale' || movement.movement_type === 'adjustment' && movement.quantity < 0
                                ? 'text-red-600' 
                                : 'text-green-600'
                            }`}>
                              {movement.movement_type === 'sale' 
                                ? `-${Math.abs(movement.quantity)}` 
                                : movement.movement_type === 'adjustment' && movement.quantity < 0
                                  ? movement.quantity
                                  : `+${movement.quantity}`
                              }
                            </span>
                          </TableCell>
                           <TableCell>
                             {movement.unit_price ? (
                               `${movement.unit_price.toFixed(2)} CHF`
                             ) : (
                               (() => {
                                 const lastKnownPrice = getLastKnownUnitPrice(movement.product_id, movement.created_at);
                                 return lastKnownPrice ? (
                                   <span className="text-muted-foreground">
                                     {lastKnownPrice.toFixed(2)} CHF*
                                   </span>
                                 ) : '-';
                               })()
                             )}
                           </TableCell>
                           <TableCell>
                             {movement.movement_type === 'sale' && movement.gm_id ? (
                               <div>
                                 <div className="text-sm font-medium">{getGMDisplayName(movement.gm_id)}</div>
                                 {movement.event_id && (
                                   <div className="text-xs text-muted-foreground">
                                     {getEventTitle(movement.event_id)}
                                   </div>
                                 )}
                               </div>
                             ) : movement.event_id ? (
                               <div className="text-xs text-muted-foreground">
                                 {getEventTitle(movement.event_id)}
                               </div>
                             ) : '-'}
                           </TableCell>
                          <TableCell>{movement.reference || '-'}</TableCell>
                           <TableCell className="max-w-48">
                             {synthesizeNotes(movement.notes || '', movement.movement_type, movement.created_at)}
                           </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditMovement(movement)}
                                className="h-8 w-8"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Êtes-vous sûr de vouloir supprimer ce mouvement de stock ? Cette action est irréversible.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteMovement(movement.id)}>
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </CardContent>
             </Card>
           </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default StockMovements;