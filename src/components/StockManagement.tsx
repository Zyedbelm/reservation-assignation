import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, TrendingUp, ShoppingCart, BarChart3 } from 'lucide-react';
import ProductManagement from './stock/ProductManagement';
import StockOverview from './stock/StockOverview';
import StockMovements from './stock/StockMovements';
import StockAnalytics from './stock/StockAnalytics';

const StockManagement = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Package className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Gestion des Stocks</h1>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Produits
          </TabsTrigger>
          <TabsTrigger value="movements" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Mouvements
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Analyses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <StockOverview />
        </TabsContent>

        <TabsContent value="products">
          <ProductManagement />
        </TabsContent>

        <TabsContent value="movements">
          <StockMovements />
        </TabsContent>

        <TabsContent value="analytics">
          <StockAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StockManagement;