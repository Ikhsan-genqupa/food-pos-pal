import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useOutlets } from '@/hooks/useOutlets';
import { useCategories } from '@/hooks/useCategories';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileSpreadsheet, FileText, Filter, Store } from 'lucide-react';
import logo from '@/assets/logo.png';

export default function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [selectedOutlet, setSelectedOutlet] = useState<string>(isAdmin ? 'all' : (user?.outletId || ''));
  const formatYMD = (date: Date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const today = new Date();
  const [startDate, setStartDate] = useState(formatYMD(today));
  const [endDate, setEndDate] = useState(formatYMD(today));
  const [filterType, setFilterType] = useState< 'today' | 'week' | 'month' | 'custom'>('today');

  const setToday = () => {
    setStartDate(formatYMD(today));
    setEndDate(formatYMD(today));
    setFilterType('today');
  };

  const setThisWeek = () => {
    const start = new Date(today);
    const day = start.getDay(); 
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday
    start.setDate(diff);
    setStartDate(formatYMD(start));
    setEndDate(formatYMD(today));
    setFilterType('week');
  };

  const setThisMonth = () => {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(formatYMD(start));
    setEndDate(formatYMD(today));
    setFilterType('month');
  };

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');

  const getPaymentLabel = (method: string) => {
    switch (method.toLowerCase()) {
      case 'tunai': return 'Tunai';
      case 'qris': return 'QRIS';
      case 'ovo': return 'OVO';
      case 'gopay': return 'GoPay';
      case 'dana': return 'Dana';
      case 'debit': return 'Debit';
      case 'kredit': return 'Kredit';
      default: return method.toUpperCase();
    }
  };

  const onDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') setStartDate(value);
    else setEndDate(value);
    setFilterType('custom');
  };

  const { data: transactions = [], isLoading } = useTransactions(selectedOutlet);
  const { data: outlets = [] } = useOutlets();
  const { data: categories = [] } = useCategories();

  const getFilteredTransactions = () => {
    let txList = [...transactions];
    
    if (startDate) {
      const start = new Date(startDate);
      txList = txList.filter(tx => new Date(tx.createdAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      txList = txList.filter(tx => new Date(tx.createdAt) <= end);
    }

    if (selectedPaymentMethod !== 'all') {
      txList = txList.filter(tx => tx.paymentMethod.toLowerCase() === selectedPaymentMethod.toLowerCase());
    }
    
    return txList;
  };
  
  const filteredTransactions = getFilteredTransactions();

  const exportData = filteredTransactions.flatMap((tx) => {
    const outlet = tx.outlet;
    return tx.items
      .filter(item => selectedCategory === 'all' || item.productId === selectedCategory) // Simplified category filter
      .map((item) => ({
        Tanggal: formatDate(tx.createdAt),
        'ID Transaksi': tx.transactionNumber,
        Outlet: outlet?.name || '',
        Cabang: outlet?.branchNumber || '',
        Produk: item.productName,
        Metode: getPaymentLabel(tx.paymentMethod),
        Jumlah: item.quantity,
        Harga: item.price,
        Total: item.total,
      }));
  });

  const totalRevenue = exportData.reduce((sum, row) => sum + row.Total, 0);
  const totalTransactions = [...new Set(exportData.map(r => r['ID Transaksi']))].length;
  const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  const handleExportExcel = () => {
    const headers = ['Tanggal', 'ID Transaksi', 'Outlet', 'Cabang', 'Produk', 'Metode', 'Jumlah', 'Harga', 'Total'];
    const csvContent = [
      headers.join(','),
      ...exportData.map((row) => headers.map((h) => row[h as keyof typeof row]).join(',')),
    ].join('\n');

    const outletName = selectedOutlet === 'all' ? 'semua-outlet' : outlets.find(o => o.id === selectedOutlet)?.name || 'outlet';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-${outletName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const outletInfo = selectedOutlet === 'all' 
      ? 'Semua Outlet' 
      : outlets.find(o => o.id === selectedOutlet)?.name || user?.outletName || '';
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formatDateIndo = (dateStr: string) => {
      if (!dateStr) return 'Semua';
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Penjualan - ${outletInfo}</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          body { 
            font-family: 'Plus Jakarta Sans', sans-serif; 
            padding: 20px 40px; 
            padding-bottom: 80px; 
            color: #1a1a1a;
            background-color: white;
            line-height: 1.5;
          }
          .header { text-align: center; margin-bottom: 30px; margin-top: 0; }
          .header h1 { margin: 0; font-size: 32px; font-weight: 800; color: #000; letter-spacing: -1px; }
          .header .report-title { margin: 5px 0 2px; font-size: 18px; font-weight: 600; color: #4b5563; text-transform: uppercase; letter-spacing: 1px; }
          .header .outlet-name { margin: 0; font-size: 16px; color: #6b7280; }
          .header .periode { margin: 2px 0 0; font-size: 13px; color: #9ca3af; }
          
          .summary-container {
            background-color: #f9fafb;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 35px;
            display: flex;
            justify-content: space-between;
            border: 1px solid #f3f4f6;
          }
          .summary-item { text-align: center; flex: 1; }
          .summary-item:not(:last-child) { border-right: 1px solid #e5e7eb; }
          .summary-item .value { font-size: 22px; font-weight: 700; color: #0d9488; margin-bottom: 4px; }
          .summary-item .label { font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 10px; border-radius: 12px; overflow: hidden; border-style: hidden; box-shadow: 0 0 0 1px #f3f4f6; table-layout: auto; }
          th { 
            background-color: #0d9488; 
            color: white; 
            text-align: left; 
            padding: 12px 14px; 
            font-size: 10px; 
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            white-space: nowrap;
          }
          td { 
            padding: 12px 14px; 
            border-bottom: 1px solid #f3f4f6; 
            font-size: 10px; 
            color: #374151;
            white-space: nowrap;
          }
          tr:last-child td { border-bottom: none; }
          tr:nth-child(even) { background-color: #fcfcfc; }
          
          .footer { 
            position: fixed;
            bottom: 20px;
            left: 40px;
            right: 40px;
            text-align: center; 
            font-size: 10px; 
            color: #9ca3af; 
            border-top: 1px solid #f3f4f6;
            padding-top: 15px;
            letter-spacing: 0.5px;
            background: white;
          }
          .footer p { margin: 5px 0; }
          
          @media print {
            body { padding-top: 0; }
            .summary-container { -webkit-print-color-adjust: exact; background-color: #f9fafb !important; }
            th { -webkit-print-color-adjust: exact; background-color: #0d9488 !important; color: white !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>GenQuPa POS</h1>
          <p class="report-title">Laporan Penjualan</p>
          <p class="outlet-name">${outletInfo}</p>
          <p class="periode">Periode: ${formatDateIndo(startDate)} - ${formatDateIndo(endDate)}</p>
        </div>

        <div class="summary-container">
          <div class="summary-item">
            <div class="value">Rp ${totalRevenue.toLocaleString('id-ID')}</div>
            <div class="label">Total Pendapatan</div>
          </div>
          <div class="summary-item">
            <div class="value">${totalTransactions}</div>
            <div class="label">Total Transaksi</div>
          </div>
          <div class="summary-item">
            <div class="value">Rp ${Math.round(avgTransaction).toLocaleString('id-ID')}</div>
            <div class="label">Rata-rata Transaksi</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Metode</th>
              <th>Produk</th>
              <th style="text-align: center;">Jml</th>
              <th style="text-align: right;">Harga</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${exportData.map(row => `
              <tr>
                <td>${row.Tanggal}</td>
                <td style="font-weight: 600;">${row.Metode}</td>
                <td style="color: #4b5563;">${row.Produk}</td>
                <td style="text-align: center;">${row.Jumlah}</td>
                <td style="text-align: right;">Rp ${row.Harga.toLocaleString('id-ID')}</td>
                <td style="text-align: right; font-weight: 700; color: #0d9488;">Rp ${row.Total.toLocaleString('id-ID')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
          <p>GenQuPa POS &bull; Premium Business Intelligence System</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
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
          <h1 className="text-xl font-bold text-foreground">Laporan</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'Buat dan ekspor laporan penjualan semua outlet' : `Laporan ${user?.outletName}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Ekspor Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 mr-2" />
            Ekspor PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="stat-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-foreground">Filter Laporan</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={filterType === 'today' ? 'default' : 'outline'} 
              size="sm" 
              onClick={setToday} 
              className="text-xs h-8"
            >
              Hari Ini
            </Button>
            <Button 
              variant={filterType === 'week' ? 'default' : 'outline'} 
              size="sm" 
              onClick={setThisWeek} 
              className="text-xs h-8"
            >
              Minggu Ini
            </Button>
            <Button 
              variant={filterType === 'month' ? 'default' : 'outline'} 
              size="sm" 
              onClick={setThisMonth} 
              className="text-xs h-8"
            >
              Bulan Ini
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label>Tanggal Mulai</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onDateChange('start', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Tanggal Akhir</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => onDateChange('end', e.target.value)}
            />
          </div>
          {isAdmin ? (
            <div className="space-y-2">
              <Label>Outlet</Label>
              <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Outlet" />
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
          ) : (
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Metode</Label>
            <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Semua Metode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Metode</SelectItem>
                <SelectItem value="tunai">Tunai</SelectItem>
                <SelectItem value="qris">QRIS</SelectItem>
                <SelectItem value="ovo">OVO</SelectItem>
                <SelectItem value="gopay">GoPay</SelectItem>
                <SelectItem value="dana">Dana</SelectItem>
                <SelectItem value="debit">Debit</SelectItem>
                <SelectItem value="kredit">Kredit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isAdmin && (
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card text-center">
          <p className="text-xs text-muted-foreground">Total Pendapatan</p>
          <p className="text-xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-xs text-muted-foreground">Total Transaksi</p>
          <p className="text-xl font-bold text-foreground">{totalTransactions}</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-xs text-muted-foreground">Rata-rata Transaksi</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(avgTransaction)}</p>
        </div>
      </div>

      {/* Report table */}
      <div className="stat-card overflow-hidden p-0">
        <div className="p-4 border-b border-border">
          <h3 className="font-medium text-foreground">Laporan Penjualan</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Tanggal</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Metode</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Outlet</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Produk</th>
                <th className="text-center py-2.5 px-4 text-xs font-medium text-muted-foreground">Jml</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">Harga</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {exportData.slice(0, 50).map((row, idx) => (
                <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2.5 px-4 text-xs">{row.Tanggal}</td>
                  <td className="py-2.5 px-4 text-xs font-bold text-teal-600">{row.Metode}</td>
                  <td className="py-2.5 px-4 text-xs">{row.Outlet}</td>
                  <td className="py-2.5 px-4 text-xs">{row.Produk}</td>
                  <td className="py-2.5 px-4 text-xs text-center">{row.Jumlah}</td>
                  <td className="py-2.5 px-4 text-xs text-right">{formatCurrency(row.Harga)}</td>
                  <td className="py-2.5 px-4 text-xs text-right font-medium">{formatCurrency(row.Total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {exportData.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">Tidak ada data laporan</p>
          </div>
        )}
      </div>
    </div>
  );
}