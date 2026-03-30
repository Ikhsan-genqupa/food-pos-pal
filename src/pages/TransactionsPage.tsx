import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { transactions, outlets, formatCurrency, formatDate, getTransactionsByOutlet } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Receipt, Eye, Printer, Store } from 'lucide-react';
import { Transaction } from '@/types';
import logo from '@/assets/logo.png';

export default function TransactionsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOutlet, setSelectedOutlet] = useState<string>(
    isAdmin ? 'all' : (user?.outletId || '')
  );
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Get transactions based on role
  const getFilteredTransactions = () => {
    const txList = isAdmin 
      ? getTransactionsByOutlet(selectedOutlet) 
      : getTransactionsByOutlet(user?.outletId || '');
    
    return txList.filter((tx) => {
      const matchesSearch = tx.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  };

  const filteredTransactions = getFilteredTransactions();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Riwayat Transaksi</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? 'Lihat semua transaksi' : `Transaksi ${user?.outletName || 'Outlet'}`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari ID transaksi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {isAdmin && (
          <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
            <SelectTrigger className="w-full sm:w-48">
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
        )}
      </div>

      {/* Current view indicator */}
      {!isAdmin && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Store className="h-4 w-4" />
          <span>Menampilkan transaksi: <span className="font-medium text-foreground">{user?.outletName}</span></span>
        </div>
      )}

      {/* Transactions table */}
      <div className="stat-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">ID</th>
                {isAdmin && (
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Outlet</th>
                )}
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Item</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">Total</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">Tanggal</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => {
                const outlet = outlets.find((o) => o.id === tx.outletId);
                return (
                  <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2.5 px-4 text-xs font-mono">{tx.id}</td>
                    {isAdmin && (
                      <td className="py-2.5 px-4 text-xs">
                        {outlet?.name} - {outlet?.branchNumber}
                      </td>
                    )}
                    <td className="py-2.5 px-4 text-xs">
                      {tx.items.reduce((sum, item) => sum + item.quantity, 0)} item
                    </td>
                    <td className="py-2.5 px-4 text-xs text-right font-medium">
                      {formatCurrency(tx.total)}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-right text-muted-foreground">
                      {formatDate(tx.createdAt)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setSelectedTransaction(tx)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Lihat
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">Tidak ada transaksi</p>
          </div>
        )}
      </div>

      {/* Transaction detail dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Struk Penjualan</DialogTitle>
          </DialogHeader>

          {selectedTransaction && (
            <>
              <div className="receipt-container bg-card border border-border rounded-lg p-4 receipt">
                <div className="text-center mb-4">
                  <img src={logo} alt="Logo" className="h-12 mx-auto mb-2" />
                  <h3 className="font-bold text-sm">GenQuPa POS</h3>
                  <p className="text-[10px] text-muted-foreground">
                    {outlets.find((o) => o.id === selectedTransaction.outletId)?.name} - Cabang{' '}
                    {outlets.find((o) => o.id === selectedTransaction.outletId)?.branchNumber}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {outlets.find((o) => o.id === selectedTransaction.outletId)?.address}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDate(selectedTransaction.createdAt)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    #{selectedTransaction.id}
                  </p>
                </div>

                <div className="border-t border-dashed border-border pt-2 mb-2">
                  {selectedTransaction.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] py-1">
                      <div>
                        <span>{item.productName}</span>
                        <span className="text-muted-foreground ml-1">x{item.quantity}</span>
                      </div>
                      <span>{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-border pt-2 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span>Subtotal</span>
                    <span>{formatCurrency(selectedTransaction.subtotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm">
                    <span>TOTAL</span>
                    <span>{formatCurrency(selectedTransaction.total)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span>Tunai</span>
                    <span>{formatCurrency(selectedTransaction.cashReceived)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span>Kembalian</span>
                    <span>{formatCurrency(selectedTransaction.change)}</span>
                  </div>
                </div>

                <div className="text-center mt-4 text-[10px] text-muted-foreground">
                  <p>Terima kasih atas pembelian Anda!</p>
                  <p>Silakan datang kembali</p>
                </div>
              </div>

              <Button className="w-full no-print" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Cetak Struk
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}