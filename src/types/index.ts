export type AppRole = 'admin' | 'kasir' | 'outlet';

export interface User {
  id: string;
  email: string;
  role: AppRole;
  outletId?: string;
  outletName?: string;
  branchNumber?: string;
}

export interface Outlet {
  id: string;
  name: string;
  branchNumber: string;
  address: string;
  personInCharge: string;
  username: string;
  createdAt: Date;
  isActive: boolean;
}

export interface ProductCategory {
  id: string;
  name: string;
  icon?: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  category?: ProductCategory;
  image: string;
  price: number;
  createdAt: Date;
}

export interface Stock {
  id: string;
  productId: string;
  product?: Product;
  outletId: string;
  outlet?: Outlet;
  quantity: number;
  lastUpdated: Date;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Transaction {
  id: string;
  outletId: string;
  outlet?: Outlet;
  items: TransactionItem[];
  subtotal: number;
  total: number;
  paymentMethod: 'cash';
  cashReceived: number;
  change: number;
  createdAt: Date;
}

export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface DashboardStats {
  totalTransactions: number;
  totalRevenue: number;
  dailyCash: number;
  monthlyCash: number;
  productsSold: { categoryName: string; count: number }[];
  recentTransactions: Transaction[];
}
