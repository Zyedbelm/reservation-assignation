import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, DollarSign, AlertTriangle, TrendingUp, ChevronDown, ChevronRight, ClipboardList } from 'lucide-react';
import { useProductsWithStock } from '@/hooks/useProducts';
import { useProductVariances } from '@/hooks/useInventories';
import InventoryDialog from './InventoryDialog';

const StockOverview = () => {
  const { data: products, isLoading, error } = useProductsWithStock();
  const { data: variances } = useProductVariances();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  if (isLoading) {
    return <div>Chargement du stock...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Erreur lors du chargement du stock: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  const totalProducts = products?.length || 0;
  const totalValue = products?.reduce((sum, product) => sum + product.stock_value, 0) || 0;
  const lowStockProducts = products?.filter(product => product.current_stock <= 5) || [];
  const outOfStockProducts = products?.filter(product => product.current_stock === 0) || [];

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  const getVarianceForProduct = (productId: string) => {
    return variances?.find(v => v.product.id === productId);
  };

  return (
    <div className="space-y-6">
      {/* Statistiques générales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produits</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur Total Stock</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalValue.toFixed(2)} CHF</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Faible</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockProducts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rupture Stock</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockProducts.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes stock faible */}
      {lowStockProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Alertes Stock Faible
            </CardTitle>
            <CardDescription>
              Produits avec un stock ≤ 5 unités
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <span className="font-medium">{product.name}</span>
                    <Badge variant="outline" className="ml-2">{product.type}</Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-orange-600">{product.current_stock} unités</div>
                    <div className="text-sm text-gray-600">{product.stock_value.toFixed(2)} CHF</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock par catégorie */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Stock par Catégorie</CardTitle>
            <CardDescription>Cliquez sur une catégorie pour voir les détails des produits</CardDescription>
          </div>
          <InventoryDialog />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {products && Object.entries(
              products.reduce((acc, product) => {
                if (!acc[product.type]) {
                  acc[product.type] = {
                    count: 0,
                    totalStock: 0,
                    totalValue: 0,
                    products: []
                  };
                }
                acc[product.type].count += 1;
                acc[product.type].totalStock += product.current_stock;
                acc[product.type].totalValue += product.stock_value;
                acc[product.type].products.push(product);
                return acc;
              }, {} as Record<string, { count: number; totalStock: number; totalValue: number; products: any[] }>)
            ).map(([type, stats]) => (
              <Collapsible key={type} open={expandedCategories.has(type)} onOpenChange={() => toggleCategory(type)}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      {expandedCategories.has(type) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="font-medium capitalize">{type}</span>
                      <Badge variant="secondary">{stats.count} produits</Badge>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{stats.totalStock} unités</div>
                      <div className="text-sm text-gray-600">{stats.totalValue.toFixed(2)} CHF</div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 ml-6 border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produit</TableHead>
                          <TableHead>Stock Théorique</TableHead>
                          <TableHead>Dernier Inventaire</TableHead>
                          <TableHead>Écart</TableHead>
                          <TableHead>Valeur Stock</TableHead>
                          <TableHead>Date Dernier Inventaire</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.products.map((product) => {
                          const variance = getVarianceForProduct(product.id);
                          const hasVariance = variance && variance.current_variance !== 0;
                          
                          return (
                            <TableRow key={product.id}>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell>{product.current_stock} unités</TableCell>
                              <TableCell>
                                {variance?.last_counted_stock !== undefined 
                                  ? `${variance.last_counted_stock} unités`
                                  : 'Aucun inventaire'
                                }
                              </TableCell>
                              <TableCell className={hasVariance ? (variance!.current_variance > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium') : ''}>
                                {variance?.current_variance !== undefined 
                                  ? variance.current_variance !== 0 
                                    ? (variance.current_variance > 0 ? '+' : '') + variance.current_variance + ' unités'
                                    : '0'
                                  : 'N/A'
                                }
                              </TableCell>
                              <TableCell>{product.stock_value.toFixed(2)} CHF</TableCell>
                              <TableCell>
                                {variance?.last_inventory_date 
                                  ? new Date(variance.last_inventory_date).toLocaleDateString('fr-FR')
                                  : 'Jamais inventorié'
                                }
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockOverview;