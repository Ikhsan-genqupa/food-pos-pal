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
        'product-card group relative',
        isOutOfStock && 'opacity-70 cursor-not-allowed grayscale'
      )}
      onClick={() => !isOutOfStock && onAdd(product)}
    >
      {/* Image */}
      <div className="aspect-square bg-muted relative overflow-hidden">
        <img
          src={product.image || '/placeholder.svg'}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = '/placeholder.svg';
          }}
        />
        {product.isBundle && (
          <div className="absolute top-2 left-2 z-10">
            <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm">
              <Package className="h-2.5 w-2.5" />
              Paket
            </span>
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center z-20">
            <span className="bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight shadow-md">
              Stok Habis
            </span>
          </div>
        )}
        {!isOutOfStock && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-full shadow-lg">
              <Plus className="h-3.5 w-3.5" />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 bg-card border-t border-border">
        <h3 className="font-medium text-foreground text-sm line-clamp-1 mb-0.5">{product.name}</h3>
        <div className="flex items-center justify-between">
          <p className="text-primary text-xs font-bold">{formatCurrency(product.price)}</p>
          <span className={cn(
            "text-[10px] font-medium px-1.5 py-0.5 rounded",
            isOutOfStock ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
          )}>
            Stok: {stock}
          </span>
        </div>
      </div>
    </div>
  );
}
