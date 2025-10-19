import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Package, Trash2 } from 'lucide-react';
import { useProductsWithStock, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts';
import { useToast } from '@/hooks/use-toast';

interface ProductFormData {
  name: string;
  type: string;
  price: string | number;
}

interface ProductFormProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
  editingProduct: any;
}

const ProductForm: React.FC<ProductFormProps> = ({ 
  formData, 
  setFormData, 
  onSubmit, 
  onCancel, 
  editingProduct 
}) => {
  const productTypes = ['boisson', 'snack', 'confiserie', 'accessoire', 'autre'];

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nom du produit</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Coca-Cola 33cl"
          required
        />
      </div>

      <div>
        <Label htmlFor="type">Type</Label>
        <Select
          value={formData.type}
          onValueChange={(value) => setFormData({ ...formData, type: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionnez un type" />
          </SelectTrigger>
          <SelectContent>
            {productTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="price">Prix (CHF)</Label>
        <Input
          id="price"
          type="text"
          value={formData.price}
          onChange={(e) => {
            const value = e.target.value;
            // Permettre seulement les chiffres, points et virgules
            if (/^[0-9]*[.,]?[0-9]*$/.test(value) || value === '') {
              setFormData({ 
                ...formData, 
                price: value 
              });
            }
          }}
          placeholder="Ex: 2,50 ou 2.50"
          required
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1">
          {editingProduct ? 'Modifier' : 'Créer'}
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
};

const ProductManagement = () => {
  const { data: products, isLoading } = useProductsWithStock();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    type: '',
    price: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convertir le prix en number
    const priceValue = typeof formData.price === 'string' 
      ? parseFloat(formData.price.replace(',', '.')) 
      : formData.price;
    
    if (!formData.name || !formData.type || isNaN(priceValue) || priceValue < 0) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs requis.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({
          id: editingProduct.id,
          name: formData.name,
          type: formData.type,
          price: priceValue
        });
        setEditingProduct(null);
      } else {
        await createProduct.mutateAsync({
          name: formData.name,
          type: formData.type,
          price: priceValue,
          is_active: true
        });
        setIsCreateDialogOpen(false);
      }
      
      setFormData({ name: '', type: '', price: '' });
    } catch (error) {
      console.error('Product operation failed:', error);
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      type: product.type,
      price: product.price.toString().replace('.', ',')
    });
  };

  const handleCancel = () => {
    setFormData({ name: '', type: '', price: '' });
    setEditingProduct(null);
    setIsCreateDialogOpen(false);
  };

  const handleDelete = async (productId: string) => {
    try {
      await deleteProduct.mutateAsync(productId);
    } catch (error) {
      console.error('Delete product failed:', error);
    }
  };

  if (isLoading) {
    return <div>Chargement des produits...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Gestion des Produits</h2>
          <p className="text-gray-600">Gérez vos produits et leurs informations</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Produit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un nouveau produit</DialogTitle>
            </DialogHeader>
            <ProductForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              editingProduct={editingProduct}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des produits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Produits ({products?.length || 0})
          </CardTitle>
          <CardDescription>
            Liste de tous vos produits avec leur stock actuel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Valeur Stock</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {product.type.charAt(0).toUpperCase() + product.type.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{product.price.toFixed(2)} CHF</TableCell>
                  <TableCell>
                    <span className={`font-medium ${
                      product.current_stock === 0 ? 'text-red-600' :
                      product.current_stock <= 5 ? 'text-orange-600' : 
                      'text-green-600'
                    }`}>
                      {product.current_stock}
                    </span>
                  </TableCell>
                  <TableCell>{product.stock_value.toFixed(2)} CHF</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEdit(product)}
                        className="h-8 w-8"
                      >
                        <Edit className="w-4 h-4" />
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
                              Êtes-vous sûr de vouloir supprimer le produit "{product.name}" ? Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(product.id)}>
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

      {/* Dialog d'édition */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le produit</DialogTitle>
          </DialogHeader>
          <ProductForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            editingProduct={editingProduct}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductManagement;