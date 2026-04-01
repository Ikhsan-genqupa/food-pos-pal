import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useOutlets } from '@/hooks/useOutlets';
import { useCategories } from '@/hooks/useCategories';
import { formatCurrency, formatDate, formatDateShort } from '@/lib/utils';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
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
import { FileSpreadsheet, FileText, Filter, Store, TrendingUp, Receipt, ShoppingBag, Wallet, Globe } from 'lucide-react';
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

  // Sync selected outlet with user profile once loaded
  React.useEffect(() => {
    if (!isAdmin && user?.outletId) {
      setSelectedOutlet(user.outletId);
    }
  }, [user?.outletId, isAdmin]);

  const formatYMD = (date: Date) => {
    return formatTz(toZonedTime(date, 'Asia/Jakarta'), 'yyyy-MM-dd', { timeZone: 'Asia/Jakarta' });
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
    // Get first day of current month in Jakarta
    const nowJakarta = toZonedTime(new Date(), 'Asia/Jakarta');
    const start = new Date(nowJakarta.getFullYear(), nowJakarta.getMonth(), 1);
    const end = new Date(nowJakarta.getFullYear(), nowJakarta.getMonth() + 1, 0); 
    
    setStartDate(formatYMD(start));
    setEndDate(formatYMD(end));
    setFilterType('month');
  };

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [selectedOrderSource, setSelectedOrderSource] = useState<string>('all');

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
      case 'transfer': return 'TF Bank';
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
      // Create a date object for startDate at 00:00:00 in Asia/Jakarta
      const [year, month, day] = startDate.split('-').map(Number);
      const start = toZonedTime(new Date(year, month - 1, day, 0, 0, 0, 0), 'Asia/Jakarta');
      txList = txList.filter(tx => tx.createdAt >= start);
    }
    if (endDate) {
      // Create a date object for endDate at 23:59:59.999 in Asia/Jakarta
      const [year, month, day] = endDate.split('-').map(Number);
      const end = toZonedTime(new Date(year, month - 1, day, 23, 59, 59, 999), 'Asia/Jakarta');
      txList = txList.filter(tx => tx.createdAt <= end);
    }

    if (selectedPaymentMethod !== 'all') {
      txList = txList.filter(tx => tx.paymentMethod.toLowerCase() === selectedPaymentMethod.toLowerCase());
    }

    if (selectedOrderSource !== 'all') {
      txList = txList.filter(tx => tx.orderSource === selectedOrderSource);
    }
    
    return txList;
  };
  
  const filteredTransactions = getFilteredTransactions().sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

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
        Sumber: tx.orderSource === 'online' ? 'Online' : 'Offline',
      }));
  });

  const totalRevenue = exportData.reduce((sum, row) => sum + row.Total, 0);
  const totalTransactions = [...new Set(exportData.map(r => r['ID Transaksi']))].length;
  const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  
  const getJakartaStartOfDay = (ymd: string) => {
    const [y, m, d] = ymd.split('-').map(Number);
    // Create in local then map to Jakarta zoned
    return toZonedTime(new Date(y, m - 1, d, 0, 0, 0, 0), 'Asia/Jakarta');
  };

  const startObj = getJakartaStartOfDay(startDate);
  const endObj = getJakartaStartOfDay(endDate);
  const totalDaysInRange = Math.ceil(Math.abs(endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Calculate elapsed days for "daily average" divisor
  const todayZoned = toZonedTime(new Date(), 'Asia/Jakarta');
  todayZoned.setHours(0, 0, 0, 0); // Start of today in Jakarta
  
  let elapsedDays = totalDaysInRange;
  if (todayZoned < startObj) {
    elapsedDays = 1; // Range in future, use 1 to avoid /0
  } else if (todayZoned <= endObj) {
    // Current day is within range, use days from start to today (inclusive)
    const diffTime = Math.abs(todayZoned.getTime() - startObj.getTime());
    elapsedDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
  // If todayZoned > endObj, use totalDaysInRange (all days in range have passed)
  
  const avgDailyRevenue = totalRevenue / elapsedDays;
  const avgDailyTransactions = totalTransactions / elapsedDays;
  
  const totalOnlineRevenue = filteredTransactions
    .filter(tx => tx.orderSource === 'online')
    .reduce((sum, tx) => sum + tx.total, 0);

  const totalOfflineRevenue = filteredTransactions
    .filter(tx => tx.orderSource === 'offline')
    .reduce((sum, tx) => sum + tx.total, 0);

  const orderSourceVolumeData = [
    { name: 'Online', value: filteredTransactions.filter(tx => tx.orderSource === 'online').length, color: '#3b82f6' },
    { name: 'Offline', value: filteredTransactions.filter(tx => tx.orderSource === 'offline').length, color: '#10b981' },
  ].filter(d => d.value > 0);

  const outletSummaries = selectedOutlet === 'all' ? Array.from(
    exportData.reduce((acc, row) => {
      const key = row.Outlet;
      if (!acc.has(key)) {
        acc.set(key, { 
          name: key, 
          revenue: 0, 
          transactions: new Set(),
          onlineRevenue: 0,
          offlineRevenue: 0,
          onlineTransactions: new Set(),
          offlineTransactions: new Set()
        });
      }
      const data = acc.get(key)!;
      data.revenue += row.Total;
      data.transactions.add(row['ID Transaksi']);
      
      if (row.Sumber === 'Online') {
        data.onlineRevenue += row.Total;
        data.onlineTransactions.add(row['ID Transaksi']);
      } else {
        data.offlineRevenue += row.Total;
        data.offlineTransactions.add(row['ID Transaksi']);
      }
      
      return acc;
    }, new Map<string, any>())
  ).map(([_, val]) => ({
    name: val.name,
    revenue: val.revenue,
    transactions: val.transactions.size,
    avg: val.transactions.size > 0 ? val.revenue / val.transactions.size : 0,
    onlineRevenue: val.onlineRevenue,
    offlineRevenue: val.offlineRevenue,
    onlineTransactions: val.onlineTransactions.size,
    offlineTransactions: val.offlineTransactions.size
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
    const headers = ['Tanggal', 'ID Transaksi', 'Outlet', 'Cabang', 'Produk', 'Metode', 'Sumber', 'Jumlah', 'Harga', 'Total'];
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
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
      ];
      const isSameDate = startStr === endStr;
      const isSameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
      if (isSameDate) return `${start.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
      if (isSameMonth) return `${start.getDate()} - ${end.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
      return `${start.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()} - ${end.getDate()} ${monthNames[end.getMonth()]} ${end.getFullYear()}`;
    };

    const periodeTitle = formatPeriodeIndo(startDate, endDate);
    const documentTitle = `Laporan Penjualan - ${outletInfo} - ${periodeTitle}`;

    // ─── Build Bar Chart SVG from data ───────────────────────────────────────
    const buildBarChartSvg = () => {
      const isAdminAll = isAdmin && selectedOutlet === 'all';
      const W = 340;
      const chartW = W - 45 - 10; // marginL=45, marginR=10

      // ── Legend layout calculation ──────────────────────────────────────────
      // Estimate each item width: dot(7) + gap(4) + text(chars * 4.5) + itemSpacing(14)
      const dotW = 7, dotTextGap = 4, charW = 4.5, itemSpacing = 14;
      const itemWidths = isAdminAll
        ? outlets.map(o => dotW + dotTextGap + o.name.length * charW + itemSpacing)
        : [];
      const totalOnOneRow = itemWidths.reduce((s, w) => s + w, 0);

      const legendRowH = 13;
      let legendRows: typeof outlets[] = [];
      if (isAdminAll) {
        if (totalOnOneRow <= chartW) {
          // Fits on 1 row
          legendRows = [outlets];
        } else {
          // Split into 2 rows as evenly as possible by width
          const mid = Math.ceil(outlets.length / 2);
          legendRows = [outlets.slice(0, mid), outlets.slice(mid)];
        }
      }
      const legendAreaH = legendRows.length > 0 ? legendRows.length * legendRowH + 4 : 0;

      const marginL = 45, marginR = 10, marginT = 10 + legendAreaH, marginB = 38;
      const chartH = 160;
      const H = marginT + chartH + marginB;

      const displayData = sortedDailyData;
      const maxVal = Math.max(...displayData.map(d => d.total), 1);
      const barCount = displayData.length;
      const barW = Math.max(4, Math.min(28, (chartW / barCount) * 0.65));
      const gap = chartW / barCount;

      // Y-axis ticks
      const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxVal * f));

      let gridLines = '';
      yTicks.forEach(tick => {
        const y = marginT + chartH - (tick / maxVal) * chartH;
        const label = tick >= 1000 ? `${(tick / 1000).toFixed(0)}K` : tick;
        gridLines += `<line x1="${marginL}" y1="${y.toFixed(1)}" x2="${W - marginR}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="0.5"/>`;
        gridLines += `<text x="${marginL - 4}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="7" fill="#9ca3af">${label}</text>`;
      });

      let bars = '';
      let xLabels = '';
      displayData.forEach((d, i) => {
        const x = marginL + gap * i + gap / 2;

        if (isAdminAll) {
          let stackY = marginT + chartH;
          outlets.forEach((outlet, oi) => {
            const val = d[outlet.id] || 0;
            if (val <= 0) return;
            const bh = (val / maxVal) * chartH;
            stackY -= bh;
            bars += `<rect x="${(x - barW / 2).toFixed(1)}" y="${stackY.toFixed(1)}" width="${barW}" height="${bh.toFixed(1)}" fill="${outletColors[oi % outletColors.length]}" rx="1"/>`;
          });
        } else {
          const val = d.sales || 0;
          const bh = Math.max(0, (val / maxVal) * chartH);
          const by = marginT + chartH - bh;
          bars += `<rect x="${(x - barW / 2).toFixed(1)}" y="${by.toFixed(1)}" width="${barW}" height="${bh.toFixed(1)}" fill="#0d9488" rx="2"/>`;
        }

        // X-axis label: DD/MM only (show every Nth if too many)
        const step = barCount > 14 ? Math.ceil(barCount / 7) : 1;
        if (i % step === 0 || i === barCount - 1) {
          const parts = (d.dKey as string).split('-');
          const ddmm = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d.date;
          xLabels += `<text x="${x.toFixed(1)}" y="${(marginT + chartH + 12).toFixed(1)}" text-anchor="middle" font-size="7" fill="#9ca3af">${ddmm}</text>`;
        }
      });

      // X-axis title: current year
      const currentYear = new Date(startDate).getFullYear() || new Date().getFullYear();
      const xAxisTitle = `<text x="${(marginL + chartW / 2).toFixed(1)}" y="${(marginT + chartH + 28).toFixed(1)}" text-anchor="middle" font-size="7.5" font-weight="600" fill="#6b7280">${currentYear}</text>`;

      // ── Render legend rows, each row centered ──────────────────────────────
      let legendSvg = '';
      if (isAdminAll) {
        // Build a global index→outletColors lookup
        legendRows.forEach((rowOutlets, rowIdx) => {
          const rowItemWidths = rowOutlets.map(o => dotW + dotTextGap + o.name.length * charW + itemSpacing);
          const rowTotalW = rowItemWidths.reduce((s, w) => s + w, 0) - itemSpacing; // remove trailing gap
          // Center this row within [0, chartW]
          let cx = (chartW - rowTotalW) / 2;
          const ly = rowIdx * legendRowH;
          rowOutlets.forEach((outlet, itemIdx) => {
            // Find original index in outlets array for correct color
            const origIdx = outlets.findIndex(o => o.id === outlet.id);
            legendSvg += `<rect x="${cx.toFixed(1)}" y="${ly}" width="${dotW}" height="${dotW}" fill="${outletColors[origIdx % outletColors.length]}" rx="3.5"/>`;
            legendSvg += `<text x="${(cx + dotW + dotTextGap).toFixed(1)}" y="${(ly + 6).toFixed(1)}" font-size="7.5" fill="#374151" font-weight="600">${outlet.name}</text>`;
            cx += rowItemWidths[itemIdx];
          });
        });
      }

      return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
        ${legendSvg ? `<g transform="translate(${marginL},${marginT - legendAreaH + 2})">${legendSvg}</g>` : ''}
        ${gridLines}
        ${bars}
        ${xLabels}
        ${xAxisTitle}
      </svg>`;
    };

    // ─── Build Donut Chart SVG (Proporsi Produk) ──────────────────────────────
    const buildDonutSvg = () => {
      const size = 180, cx = 90, cy = 90, outerR = 72, innerR = 50;
      let paths = '';
      const total = productData.reduce((s, p) => s + p.value, 0);
      if (total === 0) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ${size} ${size}"><circle cx="${cx}" cy="${cy}" r="${outerR}" fill="#e5e7eb"/></svg>`;
      }
      let startAngle = -Math.PI / 2;
      productData.forEach((item) => {
        const slice = (item.value / total) * 2 * Math.PI;
        const endAngle = startAngle + slice;
        const gap = 0.03;
        const s = startAngle + gap;
        const e = endAngle - gap;
        const x1o = cx + outerR * Math.cos(s), y1o = cy + outerR * Math.sin(s);
        const x2o = cx + outerR * Math.cos(e), y2o = cy + outerR * Math.sin(e);
        const x1i = cx + innerR * Math.cos(e), y1i = cy + innerR * Math.sin(e);
        const x2i = cx + innerR * Math.cos(s), y2i = cy + innerR * Math.sin(s);
        const large = slice > Math.PI ? 1 : 0;
        paths += `<path d="M${x1o.toFixed(2)},${y1o.toFixed(2)} A${outerR},${outerR} 0 ${large},1 ${x2o.toFixed(2)},${y2o.toFixed(2)} L${x1i.toFixed(2)},${y1i.toFixed(2)} A${innerR},${innerR} 0 ${large},0 ${x2i.toFixed(2)},${y2i.toFixed(2)} Z" fill="${item.color}"/>`;
        startAngle = endAngle;
      });
      return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMidYMid meet">${paths}</svg>`;
    };

    // ─── Build Pie Chart SVG (Online vs Offline) ──────────────────────────────
    const buildPieSvg = () => {
      const size = 180, cx = 90, cy = 90, r = 72;
      const total = orderSourceVolumeData.reduce((s, d) => s + d.value, 0);
      if (total === 0) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ${size} ${size}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="#e5e7eb"/></svg>`;
      }
      let paths = '';
      let startAngle = -Math.PI / 2;
      orderSourceVolumeData.forEach((item) => {
        const slice = (item.value / total) * 2 * Math.PI;
        const endAngle = startAngle + slice * 0.97;
        const x1 = cx + r * Math.cos(startAngle + 0.03);
        const y1 = cy + r * Math.sin(startAngle + 0.03);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        const large = slice > Math.PI ? 1 : 0;
        paths += `<path d="M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z" fill="${item.color}"/>`;
        startAngle += slice;
      });
      return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMidYMid meet">${paths}</svg>`;
    };

    // ─── Build Product Legend HTML ────────────────────────────────────────────
    const totalProd = productData.reduce((s, p) => s + p.value, 0);
    const productLegendItems = productData.map(item => {
      const pct = totalProd > 0 ? Math.round((item.value / totalProd) * 100) : 0;
      const rupiah = `Rp${item.value.toLocaleString('id-ID')}`;
      return `<div class="legend-item">
        <div class="legend-color" style="background:${item.color};"></div>
        <span>${item.name} – ${item.quantity} terjual &middot; ${rupiah} (${pct}%)</span>
      </div>`;
    }).join('');

    // ─── Build Online/Offline Legend HTML ────────────────────────────────────
    const totalOrderVol = orderSourceVolumeData.reduce((s, d) => s + d.value, 0);
    const sourceLegendItems = orderSourceVolumeData.map(item => {
      const pct = totalOrderVol > 0 ? Math.round((item.value / totalOrderVol) * 100) : 0;
      const rupiah = item.name === 'Online'
        ? `Rp${totalOnlineRevenue.toLocaleString('id-ID')}`
        : `Rp${totalOfflineRevenue.toLocaleString('id-ID')}`;
      return `<div class="legend-item">
        <div class="legend-color" style="background:${item.color};"></div>
        <span>${item.name} – ${pct}% &middot; ${rupiah}</span>
      </div>`;
    }).join('');

    const barChartSvgStr = buildBarChartSvg();
    const donutSvgStr = buildDonutSvg();
    const pieSvgStr = buildPieSvg();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>${documentTitle}</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          * { box-sizing: border-box; }
          html { counter-reset: page; }
          body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            padding: 0; margin: 0;
            color: #1a1a1a;
            background: white;
            line-height: 1.4;
            font-size: 9px;
          }

          /* ── Header ── */
          .header { text-align: center; margin-bottom: 16px; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 800; color: #000; letter-spacing: -0.5px; }
          .header .report-title { margin: 4px 0 2px; font-size: 11px; font-weight: 700; color: #4b5563; text-transform: uppercase; letter-spacing: 1px; }
          .header .outlet-name { margin: 0; font-size: 10px; color: #6b7280; }
          .header .periode { margin: 2px 0 0; font-size: 9px; color: #9ca3af; }

          /* ── Summary cards ── */
          .summary-container {
            background: #f9fafb; border-radius: 10px;
            padding: 12px 16px; margin-bottom: 14px;
            display: flex; justify-content: space-between;
            border: 1px solid #f3f4f6;
          }
          .summary-item { text-align: center; flex: 1; }
          .summary-item:not(:last-child) { border-right: 1px solid #e5e7eb; }
          .summary-item .value { font-size: 14px; font-weight: 700; color: #0d9488; margin-bottom: 2px; }
          .summary-item .label { font-size: 8px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }

          /* ── Charts grid ── */
          .charts-grid {
            display: flex; gap: 8px; margin-bottom: 14px;
          }
          .chart-box {
            flex: 1; border: 1px solid #f0f0f0; border-radius: 10px;
            padding: 10px 8px 6px; background: white;
            display: flex; flex-direction: column; align-items: center;
            min-width: 0;
          }
          .chart-title {
            font-size: 8px; font-weight: 800; color: #111827;
            text-transform: uppercase; letter-spacing: 0.6px;
            margin-bottom: 6px; text-align: center; width: 100%;
          }
          .chart-svg-wrap {
            width: 100%; display: block;
          }
          .chart-svg-wrap svg { width: 100%; height: auto; display: block; }
          .chart-svg-wrap.circle-chart { display: flex; justify-content: center; }
          .chart-svg-wrap.circle-chart svg { width: auto; max-width: 100%; max-height: 160px; }

          /* ── Legends ── */
          .legend-grid {
            display: flex; flex-wrap: wrap; justify-content: center;
            gap: 4px 12px; margin-top: 8px; width: 100%;
          }
          .legend-item {
            display: flex; align-items: center; gap: 4px;
            font-size: 7px; font-weight: 600; color: #374151;
          }
          .legend-item span { white-space: nowrap; }
          .legend-dot {
            width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
          }

          /* ── Section title ── */
          .section-title {
            font-size: 9px; font-weight: 800; text-transform: uppercase;
            color: #374151; border-bottom: 2px solid #0d9488;
            display: inline-block; padding-bottom: 2px; margin: 10px 0 4px;
          }

          /* ── Table ── */
          table {
            width: 100%; border-collapse: collapse;
            border-radius: 6px; overflow: hidden;
            border-style: hidden; box-shadow: 0 0 0 1px #f3f4f6;
          }
          th {
            background: #0d9488; color: white; text-align: left;
            padding: 4px 8px; font-size: 7.5px; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.4px; white-space: nowrap;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
          td {
            padding: 3px 8px; border-bottom: 1px solid #f3f4f6;
            font-size: 7.5px; color: #374151; white-space: nowrap;
          }
          tr { page-break-inside: avoid; }
          tr:last-child td { border-bottom: none; }
          tr:nth-child(even) { background: #fafafa; }

          tfoot td { background: #f9fafb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

          /* ── Footer ── */
          .footer {
            position: fixed; bottom: 0; left: 0; right: 0; height: 36px;
            font-size: 7.5px; color: #9ca3af; background: white;
            padding: 8px 16px; border-top: 1px solid #f3f4f6;
            display: flex; justify-content: space-between; align-items: center;
          }
          body { padding-bottom: 60px; }
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
            <div class="label">Total Omzet</div>
          </div>
          <div class="summary-item">
            <div class="value">Rp ${totalOnlineRevenue.toLocaleString('id-ID')}</div>
            <div class="label">Omzet Online</div>
          </div>
          <div class="summary-item">
            <div class="value">Rp ${totalOfflineRevenue.toLocaleString('id-ID')}</div>
            <div class="label">Omzet Offline</div>
          </div>
          <div class="summary-item">
            <div class="value">${totalTransactions}</div>
            <div class="label">Total Transaksi</div>
          </div>
          <div class="summary-item">
            <div class="value">Rp ${Math.round(avgTransaction).toLocaleString('id-ID')}</div>
            <div class="label">Rata-rata Trx</div>
          </div>
          <div class="summary-item">
            <div class="value">Rp ${Math.round(avgDailyRevenue).toLocaleString('id-ID')}</div>
            <div class="label">Pendapatan Harian</div>
          </div>
          <div class="summary-item">
            <div class="value">${avgDailyTransactions.toFixed(1)}</div>
            <div class="label">Transaksi Harian</div>
          </div>
        </div>

        <div class="charts-grid">
          <!-- Bar Chart -->
          <div class="chart-box">
            <div class="chart-title">Grafik Penjualan</div>
            <div class="chart-svg-wrap">${barChartSvgStr}</div>
          </div>

          <!-- Donut Chart -->
          <div class="chart-box">
            <div class="chart-title">Proporsi Produk</div>
            <div class="chart-svg-wrap circle-chart">${donutSvgStr}</div>
            <div class="legend-grid">${productLegendItems}</div>
          </div>

          <!-- Pie Chart -->
          <div class="chart-box">
            <div class="chart-title">Volume Online vs Offline</div>
            <div class="chart-svg-wrap circle-chart">${pieSvgStr}</div>
            <div class="legend-grid">${sourceLegendItems}</div>
          </div>
        </div>

        ${selectedOutlet === 'all' ? `
          <div class="section-title">Ringkasan Per Outlet</div>
          <table style="margin-bottom: 10px;">
            <thead>
              <tr>
                <th style="width: 20%;">Nama Outlet</th>
                <th style="text-align:center; background:#0d9488;">Total Trx</th>
                <th style="text-align:center; background:#3b82f6;">Online Trx</th>
                <th style="text-align:center; background:#10b981;">Offline Trx</th>
                <th style="text-align:right; background:#0d9488;">Total Omzet</th>
                <th style="text-align:right; background:#3b82f6;">Online Omzet</th>
                <th style="text-align:right; background:#10b981;">Offline Omzet</th>
                <th style="text-align:right;">Rata-rata</th>
              </tr>
            </thead>
            <tbody>
              ${outletSummaries.map((o: any) => `
                <tr>
                  <td style="font-weight:700;">${o.name}</td>
                  <td style="text-align:center;">${o.transactions}</td>
                  <td style="text-align:center; color:#3b82f6;">${o.onlineTransactions}</td>
                  <td style="text-align:center; color:#10b981;">${o.offlineTransactions}</td>
                  <td style="text-align:right; font-weight:700;">Rp ${o.revenue.toLocaleString('id-ID')}</td>
                  <td style="text-align:right; color:#2563eb;">Rp ${o.onlineRevenue.toLocaleString('id-ID')}</td>
                  <td style="text-align:right; color:#059669;">Rp ${o.offlineRevenue.toLocaleString('id-ID')}</td>
                  <td style="text-align:right;">Rp ${Math.round(o.avg).toLocaleString('id-ID')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="section-title" style="margin-top:12px;">Detail Transaksi</div>
        <div style="background:#f0fdf9;border-radius:6px 6px 0 0;border:1px solid #d1fae5;border-bottom:none;display:flex;justify-content:flex-end;align-items:center;padding:5px 8px;margin-top:0;">
          <span style="font-weight:700;font-size:7.5px;text-transform:uppercase;color:#374151;margin-right:12px;">Total Transaksi</span>
          <span style="font-weight:800;font-size:9px;color:#0d9488;border-bottom:2px solid #0d9488;padding-bottom:1px;">Rp${totalRevenue.toLocaleString('id-ID')}</span>
        </div>
        <table style="border-radius:0 0 6px 6px;">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>ID Transaksi</th>
              <th>Outlet</th>
              <th>Sumber</th>
              <th>Metode</th>
              <th>Produk</th>
              <th style="text-align:center;">Jml</th>
              <th style="text-align:right;">Harga</th>
              <th style="text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${exportData.map(row => `
              <tr>
                <td>${row.Tanggal}</td>
                <td style="font-family:monospace;">${row['ID Transaksi']}</td>
                <td>${row.Outlet}</td>
                <td style="font-weight:600;">${row.Sumber}</td>
                <td style="font-weight:600;">${row.Metode}</td>
                <td style="color:#4b5563;">${row.Produk}</td>
                <td style="text-align:center;">${row.Jumlah}</td>
                <td style="text-align:right;">Rp${row.Harga.toLocaleString('id-ID')}</td>
                <td style="text-align:right;font-weight:700;color:#0d9488;">Rp${row.Total.toLocaleString('id-ID')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <span>GenQuPa POS &bull; Premium Business Intelligence System</span>
          <span>Dicetak: ${new Date().toLocaleString('id-ID')}</span>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.title = documentTitle;
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 800);
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
                <SelectItem value="transfer">TF Bank</SelectItem>
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
          <div className="space-y-2">
            <Label>Sumber Pesanan</Label>
            <Select value={selectedOrderSource} onValueChange={setSelectedOrderSource}>
              <SelectTrigger>
                <SelectValue placeholder="Semua Sumber" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Sumber</SelectItem>
                <SelectItem value="online">🌐 Online (Aplikasi)</SelectItem>
                <SelectItem value="offline">🏪 Offline (Kasir)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <div className="stat-card text-center border-t-4 border-teal-500 flex flex-col justify-between py-3 px-2">
          <div>
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Total Omzet</p>
            <p className="text-lg font-black text-teal-600 font-mono">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
        <div className="stat-card text-center border-t-4 border-blue-500 flex flex-col justify-between bg-blue-50/10 py-3 px-2">
          <div>
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center justify-center gap-1">
              <Globe className="h-2.5 w-2.5 text-blue-500" /> Omzet Online
            </p>
            <p className="text-lg font-black text-blue-600 font-mono">{formatCurrency(totalOnlineRevenue)}</p>
          </div>
        </div>
        <div className="stat-card text-center border-t-4 border-emerald-500 flex flex-col justify-between bg-emerald-50/10 py-3 px-2">
          <div>
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center justify-center gap-1">
              <Store className="h-2.5 w-2.5 text-emerald-500" /> Omzet Offline
            </p>
            <p className="text-lg font-black text-emerald-600 font-mono">{formatCurrency(totalOfflineRevenue)}</p>
          </div>
        </div>
        <div className="stat-card text-center border-t-2 border-slate-200 flex flex-col justify-center py-3 px-2">
          <div>
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Total Transaksi</p>
            <p className="text-lg font-black text-slate-700 font-mono">{totalTransactions}</p>
          </div>
        </div>
        <div className="stat-card text-center border-t-2 border-slate-200 flex flex-col justify-center py-3 px-2">
          <div>
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Rata-rata Transaksi</p>
            <p className="text-[14px] font-black text-slate-700 font-mono">{formatCurrency(avgTransaction)}</p>
          </div>
        </div>
        <div className="stat-card text-center border-t-2 border-teal-100 flex flex-col justify-center py-3 px-2">
          <div>
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Pendapatan Harian</p>
            <p className="text-[14px] font-black text-teal-600 font-mono">{formatCurrency(avgDailyRevenue)}</p>
          </div>
        </div>
        <div className="stat-card text-center border-t-2 border-teal-100 flex flex-col justify-center py-3 px-2">
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Transaksi Harian</p>
            <p className="text-lg font-black text-foreground">{avgDailyTransactions.toFixed(1)}</p>
        </div>
      </div>

      {/* Charts Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales chart */}
        <div className="stat-card flex flex-col h-full bg-white dark:bg-card border border-border shadow-sm">
          <h3 className="font-medium text-foreground mb-4 font-bold text-sm uppercase tracking-wider text-center">Grafik Penjualan</h3>
          <div className="h-[300px] bar-chart-container flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedDailyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val: string) => val.slice(0, 5)}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  tickFormatter={(value) => `${value / 1000}K`}
                  axisLine={false}
                  tickLine={false}
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
                    align="center"
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
        <div className="stat-card flex flex-col h-full bg-white dark:bg-card border border-border shadow-sm">
          <h3 className="font-medium text-foreground mb-4 font-bold text-sm uppercase tracking-wider text-center">Proporsi Produk</h3>
          <div className="flex flex-col items-center flex-1 justify-center">
            <div className="w-full h-[300px] pie-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
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
            <div className="w-full mt-4">
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 px-4 pb-2">
                {productData.map((item) => (
                  <div key={item.name} className="legend-item flex items-center gap-1.5 whitespace-nowrap">
                    <div
                      className="legend-color h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {item.name} - {item.quantity} terjual &middot; {formatCurrency(item.value)} ({totalProductSales > 0 ? Math.round((item.value / totalProductSales) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Order Source Chart */}
        <div className="stat-card flex flex-col h-full bg-white dark:bg-card border border-border shadow-sm">
          <h3 className="font-medium text-foreground mb-4 font-bold text-sm uppercase tracking-wider text-center">Volume Online vs Offline</h3>
          <div className="flex flex-col items-center flex-1 justify-center">
            <div className="w-full h-[300px] source-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderSourceVolumeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {orderSourceVolumeData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full mt-4">
              <div className="flex flex-wrap justify-center gap-x-8 px-4 pb-2">
                {orderSourceVolumeData.map((item) => {
                  const total = orderSourceVolumeData.reduce((acc, curr) => acc + curr.value, 0);
                  const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
                  const rupiah = item.name === 'Online' ? totalOnlineRevenue : totalOfflineRevenue;
                  return (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {item.name} - {percentage}% &middot; {formatCurrency(rupiah)}
                      </span>
                    </div>
                  );
                })}
              </div>
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
            {outletSummaries.map((o: any, idx) => (
              <div key={idx} className="bg-background p-4 rounded-lg border border-border shadow-sm flex flex-col">
                <div className="mb-3">
                  <h4 className="font-bold text-base mb-1">{o.name}</h4>
                  <div className="flex gap-3">
                    <p className="text-[10px] font-medium text-muted-foreground"><span className="text-slate-900 font-bold">{o.transactions}</span> Total Trx</p>
                    <p className="text-[10px] font-medium text-blue-500"><span className="font-bold">{o.onlineTransactions}</span> Online</p>
                    <p className="text-[10px] font-medium text-teal-600"><span className="font-bold">{o.offlineTransactions}</span> Offline</p>
                  </div>
                </div>
                
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">Total Omzet</p>
                    <p className="text-sm font-black text-teal-600">{formatCurrency(o.revenue)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] text-muted-foreground/70 underline decoration-blue-200">Online</p>
                    <p className="text-[11px] font-bold text-blue-600/80">{formatCurrency(o.onlineRevenue)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] text-muted-foreground/70 underline decoration-teal-200">Offline</p>
                    <p className="text-[11px] font-bold text-teal-600/80">{formatCurrency(o.offlineRevenue)}</p>
                  </div>
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
              {exportData.length > 0 && (
                <tr className="bg-teal-50/60 border-b-2 border-teal-200">
                  <td colSpan={8} className="py-2.5 px-4 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Transaksi</td>
                  <td className="py-2.5 px-4 text-right text-[12px] font-black text-teal-700 whitespace-nowrap border-b-2 border-teal-500">{formatCurrency(totalRevenue)}</td>
                </tr>
              )}
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-2.5 px-4 text-[10px] font-bold text-muted-foreground whitespace-nowrap uppercase tracking-wider">Tanggal</th>
                <th className="text-left py-2.5 px-4 text-[10px] font-bold text-muted-foreground whitespace-nowrap uppercase tracking-wider">ID Transaksi</th>
                <th className="text-center py-2.5 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sumber</th>
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
                  <td className="py-2.5 px-4 text-[10px] text-center">
                    {row.Sumber === 'Online' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[9px]">
                        <Globe className="h-2.5 w-2.5" /> ONLINE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[9px]">
                        <Store className="h-2.5 w-2.5" /> OFFLINE
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-[10px] font-bold text-teal-600 uppercase">{row.Metode}</td>
                  <td className="py-2.5 px-4 text-[10px] truncate max-w-[120px]">{row.Outlet}</td>
                  <td className="py-2.5 px-4 text-[10px] font-medium">{row.Produk}</td>
                  <td className="py-2.5 px-4 text-[10px] text-center font-bold">{row.Jumlah}</td>
                  <td className="py-2.5 px-4 text-[10px] text-right">{formatCurrency(row.Harga)}</td>
                  <td className="py-2.5 px-4 text-[10px] text-right font-bold text-teal-700 whitespace-nowrap">{formatCurrency(row.Total)}</td>
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