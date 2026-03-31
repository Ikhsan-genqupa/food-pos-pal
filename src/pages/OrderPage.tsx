import React, { useState } from 'react';
import { useActiveProducts } from '@/hooks/useProducts';
import { Link, useNavigate } from 'react-router-dom';
import { useCategories } from '@/hooks/useCategories';
import { useActiveOutlets } from '@/hooks/useOutlets';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  ShoppingBag, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  UtensilsCrossed,
  User,
  Phone,
  ImagePlus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function OrderPage() {
  const { data: products = [], isLoading: productsLoading } = useActiveProducts();
  const { data: categories = [] } = useCategories();
  const { data: outlets = [] } = useActiveOutlets();
  const { items, addItem, removeItem, total, clearCart, itemCount } = useCart();
  const createTransaction = useCreateTransaction();
  const { toast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const navigate = useNavigate();

  const filteredProducts = products.filter((product) => {
    const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      toast({ title: "Keranjang Kosong", description: "Pilih menu terlebih dahulu", variant: "destructive" });
      return;
    }

    if (!selectedOutlet) {
      toast({ title: "Pilih Outlet", description: "Silakan pilih outlet pengambilan", variant: "destructive" });
      return;
    }

    try {
      // Create Transaction
      const today = new Date();
      const [hours, minutes] = pickupTime.split(':');
      const pickupDate = new Date(today.setHours(parseInt(hours), parseInt(minutes), 0, 0));

      const transaction = await createTransaction.mutateAsync({
        outletId: selectedOutlet,
        items: items.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          total: item.product.price * item.quantity
        })),
        subtotal: total,
        total: total,
        paymentMethod: 'transfer',
        cashReceived: 0,
        change: 0,
        orderType: 'bopis',
        customerName: customerName,
        customerPhone: customerPhone,
        pickupTime: pickupDate,
        status: 'awaiting_payment',
      });

      clearCart();
      setCheckoutOpen(false);
      navigate(`/payment/${transaction.id}`);
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  };

  if (productsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30">
        <UtensilsCrossed className="h-12 w-12 text-primary animate-bounce mb-4" />
        <p className="font-medium text-muted-foreground animate-pulse">Menyiapkan Menu Lezat...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10 pb-24">
      {/* Hero / Header */}
      <div className="bg-primary text-primary-foreground py-10 px-4 sm:px-6 lg:px-12 text-center sm:text-left transition-all">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-8">
          <div className="animate-fade-in translate-y-0 opacity-100">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">GenQuPa Food Pal</h1>
            <p className="mt-2 text-primary-foreground/80 text-lg sm:text-xl">Pesan Online, Ambil di Toko. Praktis & Cepat.</p>
          </div>
          <div className="flex items-center gap-4 bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20 shadow-2xl">
             <div className="bg-white text-primary rounded-xl p-3 shadow-inner">
                <ShoppingBag className="h-7 w-7" />
             </div>
             <div className="pr-6">
                <p className="text-[10px] uppercase font-black tracking-[0.2em] opacity-60">Total Pesanan</p>
                <p className="text-2xl font-black font-mono">Rp{total.toLocaleString()}</p>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 sm:-mt-10">
        <div className="bg-card rounded-3xl shadow-2xl border border-border/40 p-4 sm:p-8 mb-10 backdrop-blur supports-[backdrop-filter]:bg-background/90">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="relative flex-[1.5]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Mau makan apa hari ini? Cari di sini..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-lg rounded-2xl border-none bg-muted/50 focus-visible:ring-primary/20 shadow-inner"
              />
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              <Button
                variant={selectedCategory === null ? 'default' : 'secondary'}
                onClick={() => setSelectedCategory(null)}
                className="rounded-2xl h-14 px-8 font-black text-sm uppercase tracking-widest shadow-lg transition-all"
              >
                Semua
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'secondary'}
                  onClick={() => setSelectedCategory(category.id)}
                  className="rounded-2xl h-14 px-8 font-black text-sm uppercase tracking-widest shadow-lg whitespace-nowrap transition-all"
                >
                  <span className="mr-3 text-2xl">{category.icon}</span>
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden group border-none bg-card/60 backdrop-blur-sm hover:bg-card transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col rounded-[2rem]">
              <div className="aspect-[4/3] overflow-hidden relative">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                />
                <div className="absolute top-4 right-4 animate-in slide-in-from-top-4 duration-500">
                  <span className="bg-primary/90 backdrop-blur-lg text-white font-black px-4 py-2 rounded-2xl text-sm shadow-xl border border-white/20">
                    Rp{product.price.toLocaleString()}
                  </span>
                </div>
              </div>
              <CardHeader className="flex-1 pb-2 pt-6 px-6 text-center sm:text-left">
                <CardTitle className="text-xl font-black group-hover:text-primary transition-colors tracking-tight">{product.name}</CardTitle>
                <CardDescription className="line-clamp-2 mt-2 leading-relaxed text-sm">Lezat, nikmat, dan disiapkan khusus untuk pengalaman terbaik Anda.</CardDescription>
              </CardHeader>
              <CardFooter className="pt-2 pb-8 px-6">
                <Button 
                  className="w-full rounded-[1.2rem] h-12 gap-3 font-black uppercase tracking-tighter group-hover:scale-[1.03] active:scale-95 transition-all shadow-lg shadow-primary/20"
                  onClick={() => {
                    addItem(product);
                    toast({ title: "Mantap!", description: `${product.name} masuk keranjang` });
                  }}
                >
                  <Plus className="h-5 w-5" /> Masukkan Keranjang
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-32 bg-card/40 rounded-[3rem] border-4 border-dashed border-border/20 mt-12 animate-in fade-in zoom-in duration-500">
             <UtensilsCrossed className="h-20 w-20 text-muted-foreground/10 mx-auto mb-6" />
             <h3 className="text-3xl font-black text-muted-foreground/40">Yah, Menu Enggak Ketemu...</h3>
             <p className="text-muted-foreground/50 mt-3 text-lg font-medium">Coba cari dengan kata kunci lain ya, pasti ada yang cocok!</p>
          </div>
        )}
      </div>

      {/* Persistent Cart Bar (Mobile/Sticky) */}
      <div className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl px-6 py-5 bg-primary/95 backdrop-blur-2xl rounded-3xl border border-white/20 z-50 transition-all duration-500 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)]",
        itemCount > 0 ? "translate-y-0 opacity-100 scale-100" : "translate-y-32 opacity-0 scale-95 pointer-events-none"
      )}>
        <div className="flex items-center justify-between gap-6">
           <div className="flex-1 hidden sm:flex flex-col">
              <p className="text-[10px] font-black text-primary-foreground/50 uppercase tracking-[0.3em]">Isi Keranjang ({itemCount})</p>
              <p className="text-2xl font-black text-white font-mono tracking-tighter">Rp{total.toLocaleString()}</p>
           </div>
           <Button 
            size="lg" 
            className="w-full sm:w-auto px-12 h-14 rounded-[1.2rem] text-lg font-black gap-4 bg-white text-primary hover:bg-white/90 active:scale-95 transition-all group shadow-2xl"
            onClick={() => setCheckoutOpen(true)}
           >
             Pesan Sekarang <ChevronRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
           </Button>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto rounded-[2.5rem] border-none shadow-2xl p-0">
          <div className="bg-primary p-8 text-primary-foreground relative overflow-hidden">
            <div className="relative z-10">
              <DialogTitle className="text-3xl font-black flex items-center gap-3 tracking-tight">
                <ShoppingBag className="h-8 w-8" /> Selesaikan Pesanan
              </DialogTitle>
              <DialogDescription className="text-primary-foreground/70 mt-2 font-medium">
                Satu langkah lagi untuk menikmati menu favorit Anda!
              </DialogDescription>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-10 translate-x-10 blur-2xl"></div>
          </div>

          <form onSubmit={handleCheckout} className="p-8 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                  <User className="h-3 w-3 text-primary" /> Nama Lengkap
                </Label>
                <Input 
                  id="name" 
                  placeholder="Nama pemesan" 
                  required 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="rounded-2xl h-14 bg-muted/50 border-none shadow-inner text-base font-medium px-5"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="phone" className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                  <Phone className="h-3 w-3 text-primary" /> Nomor WA / HP
                </Label>
                <Input 
                  id="phone" 
                  placeholder="0812xxxxxx" 
                  type="tel" 
                  required 
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="rounded-2xl h-14 bg-muted/50 border-none shadow-inner text-base font-medium px-5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="outlet" className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                  <MapPin className="h-3 w-3 text-primary" /> Outlet Ambil
                </Label>
                <Select required onValueChange={setSelectedOutlet} value={selectedOutlet}>
                  <SelectTrigger className="rounded-2xl h-14 bg-muted/50 border-none shadow-inner px-5 font-medium">
                    <SelectValue placeholder="Pilih Outlet Pengambilan" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    {outlets.map(outlet => (
                      <SelectItem key={outlet.id} value={outlet.id} className="rounded-xl py-3 px-4 focus:bg-primary/5 font-medium">
                        {outlet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="time" className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                  <Clock className="h-3 w-3 text-primary" /> Jam Pengambilan
                </Label>
                <Input 
                  id="time" 
                  type="time" 
                  required 
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  className="rounded-2xl h-14 bg-muted/50 border-none shadow-inner px-5 font-medium"
                />
              </div>
            </div>


            <div className="bg-muted/30 rounded-[2rem] p-6 border-2 border-dashed border-border/50">
               <div className="flex justify-between items-center mb-6">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Isi Keranjang</p>
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase">{itemCount} items</span>
               </div>
               <div className="space-y-4 max-h-[160px] overflow-y-auto mb-6 pr-2 scrollbar-thin">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm group">
                      <div className="flex items-center gap-3">
                         <div className="bg-primary/10 text-primary w-8 h-8 rounded-lg flex items-center justify-center font-black">{item.quantity}</div>
                         <span className="font-bold truncate max-w-[120px] sm:max-w-[200px]">{item.product.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                         <span className="font-bold font-mono">Rp{(item.product.price * item.quantity).toLocaleString()}</span>
                         <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-xl"
                          onClick={() => removeItem(item.product.id)}
                         >
                            <Trash2 className="h-4 w-4" />
                         </Button>
                      </div>
                    </div>
                  ))}
               </div>
               <div className="flex justify-between items-center pt-6 border-t-2 border-border/50">
                  <span className="font-black text-xl uppercase tracking-tighter">Total Akhir</span>
                  <span className="font-black text-3xl text-primary font-mono tracking-tighter">Rp{total.toLocaleString()}</span>
               </div>
               <div className="mt-6 flex items-center gap-3 bg-primary/5 p-4 rounded-2xl border border-primary/10">
                  <div className="bg-primary p-2 rounded-lg">
                    <UtensilsCrossed className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-[10px] text-primary/70 font-bold leading-relaxed">
                    Pembayaran wajib dilakukan via transfer bank di halaman selanjutnya. Pesanan baru akan diproses oleh Kasir setelah bukti transfer diverifikasi oleh Admin.
                  </p>
               </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setCheckoutOpen(false)} className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-muted-foreground hover:bg-muted">
                Kembali
              </Button>
              <Button type="submit" disabled={createTransaction.isPending} className="flex-1 rounded-2xl h-14 font-black uppercase tracking-[0.2em] text-lg shadow-2xl shadow-primary/30 active:scale-95 transition-all">
                {createTransaction.isPending ? "Mengirim..." : "Pesan Sekarang"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>


      {/* Footer / Staff Login */}
      <footer className="mt-20 py-10 border-t border-border/40 text-center">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.2em] mb-2">
          © {new Date().getFullYear()} GenQuPa Food Pal. All rights reserved.
        </p>
        <Link to="/login" className="text-[10px] text-muted-foreground/30 hover:text-primary transition-colors font-bold uppercase tracking-widest">
          Staff Login
        </Link>
      </footer>
    </div>
  );
}
