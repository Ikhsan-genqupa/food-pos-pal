import { Product, ProductCategory, Outlet, Stock, Transaction } from '@/types';
import nasiGoreng from '@/assets/products/nasi-goreng.jpg';
import mieGoreng from '@/assets/products/mie-goreng.jpg';
import ayamBakar from '@/assets/products/ayam-bakar.jpg';
import sateAyam from '@/assets/products/sate-ayam.jpg';
import esTeh from '@/assets/products/es-teh.jpg';
import jusJeruk from '@/assets/products/jus-jeruk.jpg';

export const categories: ProductCategory[] = [
  { id: '1', name: 'Makanan', icon: '🍚' },
  { id: '2', name: 'Minuman', icon: '🥤' },
  { id: '3', name: 'Snack', icon: '🍿' },
  { id: '4', name: 'Dessert', icon: '🍨' },
];

export let products: Product[] = [
  { id: '1', name: 'Nasi Goreng', categoryId: '1', price: 25000, image: nasiGoreng, createdAt: new Date() },
  { id: '2', name: 'Mie Goreng', categoryId: '1', price: 22000, image: mieGoreng, createdAt: new Date() },
  { id: '3', name: 'Ayam Bakar', categoryId: '1', price: 35000, image: ayamBakar, createdAt: new Date() },
  { id: '4', name: 'Sate Ayam', categoryId: '1', price: 30000, image: sateAyam, createdAt: new Date() },
  { id: '5', name: 'Es Teh Manis', categoryId: '2', price: 8000, image: esTeh, createdAt: new Date() },
  { id: '6', name: 'Jus Jeruk', categoryId: '2', price: 15000, image: jusJeruk, createdAt: new Date() },
];

export let outlets: Outlet[] = [];

export let stocks: Stock[] = [];

export let transactions: Transaction[] = [];

// Product functions
export function addProduct(product: Omit<Product, 'id' | 'createdAt'>): Product {
  const newProduct: Product = {
    ...product,
    id: Date.now().toString(),
    createdAt: new Date(),
  };
  products = [...products, newProduct];
  return newProduct;
}

export function updateProduct(id: string, updates: Partial<Product>): boolean {
  const index = products.findIndex(p => p.id === id);
  if (index > -1) {
    products[index] = { ...products[index], ...updates };
    return true;
  }
  return false;
}

export function deleteProduct(productId: string): boolean {
  const index = products.findIndex(p => p.id === productId);
  if (index > -1) {
    products = products.filter(p => p.id !== productId);
    // Also delete related stocks
    stocks = stocks.filter(s => s.productId !== productId);
    return true;
  }
  return false;
}

// Outlet functions
export function addOutlet(outlet: Omit<Outlet, 'id' | 'createdAt' | 'isActive'>, password: string): Outlet {
  const newOutlet: Outlet = {
    ...outlet,
    id: Date.now().toString(),
    createdAt: new Date(),
    isActive: true,
  };
  outlets = [...outlets, newOutlet];
  
  // Register user credentials
  registerOutletUser(outlet.username, password, newOutlet);
  
  // Initialize stock for this outlet with all products
  products.forEach(product => {
    stocks.push({
      id: `${product.id}-${newOutlet.id}`,
      productId: product.id,
      product,
      outletId: newOutlet.id,
      outlet: newOutlet,
      quantity: 0,
      lastUpdated: new Date(),
    });
  });
  
  return newOutlet;
}

// Get outlets by user access
export function getAccessibleOutlets(userId: string, role: string, outletId?: string): Outlet[] {
  if (role === 'admin') {
    return outlets;
  }
  return outlets.filter(o => o.id === outletId);
}

// Get transactions by outlet
export function getTransactionsByOutlet(outletId: string | 'all'): Transaction[] {
  if (outletId === 'all') return transactions;
  return transactions.filter(t => t.outletId === outletId);
}

// Get stocks by outlet  
export function getStocksByOutlet(outletId: string | 'all'): Stock[] {
  if (outletId === 'all') return stocks;
  return stocks.filter(s => s.outletId === outletId);
}

export function updateOutlet(id: string, updates: Partial<Outlet>): boolean {
  const index = outlets.findIndex(o => o.id === id);
  if (index > -1) {
    outlets[index] = { ...outlets[index], ...updates };
    return true;
  }
  return false;
}

export function deleteOutlet(outletId: string): boolean {
  const index = outlets.findIndex(o => o.id === outletId);
  if (index > -1) {
    const outlet = outlets[index];
    outlets = outlets.filter(o => o.id !== outletId);
    // Remove outlet user
    removeOutletUser(outlet.username);
    // Delete related stocks
    stocks = stocks.filter(s => s.outletId !== outletId);
    // Delete related transactions
    transactions = transactions.filter(t => t.outletId !== outletId);
    return true;
  }
  return false;
}

// Stock functions
export function updateStock(productId: string, outletId: string, quantity: number): boolean {
  const index = stocks.findIndex(s => s.productId === productId && s.outletId === outletId);
  if (index > -1) {
    stocks[index] = { ...stocks[index], quantity, lastUpdated: new Date() };
    return true;
  } else {
    // Create new stock record
    const product = products.find(p => p.id === productId);
    const outlet = outlets.find(o => o.id === outletId);
    if (product && outlet) {
      stocks.push({
        id: `${productId}-${outletId}`,
        productId,
        product,
        outletId,
        outlet,
        quantity,
        lastUpdated: new Date(),
      });
      return true;
    }
  }
  return false;
}

export function getStock(productId: string, outletId: string): number {
  const stock = stocks.find(s => s.productId === productId && s.outletId === outletId);
  return stock?.quantity || 0;
}

// Transaction functions
export function addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
  const newTransaction: Transaction = {
    ...transaction,
    id: `TRX${String(transactions.length + 1).padStart(3, '0')}`,
    createdAt: new Date(),
  };
  transactions = [...transactions, newTransaction];
  
  // Reduce stock
  transaction.items.forEach(item => {
    const stockIndex = stocks.findIndex(s => s.productId === item.productId && s.outletId === transaction.outletId);
    if (stockIndex > -1) {
      stocks[stockIndex].quantity -= item.quantity;
    }
  });
  
  return newTransaction;
}

// User management for outlets
const outletUsers: Map<string, { password: string; outlet: Outlet }> = new Map();

export function registerOutletUser(username: string, password: string, outlet: Outlet): void {
  outletUsers.set(username, { password, outlet });
}

export function removeOutletUser(username: string): void {
  outletUsers.delete(username);
}

export function validateOutletUser(username: string, password: string): Outlet | null {
  const user = outletUsers.get(username);
  if (user && user.password === password) {
    return user.outlet;
  }
  return null;
}

export function getOutletUsers(): Map<string, { password: string; outlet: Outlet }> {
  return outletUsers;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
