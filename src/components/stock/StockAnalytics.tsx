import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { BarChart3, TrendingDown, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';
import { useProductsWithStock } from '@/hooks/useProducts';
import { useStockMovements } from '@/hooks/useStockMovements';

interface StockGap {
  productId: string;
  productName: string;
  type: string;
  theoreticalStock: number;
  actualStock: number;
  gap: number;
  gapValue: number;
  gapPercentage: number;
}

const StockAnalytics = () => {
  const { data: products, isLoading: productsLoading } = useProductsWithStock();
  const { data: movements, isLoading: movementsLoading } = useStockMovements();

  if (productsLoading || movementsLoading) {
    return <div>Chargement des analyses...</div>;
  }

  // Calculer les écarts de stock
  const stockGaps: StockGap[] = products?.map(product => {
    // Calculer le stock théorique à partir des mouvements
    const productMovements = movements?.filter(m => m.product_id === product.id) || [];
    const theoreticalStock = productMovements.reduce((sum, movement) => {
      return sum + movement.quantity;
    }, 0);

    const gap = product.current_stock - theoreticalStock;
    const gapValue = gap * product.price;
    const gapPercentage = theoreticalStock > 0 ? (gap / theoreticalStock) * 100 : 0;

    return {
      productId: product.id,
      productName: product.name,
      type: product.type,
      theoreticalStock,
      actualStock: product.current_stock,
      gap,
      gapValue,
      gapPercentage
    };
  }) || [];

  const significantGaps = stockGaps.filter(gap => Math.abs(gap.gap) > 0);
  const positiveGaps = stockGaps.filter(gap => gap.gap > 0);
  const negativeGaps = stockGaps.filter(gap => gap.gap < 0);
  const totalGapValue = stockGaps.reduce((sum, gap) => sum + Math.abs(gap.gapValue), 0);

  // Analyse des ventes par type
  const salesByType = movements?.filter(m => m.movement_type === 'sale')
    .reduce((acc, sale) => {
      const product = products?.find(p => p.id === sale.product_id);
      if (product) {
        if (!acc[product.type]) {
          acc[product.type] = { quantity: 0, value: 0 };
        }
        acc[product.type].quantity += Math.abs(sale.quantity);
        acc[product.type].value += Math.abs(sale.quantity) * product.price;
      }
      return acc;
    }, {} as Record<string, { quantity: number; value: number }>) || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-semibold">Analyses de Stock</h2>
      </div>

      {/* Statistiques des écarts */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Écarts Détectés</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{significantGaps.length}</div>
            <p className="text-xs text-muted-foreground">
              sur {stockGaps.length} produits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Écarts Positifs</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{positiveGaps.length}</div>
            <p className="text-xs text-muted-foreground">
              surplus de stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Écarts Négatifs</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{negativeGaps.length}</div>
            <p className="text-xs text-muted-foreground">
              manque de stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur des Écarts</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGapValue.toFixed(2)} CHF</div>
            <p className="text-xs text-muted-foreground">
              impact financier
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Écarts de stock détaillés */}
      {significantGaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Écarts de Stock Détectés
            </CardTitle>
            <CardDescription>
              Différence entre le stock théorique et le stock actuel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {significantGaps.map((gap) => (
                <div key={gap.productId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{gap.productName}</span>
                      <Badge variant="outline">{gap.type}</Badge>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Théorique: {gap.theoreticalStock} | Actuel: {gap.actualStock}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-bold ${gap.gap > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {gap.gap > 0 ? '+' : ''}{gap.gap} unités
                    </div>
                    <div className="text-sm text-gray-600">
                      {gap.gapValue > 0 ? '+' : ''}{gap.gapValue.toFixed(2)} CHF
                    </div>
                    <div className="text-xs text-gray-500">
                      {gap.gapPercentage > 0 ? '+' : ''}{gap.gapPercentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analyses des ventes */}
      {Object.keys(salesByType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ventes par Catégorie</CardTitle>
            <CardDescription>
              Répartition des ventes par type de produit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(salesByType)
                .sort(([,a], [,b]) => b.value - a.value)
                .map(([type, data]) => {
                  const totalSalesValue = Object.values(salesByType).reduce((sum, item) => sum + item.value, 0);
                  const percentage = (data.value / totalSalesValue) * 100;
                  
                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium capitalize">{type}</span>
                          <span className="text-sm text-gray-600 ml-2">
                            ({data.quantity} unités vendues)
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{data.value.toFixed(2)} CHF</div>
                          <div className="text-sm text-gray-600">{percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })
              }
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommandations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommandations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {negativeGaps.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Manques de stock détectés:</strong> {negativeGaps.length} produits ont un stock actuel inférieur au stock théorique. 
                  Vérifiez les ventes non enregistrées ou les pertes.
                </AlertDescription>
              </Alert>
            )}
            
            {positiveGaps.length > 0 && (
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  <strong>Surplus détectés:</strong> {positiveGaps.length} produits ont un stock actuel supérieur au théorique. 
                  Cela peut indiquer des achats non enregistrés ou des retours.
                </AlertDescription>
              </Alert>
            )}
            
            {significantGaps.length === 0 && (
              <Alert>
                <div className="h-4 w-4 rounded-full bg-green-500" />
                <AlertDescription>
                  <strong>Stock cohérent:</strong> Aucun écart significatif détecté entre le stock théorique et actuel.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockAnalytics;