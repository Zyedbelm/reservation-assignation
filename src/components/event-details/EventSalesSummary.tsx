import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Edit2, Trash2, Plus } from 'lucide-react';
import { useEventSales, useUpdateStockMovement, useDeleteStockMovement } from '@/hooks/useStockMovements';
import { useAuth } from '@/hooks/useAuth';
import SalesDialog from '@/components/SalesDialog';


interface EventSalesSummaryProps {
  eventId: string;
  eventTitle: string;
  assignedGmId?: string;
}

const EventSalesSummary = ({ eventId, eventTitle, assignedGmId }: EventSalesSummaryProps) => {
  const { data: sales, isLoading } = useEventSales(eventId);
  const { profile, loading: profileLoading } = useAuth();
  const updateStockMovement = useUpdateStockMovement();
  const deleteStockMovement = useDeleteStockMovement();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState(0);
  const [salesDialogOpen, setSalesDialogOpen] = useState(false);
  

  const canModifySales = useMemo(() => {
    if (profileLoading || !profile) {
      return false;
    }
    
    if (profile.role === 'admin') {
      return true;
    }
    
    if (profile.role === 'gm') {
      // GM peut modifier s'il est assigné à l'événement OU si l'événement n'a pas d'assignation
      return !assignedGmId || profile.gm_id === assignedGmId;
    }
    
    return false;
  }, [profile?.role, profile?.gm_id, assignedGmId, profileLoading]);

  const handleEditQuantity = async (sale: any) => {
    console.log('Editing quantity:', { editQuantity, sale });
    
    if (editQuantity <= 0) {
      console.log('Invalid quantity:', editQuantity);
      return;
    }
    
    try {
      console.log('Updating stock movement with data:', {
        id: sale.id,
        quantity: -editQuantity,
        unit_price: sale.unit_price || sale.products.price
      });
      
      await updateStockMovement.mutateAsync({
        id: sale.id,
        data: {
          quantity: -editQuantity, // Négatif pour les ventes
          unit_price: sale.unit_price || sale.products.price
        }
      });
      
      console.log('Stock movement updated successfully');
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update sale:', error);
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    console.log('Attempting to delete sale:', saleId);
    
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette vente ?')) {
      try {
        console.log('Deleting stock movement...');
        await deleteStockMovement.mutateAsync(saleId);
        console.log('Stock movement deleted successfully');
      } catch (error) {
        console.error('Failed to delete sale:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Résumé des Ventes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement des ventes...</p>
        </CardContent>
      </Card>
    );
  }

  if (!sales || sales.length === 0) {
    return (
      <>
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Résumé des Ventes
            </div>
            {canModifySales && (
              <Button 
                variant="outline" 
                size="sm"
                disabled={profileLoading}
                onClick={() => setSalesDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter des ventes
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">
            Aucune vente enregistrée pour cet événement
          </p>
        </CardContent>
        </Card>
        
        <SalesDialog
          open={salesDialogOpen}
          onOpenChange={setSalesDialogOpen}
          eventId={eventId}
          eventTitle={eventTitle}
          assignedGmId={assignedGmId}
        />
      </>
    );
  }

  const totalSales = sales.reduce((sum, sale) => sum + sale.total_price, 0);
  const totalItems = sales.reduce((sum, sale) => sum + Math.abs(sale.quantity), 0);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Résumé des Ventes
            </div>
            {canModifySales && (
              <Button 
                variant="outline" 
                size="sm"
                disabled={profileLoading}
                onClick={() => setSalesDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter des ventes
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            {totalItems} article{totalItems > 1 ? 's' : ''} vendus - Total: {totalSales.toFixed(2)} CHF
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{sale.products.name}</div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline">{sale.products.type}</Badge>
                    <span>{(sale.unit_price || sale.products.price).toFixed(2)} CHF/unité</span>
                  </div>
                  {sale.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{sale.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {editingId === sale.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(parseInt(e.target.value) || 0)}
                        className="w-20"
                        autoFocus
                      />
                      <Button size="sm" onClick={() => handleEditQuantity(sale)}>
                        OK
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="text-center">
                        <div className="font-medium">{Math.abs(sale.quantity)} unités</div>
                        <div className="text-sm font-bold text-primary">
                          {sale.total_price.toFixed(2)} CHF
                        </div>
                      </div>

                      {canModifySales && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingId(sale.id);
                              setEditQuantity(Math.abs(sale.quantity));
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSale(sale.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}

          </div>
        </CardContent>
      </Card>
      
      <SalesDialog
        open={salesDialogOpen}
        onOpenChange={setSalesDialogOpen}
        eventId={eventId}
        eventTitle={eventTitle}
        assignedGmId={assignedGmId}
      />
    </>
  );
};

export default EventSalesSummary;