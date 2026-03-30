import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useOutlets } from '@/hooks/useOutlets';
import { useActiveProducts } from '@/hooks/useProducts';
import { useStocks } from '@/hooks/useStocks';
import { useCategories } from '@/hooks/useCategories';
import { formatCurrency, formatDate } from '@/lib/utils';
import StatCard from '@/components/dashboard/StatCard';
import {
  ShoppingCart,
  DollarSign,
  Calendar,
  Package,
  ArrowRight,
  TrendingUp,
  Receipt,
  ShoppingBag,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  
  // Admin filters
  const [selectedOutlet, setSelectedOutlet] = useState<string>(isAdmin ? 'all' : (user?.outletId || ''));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sync selected outlet with user profile once loaded
  React.useEffect(() => {
    if (!isAdmin && user?.outletId) {
      setSelectedOutlet(user.outletId);
    }
  }, [user?.outletId, isAdmin]);

  // Fetch real data. We only pass selectedOutlet if it's not empty, 
  // or 'all' for admin. This matches our hook guards.
  const { data: transactions = [], isLoading: txLoading } = useTransactions(selectedOutlet);
  const { data: stocks = [] } = useStocks(selectedOutlet);
  const { data: outlets = [] } = useOutlets();
  const { data: products = [] } = useActiveProducts();
  const { data: categories = [] } = useCategories();
  
  const isLoading = txLoading;

  // Apply extra filters to transactions
  const getFilteredTransactions = () => {
    let txList = [...transactions];
    
    // Apply date filters
    if (startDate) {
      const start = new Date(startDate);
      txList = txList.filter(tx => tx.createdAt >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      txList = txList.filter(tx => tx.createdAt <= end);
    }
    
    return txList;
  };

  const filteredTransactions = getFilteredTransactions();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);

  // Stats
  const totalRevenue = filteredTransactions.reduce((sum, tx) => sum + tx.total, 0);
  const totalTransactions = filteredTransactions.length;
  
  const dailyCash = filteredTransactions
    .filter((tx) => tx.createdAt >= today)
    .reduce((sum, tx) => sum + tx.total, 0);
    
  const monthlyCash = filteredTransactions
    .filter((tx) => tx.createdAt >= currentMonth)
    .reduce((sum, tx) => sum + tx.total, 0);

  const productsSold = filteredTransactions.reduce((sum, tx) => 
    sum + tx.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
  );

  const lowStockCount = stocks.filter(s => s.quantity < 10 && (s.product?.isBundle !== true)).length;

  const productColors = [
    '#0d9488', // Teal
    '#0ea5e9', // Sky
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#10b981', // Emerald
    '#f43f5e', // Rose
    '#6366f1', // Indigo
  ];

  // Calculate Product Sales Data
  const productMap = new Map<string, { name: string, value: number }>();
  
  filteredTransactions.forEach(tx => {
    tx.items.forEach(item => {
      const current = productMap.get(item.productId) || { name: item.productName || 'Produk', value: 0 };
      productMap.set(item.productId, {
        name: current.name,
        value: current.value + (item.quantity * item.price)
      });
    });
  });

  const productData = Array.from(productMap.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 8) // Show top 8 products
    .map((item, index) => ({
      ...item,
      color: productColors[index % productColors.length]
    }));

  const totalProductSales = productData.reduce((sum, p) => sum + p.value, 0);

  // Daily sales chart data
  const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  const dayMap = [6, 0, 1, 2, 3, 4, 5]; // Sunday=0 -> index 6, Monday=1 -> index 0

  const dailySalesData = dayNames.map(day => ({ 
    day, 
    total: 0,
    // Add dynamic keys for each outlet if in "all" mode
    ...(isAdmin && selectedOutlet === 'all' 
      ? outlets.reduce((acc, o) => ({ ...acc, [o.id]: 0 }), {}) 
      : { sales: 0 })
  }));

  // Fill chart data
  filteredTransactions.forEach(tx => {
    const dayIndex = dayMap[tx.createdAt.getDay()];
    if (isAdmin && selectedOutlet === 'all') {
      const outletId = tx.outletId;
      if (dailySalesData[dayIndex][outletId] !== undefined) {
        dailySalesData[dayIndex][outletId] += tx.total;
      }
      dailySalesData[dayIndex].total += tx.total;
    } else {
      dailySalesData[dayIndex].sales += tx.total;
      dailySalesData[dayIndex].total += tx.total;
    }
  });

  const outletColors = [
    '#0d9488', // Teal
    '#0ea5e9', // Sky
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ec4899', // Pink
  ];

  // Get outlet name for display
  const getOutletDisplayName = () => {
    if (isAdmin) {
      if (selectedOutlet === 'all') return 'Semua Outlet';
      const outlet = outlets.find(o => o.id === selectedOutlet);
      return outlet?.name || '';
    }
    return user?.outletName || '';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'Ringkasan konsolidasi semua outlet' : user?.outletName || 'Outlet'}
          </p>
        </div>
        {!isAdmin && (
          <Button size="sm" onClick={() => navigate('/pos')}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Buka Penjualan
          </Button>
        )}
      </div>

      {/* Admin Filters */}
      {isAdmin && (
        <div className="stat-card">
          <h3 className="font-medium text-foreground mb-4">Filter Data</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Outlet</Label>
              <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Outlet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Outlet</SelectItem>
                  {outlets.map((outlet) => (
                    <SelectItem key={outlet.id} value={outlet.id}>
                      {outlet.name} - {outlet.branchNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tanggal Mulai</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Akhir</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Current view indicator */}
      <div className="text-sm text-muted-foreground">
        Menampilkan data: <span className="font-medium text-foreground">{getOutletDisplayName()}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <StatCard
          title="Total Omzet"
          value={formatCurrency(totalRevenue)}
          icon={TrendingUp}
          variant="primary"
        />
        <StatCard
          title="Total Transaksi"
          value={totalTransactions.toString()}
          icon={Receipt}
        />
        <StatCard
          title="Produk Terjual"
          value={productsSold.toString()}
          icon={ShoppingBag}
        />
        <StatCard
          title="Stok Menipis"
          value={lowStockCount.toString()}
          icon={Package}
          variant={lowStockCount > 0 ? 'warning' : 'default'}
          onClick={() => navigate('/stock')}
        />
        <StatCard
          title="Kas Hari Ini"
          value={formatCurrency(dailyCash)}
          icon={Wallet}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sales chart */}
        <div className="stat-card">
          <h3 className="font-medium text-foreground mb-4">Penjualan Mingguan</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySalesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <YAxis
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickFormatter={(value) => `${value / 1000}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => {
                    const outletName = isAdmin && selectedOutlet === 'all' 
                      ? outlets.find(o => o.id === name)?.name || name
                      : 'Penjualan';
                    return [formatCurrency(value), outletName];
                  }}
                />
                {isAdmin && selectedOutlet === 'all' && (
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    height={36} 
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '0px' }}
                  />
                )}
                {isAdmin && selectedOutlet === 'all' ? (
                  outlets.map((outlet, index) => (
                    <Bar
                      key={outlet.id}
                      dataKey={outlet.id}
                      name={outlet.name}
                      stackId="a"
                      fill={outletColors[index % outletColors.length]}
                      radius={[0, 0, 0, 0]}
                    />
                  ))
                ) : (
                  <Bar
                    dataKey="sales"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product chart */}
        <div className="stat-card">
          <h3 className="font-medium text-foreground mb-4">Penjualan per Produk</h3>
          <div className="flex flex-col sm:flex-row items-center gap-6 min-h-[224px]">
            <div className="w-full sm:w-1/2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {productData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Omzet']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full sm:w-1/2 space-y-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
              {productData.map((item) => (
                <div key={item.name} className="flex items-center gap-3 text-xs py-1 border-b border-border/30 last:border-0">
                  <div
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground font-medium flex-1 leading-tight">{item.name}</span>
                  <span className="font-bold text-foreground tabular-nums">
                    {totalProductSales > 0 ? Math.round((item.value / totalProductSales) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly summary & stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="stat-card">
          <h3 className="font-medium text-foreground mb-4">Kas Bulan Ini</h3>
          <p className="text-2xl font-bold text-primary">{formatCurrency(monthlyCash)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Periode: {currentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="stat-card">
          <h3 className="font-medium text-foreground mb-4">Ringkasan</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Outlet</span>
              <span className="font-medium">{isAdmin ? outlets.length : 1}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Produk</span>
              <span className="font-medium">{products.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Rata-rata Transaksi</span>
              <span className="font-medium">
                {totalTransactions > 0 ? formatCurrency(totalRevenue / totalTransactions) : formatCurrency(0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="stat-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-foreground">Transaksi Terbaru</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')}>
            Lihat Semua
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        {filteredTransactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Belum ada transaksi</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">ID</th>
                  {isAdmin && (
                    <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Outlet</th>
                  )}
                  <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Item</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Total</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.slice(0, 5).map((tx) => {
                  const outlet = outlets.find((o) => o.id === tx.outletId);
                  return (
                    <tr key={tx.id} className="border-b border-border/50">
                      <td className="py-2 px-2 text-xs font-mono">{tx.transactionNumber}</td>
                      {isAdmin && (
                        <td className="py-2 px-2 text-xs">
                          {outlet?.name} - {outlet?.branchNumber}
                        </td>
                      )}
                      <td className="py-2 px-2 text-xs">
                        {tx.items.reduce((sum, item) => sum + item.quantity, 0)} item
                      </td>
                      <td className="py-2 px-2 text-xs text-right font-medium">
                        {formatCurrency(tx.total)}
                      </td>
                      <td className="py-2 px-2 text-xs text-right text-muted-foreground">
                        {formatDate(tx.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}