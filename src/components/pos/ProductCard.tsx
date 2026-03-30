import React from 'react';
import { Product } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Plus, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  stock?: number;
  onAdd: (product: Product) => void;
}

export default function ProductCard({ product, stock = 0, onAdd }: ProductCardProps) {
  const isOutOfStock = stock <= 0;

  return (
    <div
      className={cn(
        'product-card group',
        isOutOfStock && 'opacity-50 cursor-not-allowed'
      )}
      onClick={() => !isOutOfStock && onAdd(product)}
    >
      {/* Image */}
      <div className="aspect-square bg-muted relative overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = '/placeholder.svg';
          }}
        />
        {product.isBundle && (
          <div className="absolute top-2 left-2">
            <span className="bg-accent text-accent-foreground px-2 py-0.5 rounded-full text-[10px] font-medium">
              Paket
            </span>
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center">
            <span className="bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-xs font-medium">
              Stok Habis
            </span>
          </div>
        )}
        {!isOutOfStock && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-primary text-primary-foreground p-2 rounded-full shadow-lg">
              <Plus className="h-4 w-4" />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-medium text-foreground line-clamp-1">{product.name}</h3>
        <div className="flex items-center justify-between mt-1">
          <p className="text-primary font-semibold">{formatCurrency(product.price)}</p>
          <span className="text-xs text-muted-foreground">Stok: {stock}</span>
        </div>
      </div>
    </div>
  );
}
