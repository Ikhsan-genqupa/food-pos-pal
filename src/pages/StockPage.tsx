import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStocks, useUpdateStock } from '@/hooks/useStocks';
import { useOutlets } from '@/hooks/useOutlets';
import { useCleanInvalidStocks } from '@/hooks/useCleanStocks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Package, AlertTriangle, Edit, Store, Trash2, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

export default function StockPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOutlet, setSelectedOutlet] = useState(isAdmin ? 'all' : (user?.outletId || ''));
  const [editStock, setEditStock] = useState<{ productId: string; outletId: string; quantity: number } | null>(null);
  const [newQuantity, setNewQuantity] = useState('');

  const { data: stocks = [], isLoading: stocksLoading } = useStocks(selectedOutlet);
  const { data: outlets = [] } = useOutlets();
  const updateStockMutation = useUpdateStock();
  const cleanStocksMutation = useCleanInvalidStocks();

  const getFilteredStocks = () => {
    let stockList = stocks;
    if (!isAdmin && user?.outletId) { stockList = stockList.filter(s => s.outletId === user.outletId); }
    return stockList.filter((stock) => {
      const productName = stock.product?.name || '';
      const matchesSearch = productName.toLowerCase().includes(searchQuery.toLowerCase());
      const isNotBundle = stock.product?.isBundle !== true;
      return matchesSearch && isNotBundle;
    });
  };

  const filteredStocks = getFilteredStocks();
  const lowStockCount = filteredStocks.filter((s) => s.quantity < 10).length;
  const canEditStock = isAdmin || user?.role === 'outlet';

  const handleUpdateStock = () => {
    if (!editStock || !canEditStock) return;
    const qty = parseInt(newQuantity);
    if (isNaN(qty) || qty < 0) { toast({ title: 'Gagal', description: 'Masukkan jumlah yang valid', variant: 'destructive' }); return; }
    updateStockMutation.mutate({ productId: editStock.productId, outletId: editStock.outletId, quantity: qty }, {
      onSuccess: () => { setEditStock(null); setNewQuantity(''); }
    });
  };

  const openEditDialog = (productId: string, outletId: string, currentQty: number) => {
    if (!canEditStock) { toast({ title: 'Gagal', description: 'Anda tidak memiliki akses untuk mengubah stok', variant: 'destructive' }); return; }
    if (!isAdmin && outletId !== user?.outletId) { toast({ title: 'Gagal', description: 'Anda hanya dapat mengedit stok outlet Anda', variant: 'destructive' }); return; }
    setEditStock({ productId, outletId, quantity: currentQty });
    setNewQuantity(currentQty.toString());
  };

  const handleCleanStocks = () => { if (confirm('Apakah Anda yakin ingin menghapus semua data stok yang tidak valid?')) { cleanStocksMutation.mutate(); } };

  if (stocksLoading) return (<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-xl font-bold text-foreground">Manajemen Stok</h1>
          <p className="text-sm text-muted-foreground">{isAdmin ? 'Kelola stok semua outlet' : `Stok ${user?.outletName}`}</p></div>
        <div className="flex items-center gap-2">
          {lowStockCount > 0 && (<div className="flex items-center gap-2 px-3 py-1.5 bg-warning/10 text-warning rounded-lg"><AlertTriangle className="h-4 w-4" /><span className="text-xs font-medium">{lowStockCount} item stok menipis</span></div>)}
          {isAdmin && (<Button variant="outline" size="sm" onClick={handleCleanStocks} disabled={cleanStocksMutation.isPending} className="text-destructive hover:text-destructive">
            {cleanStocksMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}Bersihkan Data Invalid</Button>)}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari produk..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div>
        {isAdmin && (<Select value={selectedOutlet} onValueChange={setSelectedOutlet}><SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Semua Outlet" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Semua Outlet</SelectItem>{outlets.map((outlet) => (<SelectItem key={outlet.id} value={outlet.id}>{outlet.name} - {outlet.branchNumber}</SelectItem>))}</SelectContent></Select>)}
      </div>

      {!isAdmin && (<div className="flex items-center gap-2 text-sm text-muted-foreground"><Store className="h-4 w-4" /><span>Menampilkan stok: <span className="font-medium text-foreground">{user?.outletName}</span></span></div>)}

      <div className="stat-card overflow-hidden p-0"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-border bg-muted/50">
        <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Produk</th>
        {isAdmin && selectedOutlet === 'all' && <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Outlet</th>}
        <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Harga</th>
        <th className="text-center py-2.5 px-4 text-xs font-medium text-muted-foreground">Stok</th>
        <th className="text-center py-2.5 px-4 text-xs font-medium text-muted-foreground">Status</th>
        {canEditStock && <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">Aksi</th>}
      </tr></thead><tbody>
        {filteredStocks.map((stock) => {
          const isLowStock = stock.quantity < 10;
          const isOutOfStock = stock.quantity === 0;
          return (<tr key={stock.id} className="border-b border-border/50 hover:bg-muted/30">
            <td className="py-2.5 px-4"><div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-muted overflow-hidden flex-shrink-0"><img src={stock.product?.image || '/placeholder.svg'} alt={stock.product?.name} className="w-full h-full object-cover" /></div>
              <span className="font-medium text-sm">{stock.product?.name}</span></div></td>
            {isAdmin && selectedOutlet === 'all' && <td className="py-2.5 px-4 text-xs text-muted-foreground">{stock.outlet?.name} - {stock.outlet?.branchNumber}</td>}
            <td className="py-2.5 px-4 text-xs">{formatCurrency(stock.product?.price || 0)}</td>
            <td className="py-2.5 px-4 text-center"><span className={`font-medium text-sm ${isOutOfStock ? 'text-destructive' : isLowStock ? 'text-warning' : ''}`}>{stock.quantity}</span></td>
            <td className="py-2.5 px-4 text-center">{isOutOfStock ? (<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-destructive/10 text-destructive">Habis</span>) : isLowStock ? (<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-warning/10 text-warning">Menipis</span>) : (<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-success/10 text-success">Tersedia</span>)}</td>
            {canEditStock && <td className="py-2.5 px-4 text-right"><Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEditDialog(stock.productId, stock.outletId, stock.quantity)}><Edit className="h-3 w-3 mr-1" />Ubah</Button></td>}
          </tr>);
        })}
      </tbody></table></div>
        {filteredStocks.length === 0 && (<div className="text-center py-12"><Package className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" /><p className="text-muted-foreground text-sm">Tidak ada data stok</p>
          {outlets.length === 0 && <p className="text-muted-foreground text-xs mt-1">Buat outlet terlebih dahulu untuk mengelola stok</p>}</div>)}</div>

      <Dialog open={!!editStock} onOpenChange={() => setEditStock(null)}><DialogContent><DialogHeader><DialogTitle>Perbarui Stok</DialogTitle></DialogHeader>
        <div className="space-y-4"><div className="space-y-2"><Label>Jumlah Baru</Label><Input type="number" min="0" value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} placeholder="Masukkan jumlah" /></div>
          <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => setEditStock(null)}>Batal</Button>
            <Button className="flex-1" onClick={handleUpdateStock} disabled={updateStockMutation.isPending}>{updateStockMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Perbarui'}</Button></div></div></DialogContent></Dialog>
    </div>
  );
}
