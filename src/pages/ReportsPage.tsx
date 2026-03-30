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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch real data
  const { data: transactions = [], isLoading } = useTransactions(selectedOutlet);
  const { data: outlets = [] } = useOutlets();
  const { data: categories = [] } = useCategories();

  // Get transactions based on filters
  const getFilteredTransactions = () => {
    let txList = [...transactions];
    
    // Apply date filters
    if (startDate) {
      const start = new Date(startDate);
      txList = txList.filter(tx => new Date(tx.createdAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      txList = txList.filter(tx => new Date(tx.createdAt) <= end);
    }
    
    return txList;
  };
  
  const filteredTransactions = getFilteredTransactions();

  const totalRevenue = filteredTransactions.reduce((sum, tx) => sum + tx.total, 0);
  const totalTransactions = filteredTransactions.length;
  const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // Build export data
  const exportData = filteredTransactions.flatMap((tx) => {
    const outlet = tx.outlet;
    return tx.items.map((item) => ({
      Tanggal: formatDate(tx.createdAt),
      'ID Transaksi': tx.transactionNumber,
      Outlet: outlet?.name || '',
      Cabang: outlet?.branchNumber || '',
      Produk: item.productName,
      Jumlah: item.quantity,
      Harga: item.price,
      Total: item.total,
    }));
  });

  const handleExportExcel = () => {
    const headers = ['Tanggal', 'ID Transaksi', 'Outlet', 'Cabang', 'Produk', 'Jumlah', 'Harga', 'Total'];
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

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Penjualan - ${outletInfo}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header img { height: 50px; margin-bottom: 10px; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 5px 0; color: #666; }
          .summary { display: flex; justify-content: space-around; margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px; }
          .summary-item { text-align: center; }
          .summary-item .value { font-size: 20px; font-weight: bold; color: #0d9488; }
          .summary-item .label { font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background: #0d9488; color: white; }
          tr:nth-child(even) { background: #f9f9f9; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>GenQuPa POS</h1>
          <p><strong>Laporan Penjualan</strong></p>
          <p>${outletInfo}</p>
          <p>Periode: ${startDate || 'Semua'} - ${endDate || 'Semua'}</p>
        </div>

        <div class="summary">
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
              <th>ID Transaksi</th>
              <th>Outlet</th>
              <th>Produk</th>
              <th>Jml</th>
              <th>Harga</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${exportData.map(row => `
              <tr>
                <td>${row.Tanggal}</td>
                <td>${row['ID Transaksi']}</td>
                <td>${row.Outlet} - ${row.Cabang}</td>
                <td>${row.Produk}</td>
                <td>${row.Jumlah}</td>
                <td>Rp ${row.Harga.toLocaleString('id-ID')}</td>
                <td>Rp ${row.Total.toLocaleString('id-ID')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
          <p>GenQuPa POS System</p>
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
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-foreground">Filter</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          {isAdmin && (
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
          )}
          <div className="space-y-2">
            <Label>Kategori</Label>
            <Select>
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
        </div>
      </div>

      {/* Current view indicator */}
      {!isAdmin && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Store className="h-4 w-4" />
          <span>Menampilkan laporan: <span className="font-medium text-foreground">{user?.outletName}</span></span>
        </div>
      )}

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
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Transaksi</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Outlet</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Produk</th>
                <th className="text-center py-2.5 px-4 text-xs font-medium text-muted-foreground">Jml</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">Harga</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {exportData.slice(0, 20).map((row, idx) => (
                <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2.5 px-4 text-xs">{row.Tanggal}</td>
                  <td className="py-2.5 px-4 text-xs font-mono">{row['ID Transaksi']}</td>
                  <td className="py-2.5 px-4 text-xs">{row.Outlet} - {row.Cabang}</td>
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