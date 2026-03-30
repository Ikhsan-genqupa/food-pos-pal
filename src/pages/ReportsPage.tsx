import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useOutlets } from '@/hooks/useOutlets';
import { useCategories } from '@/hooks/useCategories';
import { formatCurrency, formatDate, formatDateShort } from '@/lib/utils';
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
import { FileSpreadsheet, FileText, Filter, Store, TrendingUp, Receipt, ShoppingBag, Wallet } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
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
    start.setHours(0,0,0,0);
    start.setDate(diff);
    
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // Sunday
    
    setStartDate(formatYMD(start));
    setEndDate(formatYMD(end));
    setFilterType('week');
  };

  const setThisMonth = () => {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of month
    setStartDate(formatYMD(start));
    setEndDate(formatYMD(end));
    setFilterType('month');
  };

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');

  const getPaymentLabel = (method: string | undefined | null) => {
    if (!method) return '-';
    const m = String(method).toLowerCase();
    switch (m) {
      case 'cash':
      case 'tunai': return 'Tunai';
      case 'qris': return 'QRIS';
      case 'ovo': return 'OVO';
      case 'gopay': return 'GoPay';
      case 'dana': return 'Dana';
      case 'debit': return 'Debit';
      case 'kredit': return 'Kredit';
      default: return m.toUpperCase();
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

  const outletSummaries = selectedOutlet === 'all' ? Array.from(
    exportData.reduce((acc, row) => {
      const key = row.Outlet;
      if (!acc.has(key)) {
        acc.set(key, { name: key, revenue: 0, transactions: new Set() });
      }
      const data = acc.get(key)!;
      data.revenue += row.Total;
      data.transactions.add(row['ID Transaksi']);
      return acc;
    }, new Map<string, { name: string; revenue: number; transactions: Set<string> }>())
  ).map(([_, val]) => ({
    name: val.name,
    revenue: val.revenue,
    transactions: val.transactions.size,
    avg: val.transactions.size > 0 ? val.revenue / val.transactions.size : 0
  })).sort((a, b) => b.revenue - a.revenue) : [];

  const productColors = [
    '#0d9488', // Teal
    '#0ea5e9', // Sky
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#10b981', // Emerald
    '#f43f5e', // Rose
    '#6366 indigo', // Indigo but better color
  ];

  const productMap = new Map<string, { name: string, value: number }>();
  filteredTransactions.forEach(tx => {
    tx.items.forEach(item => {
      const current = productMap.get(item.productId) || { name: item.productName || 'Produk', value: 0 };
      productMap.set(item.productId, {
        name: current.name,
        value: current.value + item.total
      });
    });
  });

  const productData = Array.from(productMap.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
    .map((item, index) => ({
      ...item,
      color: productColors[index % productColors.length]
    }));

  const totalProductSales = productData.reduce((sum, p) => sum + p.value, 0);

  const outletColors = [
    '#0d9488', // Teal
    '#0ea5e9', // Sky
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ec4899', // Pink
  ];

  // Generate All Dates in Range for the Chart
  const getDatesInRange = (start: string, end: string) => {
    const dates = [];
    let current = new Date(start);
    const last = new Date(end);
    
    // Safety break
    let count = 0;
    while (current <= last && count < 100) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
      count++;
    }
    return dates;
  };

  const allDatesInRange = getDatesInRange(startDate, endDate);
  
  const sortedDailyData = allDatesInRange.map(date => {
    const dKey = formatYMD(date);
    const entry: any = {
      dKey,
      date: formatDateShort(date),
      total: 0,
      sales: 0
    };
    
    // Initialize outlet keys if in "all" mode
    if (isAdmin && selectedOutlet === 'all') {
      outlets.forEach(o => {
        entry[o.id] = 0;
      });
    }

    // Fill data
    filteredTransactions.forEach(tx => {
      if (formatYMD(tx.createdAt) === dKey) {
        if (isAdmin && selectedOutlet === 'all') {
          entry[tx.outletId] = (entry[tx.outletId] || 0) + tx.total;
        } else {
          entry.sales += tx.total;
        }
        entry.total += tx.total;
      }
    });

    return entry;
  });

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

    const formatPeriodeIndo = (startStr: string, endStr: string) => {
      if (!startStr || !endStr) return 'Semua';
      const start = new Date(startStr);
      const end = new Date(endStr);
      
      const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];
      
      const isSameDate = startStr === endStr;
      const isSameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
      
      if (isSameDate) {
        return `${start.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
      }
      
      if (isSameMonth) {
        return `${start.getDate()} - ${end.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
      }
      
      return `${start.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()} - ${end.getDate()} ${monthNames[end.getMonth()]} ${end.getFullYear()}`;
    };

    const periodeTitle = formatPeriodeIndo(startDate, endDate);
    const documentTitle = `Laporan Penjualan - ${outletInfo} - ${periodeTitle}`;

    // Get SVG charts for PDF
    const barChartSvg = document.querySelector('.bar-chart-container svg')?.outerHTML || '';
    const pieChartSvg = document.querySelector('.pie-chart-container svg')?.outerHTML || '';
    const productLegendHtml = document.querySelector('.pie-legend-container')?.innerHTML || '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${documentTitle}</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { 
            size: auto; 
            margin: 10mm; 
          }
          html { counter-reset: page; }
          body { 
            font-family: 'Plus Jakarta Sans', sans-serif; 
            padding: 0; 
            margin: 0;
            color: #1a1a1a;
            background-color: white;
            line-height: 1.4;
          }
          .header { text-align: center; margin-bottom: 25px; margin-top: 0; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 800; color: #000; letter-spacing: -1px; }
          .header .report-title { margin: 5px 0 2px; font-size: 16px; font-weight: 600; color: #4b5563; text-transform: uppercase; letter-spacing: 1px; }
          .header .outlet-name { margin: 0; font-size: 14px; color: #6b7280; }
          .header .periode { margin: 2px 0 0; font-size: 11px; color: #9ca3af; }
          
          .summary-container {
            background-color: #f9fafb;
            border-radius: 12px;
            padding: 18px;
            margin-bottom: 25px;
            display: flex;
            justify-content: space-between;
            border: 1px solid #f3f4f6;
          }
          .summary-item { text-align: center; flex: 1; }
          .summary-item:not(:last-child) { border-right: 1px solid #e5e7eb; }
          .summary-item .value { font-size: 20px; font-weight: 700; color: #0d9488; margin-bottom: 2px; }
          .summary-item .label { font-size: 9px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
          
          .charts-grid {
            display: flex;
            gap: 20px;
            margin-bottom: 10mm;
          }
          .chart-box {
            flex: 1;
            border: 1px solid #f3f4f6;
            border-radius: 12px;
            padding: 15px;
            background: white;
          }
          .chart-title {
            font-size: 11px;
            font-weight: 700;
            margin-bottom: 10px;
            color: #374151;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .chart-container {
            width: 100%;
            height: 180px;
          }
          .chart-container svg {
            width: 100%;
            height: 100%;
          }
          .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 8px;
            margin-bottom: 3px;
          }
          .legend-color {
            width: 8px;
            height: 8px;
            border-radius: 50%;
          }
          
          .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; margin: 5mm 0 0; color: #374151; border-bottom: 2px solid #0d9488; display: inline-block; padding-bottom: 3px; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 0; border-radius: 8px; overflow: hidden; border-style: hidden; box-shadow: 0 0 0 1px #f3f4f6; table-layout: auto; }
          th { 
            background-color: #0d9488; 
            color: white; 
            text-align: left; 
            padding: 8px 10px; 
            font-size: 8.5px; 
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            white-space: nowrap;
          }
          td { 
            padding: 7px 10px; 
            border-bottom: 1px solid #f3f4f6; 
            font-size: 8.5px; 
            color: #374151;
            white-space: nowrap;
          }
          tr:last-child td { border-bottom: none; }
          tr:nth-child(even) { background-color: #fcfcfc; }
          
          .thead-spacer { 
            height: 5mm; 
            border: none !important; 
          }
          .thead-spacer td { 
            border: none !important; 
            padding: 0 !important;
            height: 5mm;
          }
          
          .footer { 
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 45px;
            font-size: 9px; 
            color: #9ca3af; 
            background: white;
            padding: 10px 30px;
            border-top: 1px solid #f3f4f6;
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 100;
          }
          .footer-left { text-align: left; }
          .footer-right { text-align: right; }
          .page-number:after { 
            counter-increment: page;
            content: counter(page); 
          }
          
          @media print {
            body { padding-top: 0; }
            .summary-container { -webkit-print-color-adjust: exact; background-color: #f9fafb !important; }
            th { -webkit-print-color-adjust: exact; background-color: #0d9488 !important; color: white !important; }
            .footer { position: fixed; bottom: 0; border-top: 1px solid #f3f4f6; }
            .charts-grid { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>GenQuPa POS</h1>
          <p class="report-title">Laporan Penjualan</p>
          <p class="outlet-name">${outletInfo}</p>
          <p class="periode">Periode: ${periodeTitle}</p>
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

        <div class="charts-grid">
          <div class="chart-box">
            <div class="chart-title">Tren Penjualan</div>
            <div class="chart-container">
              ${barChartSvg}
            </div>
          </div>
          <div class="chart-box">
            <div class="chart-title">Proporsi Produk</div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="chart-container" style="flex: 1;">
                ${pieChartSvg}
              </div>
              <div style="flex: 1; max-height: 180px; overflow: hidden;">
                ${productLegendHtml}
              </div>
            </div>
          </div>
        </div>

        ${selectedOutlet === 'all' ? `
          <div class="section-title">Ringkasan Per Outlet</div>
          <table style="margin-bottom: 25px;">
            <thead>
              <tr class="thead-spacer"><td colspan="4"></td></tr>
              <tr>
                <th>Nama Outlet</th>
                <th style="text-align: center;">Jml Transaksi</th>
                <th style="text-align: right;">Total Omzet</th>
                <th style="text-align: right;">Rata-rata</th>
              </tr>
            </thead>
            <tbody>
              ${outletSummaries.map(o => `
                <tr>
                  <td style="font-weight: 700;">${o.name}</td>
                  <td style="text-align: center;">${o.transactions}</td>
                  <td style="text-align: right; color: #0d9488; font-weight: 600;">Rp${o.revenue.toLocaleString('id-ID')}</td>
                  <td style="text-align: right; color: #6b7280;">Rp${Math.round(o.avg).toLocaleString('id-ID')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="section-title" style="page-break-before: auto;">Detail Transaksi</div>
        <table>
          <thead>
            <tr class="thead-spacer"><td colspan="8"></td></tr>
            <tr>
              <th>Tanggal</th>
              <th>ID Transaksi</th>
              <th>Outlet</th>
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
                <td style="font-family: monospace;">${row['ID Transaksi']}</td>
                <td>${row.Outlet}</td>
                <td style="font-weight: 600;">${row.Metode}</td>
                <td style="color: #4b5563;">${row.Produk}</td>
                <td style="text-align: center;">${row.Jumlah}</td>
                <td style="text-align: right;">Rp${row.Harga.toLocaleString('id-ID')}</td>
                <td style="text-align: right; font-weight: 700; color: #0d9488;">Rp${row.Total.toLocaleString('id-ID')}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot style="background-color: #f9fafb;">
            <tr>
              <td colspan="7" style="text-align: right; padding: 10px 8px; font-weight: 700; font-size: 8px; text-transform: uppercase;">Total Transaksi Terhitung</td>
              <td style="text-align: right; padding: 10px 8px; font-weight: 800; font-size: 9px; color: #0d9488; border-top: 2px solid #0d9488;">Rp${totalRevenue.toLocaleString('id-ID')}</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          <div class="footer-left">
            GenQuPa POS &bull; Premium Business Intelligence System
          </div>
          <div class="footer-right">
            Dicetak pada: ${new Date().toLocaleString('id-ID')} HAL <span class="page-number"></span>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.title = documentTitle;
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
            <p className="text-[10px] text-muted-foreground italic px-1">
              Dipilih: {formatDateShort(startDate)}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Tanggal Akhir</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => onDateChange('end', e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground italic px-1">
              Dipilih: {formatDateShort(endDate)}
            </p>
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
        <div className="stat-card text-center border-t-4 border-teal-500">
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Total Pendapatan</p>
          <p className="text-2xl font-black text-teal-600">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Total Transaksi</p>
          <p className="text-2xl font-black text-foreground">{totalTransactions}</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Rata-rata Transaksi</p>
          <p className="text-2xl font-black text-foreground">{formatCurrency(avgTransaction)}</p>
        </div>
      </div>

      {/* Charts Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sales chart */}
        <div className="stat-card">
          <h3 className="font-medium text-foreground mb-4">Grafik Penjualan</h3>
          <div className="h-56 bar-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedDailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  tickFormatter={(value) => `${value / 1000}K`}
                />
                <ChartTooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '11px',
                  }}
                  formatter={(value: number, name: string) => {
                    const label = isAdmin && selectedOutlet === 'all' 
                      ? (outlets.find(o => o.id === name)?.name || name)
                      : 'Penjualan';
                    return [formatCurrency(value), label];
                  }}
                />
                {isAdmin && selectedOutlet === 'all' && (
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    iconType="circle"
                    wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }}
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
                    />
                  ))
                ) : (
                  <Bar
                    dataKey="sales"
                    fill="#0d9488"
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
          <div className="flex flex-col sm:flex-row items-center gap-4 min-h-[224px]">
            <div className="w-full sm:w-1/2 h-56 pie-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {productData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '11px',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Omzet']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full sm:w-1/2 space-y-1.5 max-h-56 overflow-y-auto pr-2 pie-legend-container custom-scrollbar">
              {productData.map((item) => (
                <div key={item.name} className="legend-item flex items-center gap-2 py-1 border-b border-border/30 last:border-0">
                  <div
                    className="legend-color h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground font-medium flex-1 text-[10px] leading-tight">{item.name}</span>
                  <span className="font-bold text-foreground text-[10px]">
                    {totalProductSales > 0 ? Math.round((item.value / totalProductSales) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Outlet Performance Summary (Visible for admin when all outlets selected) */}
      {isAdmin && selectedOutlet === 'all' && (
        <div className="stat-card bg-muted/20">
          <div className="flex items-center gap-2 mb-4">
            <Store className="h-4 w-4 text-teal-600" />
            <h3 className="font-bold text-sm uppercase tracking-widest">Ringkasan Per Outlet</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {outletSummaries.map((o, idx) => (
              <div key={idx} className="bg-background p-4 rounded-lg border border-border shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-base mb-1">{o.name}</h4>
                  <p className="text-xs text-muted-foreground mb-3">{o.transactions} Transaksi</p>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-xs text-muted-foreground">Omzet</p>
                  <p className="text-lg font-black text-teal-600">{formatCurrency(o.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report table */}
      <div className="stat-card overflow-hidden p-0">
        <div className="p-4 border-b border-border">
          <h3 className="font-medium text-foreground">Laporan Penjualan</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-2.5 px-4 text-[10px] font-bold text-muted-foreground whitespace-nowrap uppercase tracking-wider">Tanggal</th>
                <th className="text-left py-2.5 px-4 text-[10px] font-bold text-muted-foreground whitespace-nowrap uppercase tracking-wider">ID Transaksi</th>
                <th className="text-left py-2.5 px-4 text-[10px] font-bold text-muted-foreground whitespace-nowrap uppercase tracking-wider">Metode</th>
                <th className="text-left py-2.5 px-4 text-[10px] font-bold text-muted-foreground whitespace-nowrap uppercase tracking-wider">Outlet</th>
                <th className="text-left py-2.5 px-4 text-[10px] font-bold text-muted-foreground whitespace-nowrap uppercase tracking-wider">Produk</th>
                <th className="text-center py-2.5 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Jml</th>
                <th className="text-right py-2.5 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Harga</th>
                <th className="text-right py-2.5 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody>
              {exportData.slice(0, 50).map((row, idx) => (
                <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2.5 px-4 text-[10px] whitespace-nowrap">{row.Tanggal}</td>
                  <td className="py-2.5 px-4 text-[10px] font-mono text-muted-foreground">{row['ID Transaksi']}</td>
                  <td className="py-2.5 px-4 text-[10px] font-bold text-teal-600 uppercase">{row.Metode}</td>
                  <td className="py-2.5 px-4 text-[10px] truncate max-w-[120px]">{row.Outlet}</td>
                  <td className="py-2.5 px-4 text-[10px] font-medium">{row.Produk}</td>
                  <td className="py-2.5 px-4 text-[10px] text-center font-bold">{row.Jumlah}</td>
                  <td className="py-2.5 px-4 text-[10px] text-right">{formatCurrency(row.Harga)}</td>
                  <td className="py-2.5 px-4 text-[10px] text-right font-bold text-teal-700 whitespace-nowrap">{formatCurrency(row.Total)}</td>
                </tr>
              ))}
            </tbody>
            {exportData.length > 0 && (
              <tfoot className="bg-muted/30 font-black">
                <tr>
                  <td colSpan={7} className="py-3 px-4 text-right text-[11px] uppercase tracking-widest text-muted-foreground">Total Terhitung</td>
                  <td className="py-3 px-4 text-right text-[12px] text-teal-700 whitespace-nowrap">{formatCurrency(totalRevenue)}</td>
                </tr>
              </tfoot>
            )}
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