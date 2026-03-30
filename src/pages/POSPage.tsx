import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useActiveProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useStocks } from '@/hooks/useStocks';
import { useCreateTransaction } from '@/hooks/useTransactions';
import ProductCard from '@/components/pos/ProductCard';
import CartPanel from '@/components/pos/CartPanel';
import CheckoutDialog from '@/components/pos/CheckoutDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Transaction } from '@/types';
import { Search, ShoppingCart, X, Loader2 } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';

export default function POSPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { itemCount, addItem, items, total, clearCart } = useCart();
  const outletId = user?.outletId || '';

  const { data: products = [], isLoading: productsLoading } = useActiveProducts();
  const { data: categories = [] } = useCategories();
  const { data: stocks = [] } = useStocks(outletId);
  const createTransaction = useCreateTransaction();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const filteredProducts = products.filter((product) => {
    const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getStock = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    
    if (product?.isBundle && product.bundleItems && product.bundleItems.length > 0) {
      const potentialStocks = product.bundleItems.map((item) => {
        const componentStock = stocks.find((s) => s.productId === item.productId)?.quantity || 0;
        return Math.floor(componentStock / item.quantity);
      });
      return Math.min(...potentialStocks);
    }

    const stock = stocks.find((s) => s.productId === productId);
    return stock?.quantity || 0;
  };

  const handleCheckoutComplete = async (transaction: Transaction) => {
    if (!user?.outletId) {
      toast({
        title: "Gagal Menjual",
        description: "Akun Anda belum terhubung ke cabang (outlet) manapun. Silakan lengkapi profil di Manajemen User.",
        variant: "destructive",
      });
      return;
    }

    // Save transaction to database
    await createTransaction.mutateAsync({
      outletId: user.outletId,
      items: transaction.items,
      subtotal: transaction.subtotal,
      total: transaction.total,
      paymentMethod: transaction.paymentMethod,
      cashReceived: transaction.cashReceived,
      change: transaction.change,
      cashierName: user?.email,
    });
  };

  if (productsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] lg:h-[calc(100vh-48px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari produk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          className="lg:hidden"
          onClick={() => setShowCart(true)}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Keranjang ({itemCount})
        </Button>
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-thin">
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory(null)}
          className="whitespace-nowrap"
        >
          Semua
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category.id)}
            className="whitespace-nowrap"
          >
            <span className="mr-1">{category.icon}</span>
            {category.name}
          </Button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Products grid */}
        <div className="flex-1 overflow-y-auto scrollbar-thin pr-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                stock={getStock(product.id)}
                onAdd={addItem}
              />
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Produk tidak ditemukan</p>
            </div>
          )}
        </div>

        {/* Cart panel - desktop */}
        <div className="hidden lg:block w-80 bg-card rounded-xl border border-border overflow-hidden">
          <CartPanel onCheckout={() => setCheckoutOpen(true)} />
        </div>
      </div>

      {/* Cart panel - mobile */}
      {showCart && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setShowCart(false)}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-card shadow-xl animate-slide-in">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold">Keranjang</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCart(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="h-[calc(100%-65px)]">
              <CartPanel onCheckout={() => {
                setShowCart(false);
                setCheckoutOpen(true);
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Checkout dialog */}
      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        onComplete={handleCheckoutComplete}
      />
    </div>
  );
}
