import React, { useState } from 'react';
import { Outlet } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, Store, Edit, Trash2, MapPin, User, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useOutlets, useCreateOutlet, useUpdateOutlet, useDeleteOutlet, useToggleOutletActive } from '@/hooks/useOutlets';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export default function OutletsPage() {
  const { data: outlets = [], isLoading } = useOutlets();
  const createOutlet = useCreateOutlet();
  const updateOutlet = useUpdateOutlet();
  const deleteOutlet = useDeleteOutlet();
  const toggleOutletActive = useToggleOutletActive();

  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [outletToDelete, setOutletToDelete] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    branchNumber: '',
    address: '',
    personInCharge: '',
    username: '',
  });

  const filteredOutlets = outlets.filter((outlet) =>
    outlet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    outlet.branchNumber.includes(searchQuery) ||
    outlet.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ name: '', branchNumber: '', address: '', personInCharge: '', username: '' });
    setEditingOutlet(null);
  };

  const handleOpenDialog = (outlet?: Outlet) => {
    if (outlet) {
      setEditingOutlet(outlet);
      setFormData({
        name: outlet.name,
        branchNumber: outlet.branchNumber,
        address: outlet.address,
        personInCharge: outlet.personInCharge,
        username: outlet.username,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.branchNumber || !formData.username || !formData.address || !formData.personInCharge) {
      toast({ title: 'Gagal', description: 'Lengkapi semua field yang wajib diisi', variant: 'destructive' });
      return;
    }
    
    try {
      if (editingOutlet) {
        await updateOutlet.mutateAsync({
          id: editingOutlet.id,
          name: formData.name,
          branchNumber: formData.branchNumber,
          address: formData.address,
          personInCharge: formData.personInCharge,
          username: formData.username,
        });
      } else {
        await createOutlet.mutateAsync({
          name: formData.name,
          branchNumber: formData.branchNumber,
          address: formData.address,
          personInCharge: formData.personInCharge,
          username: formData.username,
        });
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleDelete = async (outletId: string) => {
    try {
      await deleteOutlet.mutateAsync(outletId);
      setOutletToDelete(null);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleToggleStatus = async (outlet: Outlet) => {
    try {
      await toggleOutletActive.mutateAsync({ id: outlet.id, isActive: !outlet.isActive });
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const formatDate = (date: Date) => {
    return format(date, 'dd MMM yyyy', { locale: localeId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Manajemen Outlet</h1>
          <p className="text-sm text-muted-foreground">Kelola cabang outlet usaha Anda</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Outlet
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingOutlet ? 'Edit Outlet' : 'Tambah Outlet Baru'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Outlet *</Label>
                <Input 
                  placeholder="Contoh: Outlet Cabang 1" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nomor Cabang *</Label>
                <Input 
                  placeholder="Contoh: 001, 002" 
                  value={formData.branchNumber}
                  onChange={(e) => setFormData({ ...formData, branchNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Alamat Outlet *</Label>
                <Input 
                  placeholder="Masukkan alamat lengkap outlet" 
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Penanggung Jawab *</Label>
                <Input 
                  placeholder="Nama penanggung jawab outlet" 
                  value={formData.personInCharge}
                  onChange={(e) => setFormData({ ...formData, personInCharge: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Username *</Label>
                <Input 
                  placeholder="Username untuk identifikasi outlet" 
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={createOutlet.isPending || updateOutlet.isPending}
                >
                  {(createOutlet.isPending || updateOutlet.isPending) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    editingOutlet ? 'Simpan Perubahan' : 'Buat Outlet'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari outlet..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Outlets grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredOutlets.map((outlet) => (
          <div key={outlet.id} className="stat-card">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <button
                onClick={() => handleToggleStatus(outlet)}
                disabled={toggleOutletActive.isPending}
                className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                  outlet.isActive
                    ? 'bg-success/10 text-success'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {outlet.isActive ? 'Aktif' : 'Tidak Aktif'}
              </button>
            </div>

            <h3 className="font-semibold text-foreground">{outlet.name}</h3>
            <p className="text-primary text-sm font-medium">Cabang {outlet.branchNumber}</p>

            <div className="mt-3 pt-3 border-t border-border space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{outlet.address}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5 flex-shrink-0" />
                <span>PJ: {outlet.personInCharge}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                <span>Username: {outlet.username}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                <span>Dibuat: {formatDate(outlet.createdAt)}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => handleOpenDialog(outlet)}>
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setOutletToDelete(outlet.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filteredOutlets.length === 0 && (
        <div className="text-center py-12">
          <Store className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">Outlet tidak ditemukan</p>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!outletToDelete} onOpenChange={() => setOutletToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Outlet</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin? Ini akan menghapus outlet, data stok, dan semua transaksinya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => outletToDelete && handleDelete(outletToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteOutlet.isPending}
            >
              {deleteOutlet.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
