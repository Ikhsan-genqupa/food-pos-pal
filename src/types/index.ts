export type AppRole = 'admin' | 'kasir' | 'outlet' | 'kitchen';

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
  isBundle?: boolean;
  bundleItems?: { productId: string; quantity: number }[];
  createdAt: Date;
  isActive: boolean;
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

export type PaymentMethod = 'tunai' | 'qris' | 'ovo' | 'gopay' | 'dana' | 'debit' | 'kredit' | 'transfer';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  membershipId?: string;
  totalOrders: number;
  totalSpent: number;
  outletId?: string;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  transactionNumber: string;
  outletId: string;
  outlet?: Outlet;
  items: TransactionItem[];
  subtotal: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashReceived: number;
  change: number;
  cashierName?: string;
  orderType?: 'dine-in' | 'takeaway' | 'bopis';
  customerName?: string;
  customerPhone?: string;
  pickupTime?: Date;
  status: 'awaiting_payment' | 'awaiting_verification' | 'verified' | 'preparing' | 'ready_for_pickup' | 'completed' | 'cancelled';
  orderSource?: 'online' | 'offline';
  paymentProofUrl?: string;
  customerId?: string;
  customer?: Customer;
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
