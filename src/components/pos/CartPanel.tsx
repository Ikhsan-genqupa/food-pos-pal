import React from 'react';
import { useCart } from '@/contexts/CartContext';
import { formatCurrency } from '@/data/mockData';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CartPanelProps {
  onCheckout: () => void;
}

export default function CartPanel({ onCheckout }: CartPanelProps) {
  const { items, updateQuantity, removeItem, subtotal, total, itemCount } = useCart();

  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6">
        <ShoppingBag className="h-16 w-16 mb-4 opacity-30" />
        <p className="font-medium">Keranjang kosong</p>
        <p className="text-sm mt-1">Tambahkan produk untuk memulai</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          Keranjang ({itemCount} item)
        </h2>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {items.map((item) => (
          <div key={item.product.id} className="cart-item animate-scale-in">
            {/* Product image */}
            <div className="h-14 w-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
              <img
                src={item.product.image}
                alt={item.product.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground text-sm line-clamp-1">
                {item.product.name}
              </h4>
              <p className="text-primary font-semibold text-sm">
                {formatCurrency(item.product.price)}
              </p>
            </div>

            {/* Quantity controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center font-medium">{item.quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => removeItem(item.product.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="p-4 border-t border-border space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span className="text-primary">{formatCurrency(total)}</span>
        </div>
        <Button
          className="w-full h-12 text-base font-semibold"
          onClick={onCheckout}
        >
          Bayar
        </Button>
      </div>
    </div>
  );
}
