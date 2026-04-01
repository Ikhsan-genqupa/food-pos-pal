import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useOutlets } from '@/hooks/useOutlets';
import { formatCurrency, formatDate } from '@/lib/utils';
import StatCardCompact from '@/components/dashboard/StatCardCompact';
import {
  TrendingUp,
  Receipt,
  ShoppingBag,
  Globe,
  Store,
  Wallet,
  Calendar,
  ArrowRight,
  ShoppingCart
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

  // Fetch data
  const { data: transactions = [], isLoading: txLoading } = useTransactions(selectedOutlet);
  const { data: outlets = [] } = useOutlets();
  
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

  const filteredTransactions = getFilteredTransactions().sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Calculations for Metrics
  const totalRevenue = filteredTransactions.reduce((sum, tx) => sum + tx.total, 0);
  const totalOnlineRevenue = filteredTransactions
    .filter(tx => tx.orderSource === 'online')
    .reduce((sum, tx) => sum + tx.total, 0);
  const totalOfflineRevenue = filteredTransactions
    .filter(tx => tx.orderSource === 'offline')
    .reduce((sum, tx) => sum + tx.total, 0);
  const totalTransactions = filteredTransactions.length;
  const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // Calculate days in the filtered range
  let daysInRange = 1;
  if (startDate && endDate) {
    const diff = Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime());
    daysInRange = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  } else if (filteredTransactions.length > 0) {
    const dates = filteredTransactions.map(tx => tx.createdAt.getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const diff = Math.abs(maxDate - minDate);
    daysInRange = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
  }

  const avgDailyRevenue = totalRevenue / daysInRange;
  const avgDailyTransactions = totalTransactions / daysInRange;

  // Pie Chart 1: Proporsi Produk (Top 5)
  const productColors = ['#0d9488', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ec4899'];
  const productMap = new Map<string, { name: string, value: number, quantity: number }>();
  
  filteredTransactions.forEach(tx => {
    tx.items.forEach(item => {
      const current = productMap.get(item.productId) || { name: item.productName || 'Produk', value: 0, quantity: 0 };
      productMap.set(item.productId, {
        name: current.name,
        value: current.value + item.total,
        quantity: current.quantity + item.quantity
      });
    });
  });

  const productData = Array.from(productMap.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((item, index) => ({
      ...item,
      color: productColors[index % productColors.length]
    }));

  const totalProductSales = productData.reduce((sum, p) => sum + p.value, 0);

  // Pie Chart 2: Volume Online vs Offline
  const orderSourceData = [
    { name: 'Online', value: totalOnlineRevenue, color: '#3b82f6' },
    { name: 'Offline', value: totalOfflineRevenue, color: '#10b981' },
  ].filter(d => d.value > 0);

  const totalOrderSourceValue = orderSourceData.reduce((sum, d) => sum + d.value, 0);

  // Bar Chart: Grafik Penjualan (Daily)
  const getDatesInRange = (start: Date, end: Date) => {
    const dates = [];
    let current = new Date(start);
    current.setHours(0,0,0,0);
    const last = new Date(end);
    last.setHours(0,0,0,0);
    
    let count = 0;
    while (current <= last && count < 31) { // Limit to 1 month for bar chart
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
      count++;
    }
    return dates;
  };

  const chartStart = startDate ? new Date(startDate) : (filteredTransactions.length > 0 ? filteredTransactions[0].createdAt : new Date());
  const chartEnd = endDate ? new Date(endDate) : new Date();
  const chartDates = getDatesInRange(chartStart, chartEnd);

  const salesData = chartDates.map(date => {
    const dateStr = date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
    const dayTotal = filteredTransactions
      .filter(tx => tx.createdAt.toDateString() === date.toDateString())
      .reduce((sum, tx) => sum + tx.total, 0);
    return { date: dateStr, total: dayTotal };
  });

  // Get outlet name for display
  const getOutletDisplayName = () => {
    if (isAdmin) {
      if (selectedOutlet === 'all') return 'Semua Outlet';
      const outlet = outlets.find(o => o.id === selectedOutlet);
      return outlet?.name || '';
    }
    return user?.outletName || '';
  };

  if (txLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h1 className="text-3xl font-black tracking-tight text-slate-800">Dashboard</h1>
           <p className="text-slate-500 font-medium">{getOutletDisplayName()}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
           {isAdmin && (
             <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
               <SelectTrigger className="w-[180px] rounded-xl border-slate-200">
                 <SelectValue placeholder="Pilih Outlet" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Semua Outlet</SelectItem>
                 {outlets.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
               </SelectContent>
             </Select>
           )}
           <div className="flex items-center gap-2">
             <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="w-[140px] rounded-xl border-slate-200 h-10"
             />
             <span className="text-slate-300">-</span>
             <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="w-[140px] rounded-xl border-slate-200 h-10"
             />
           </div>
           {!isAdmin && (
             <Button variant="default" className="rounded-xl h-10 px-6 font-bold" onClick={() => navigate('/pos')}>
               <ShoppingCart className="h-4 w-4 mr-2" /> Buka Penjualan
             </Button>
           )}
        </div>
      </div>

      {/* Metric Cards Grid - 7 Cards per row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCardCompact 
           title="Total Omzet" 
           value={formatCurrency(totalRevenue)} 
           icon={TrendingUp}
           color="text-emerald-600"
        />
        <StatCardCompact 
           title="Omzet Online" 
           value={formatCurrency(totalOnlineRevenue)} 
           icon={Globe}
           color="text-blue-600"
        />
        <StatCardCompact 
           title="Omzet Offline" 
           value={formatCurrency(totalOfflineRevenue)} 
           icon={Store}
           color="text-emerald-500"
        />
        <StatCardCompact 
           title="Total Transaksi" 
           value={totalTransactions} 
           icon={Receipt}
           color="text-slate-600"
        />
        <StatCardCompact 
           title="Rata-Rata Transaksi" 
           value={formatCurrency(Math.round(avgTransactionValue))} 
           icon={Wallet}
           color="text-slate-600"
        />
        <StatCardCompact 
           title="Pendapatan Harian" 
           value={formatCurrency(Math.round(avgDailyRevenue))} 
           icon={TrendingUp}
           color="text-emerald-500"
        />
        <StatCardCompact 
           title="Transaksi Harian" 
           value={avgDailyTransactions.toFixed(1)} 
           icon={Calendar}
           color="text-slate-800"
        />
      </div>

      {/* Charts Grid - 3 Charts in 1 column lg */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART 1: GRAFIK PENJUALAN */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col">
           <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 text-center mb-6">Grafik Penjualan</h3>
           <div className="h-64 mt-auto">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData}>
                  <XAxis dataKey="date" tick={{fontSize: 9, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 9, fill: '#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000}K`} />
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    formatter={(v: number) => [formatCurrency(v), 'Omzet']}
                  />
                  <Bar dataKey="total" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* CHART 2: PROPORSI PRODUK */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col">
           <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 text-center mb-6">Proporsi Produk</h3>
           <div className="h-48">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productData}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {productData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
             </ResponsiveContainer>
           </div>
           <div className="mt-4 space-y-2 overflow-y-auto max-h-32 pr-2 custom-scrollbar">
              {productData.map((item) => (
                <div key={item.name} className="flex items-center gap-3 text-[10px] py-1.5 border-b border-slate-50 last:border-0">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <div className="flex-1 truncate font-medium text-slate-600">{item.name} – {item.quantity} terjual</div>
                  <div className="font-bold text-slate-400">{totalProductSales > 0 ? Math.round((item.value / totalProductSales) * 100) : 0}%</div>
                </div>
              ))}
           </div>
        </div>

        {/* CHART 3: VOLUME ONLINE VS OFFLINE */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col">
           <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 text-center mb-6">Volume Online vs Offline</h3>
           <div className="h-48">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderSourceData}
                    cx="50%" cy="50%"
                    outerRadius={75}
                    dataKey="value"
                  >
                    {orderSourceData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
             </ResponsiveContainer>
           </div>
           <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
              {orderSourceData.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-[10px]">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-bold text-slate-600">{item.name} – {totalOrderSourceValue > 0 ? Math.round((item.value / totalOrderSourceValue) * 100) : 0}%</span>
                  <span className="text-slate-400 font-medium">({formatCurrency(item.value)})</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* RECENT TRANSACTIONS */}
      <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
           <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Transaksi Terbaru</h3>
           <Button variant="ghost" size="sm" className="rounded-xl text-xs font-bold text-primary" onClick={() => navigate('/transactions')}>
              Lihat Semua <ArrowRight className="h-3 w-3 ml-2" />
           </Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-50">
              <tr>
                <th className="text-left py-4 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Pesanan</th>
                <th className="text-left py-4 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item</th>
                <th className="text-right py-4 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                <th className="text-right py-4 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTransactions.slice(-5).reverse().map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-2 text-xs font-black text-slate-700">{tx.transactionNumber}</td>
                  <td className="py-4 px-2 text-xs text-slate-500 font-medium">
                    {tx.items.length} Menu ({tx.items.reduce((s, i) => s + i.quantity, 0)} Porsi)
                  </td>
                  <td className="py-4 px-2 text-sm text-right font-black text-emerald-600">
                    {formatCurrency(tx.total)}
                  </td>
                  <td className="py-4 px-2 text-xs text-right text-slate-400 font-medium">
                    {formatDate(tx.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}