import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useOutlets } from '@/hooks/useOutlets';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { UserPlus, AlertCircle, CheckCircle, Users, Shield, Store, RefreshCw, Trash2, KeyRound, MoreHorizontal, Pencil, Search, Download } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface UserItem {
  id: string;
  email: string;
  username: string;
  role: string;
  outlet_name: string | null;
  outlet_branch: string | null;
  outlet_id: string | null;
  created_at: string;
}

export default function UsersPage() {
  const { isAdmin, session, user } = useAuth();
  const { data: outlets = [] } = useOutlets();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'outlet' | 'kasir' | 'admin'>('outlet');
  const [outletId, setOutletId] = useState('none');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);

  // Delete user state
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset password state
  const [resetTarget, setResetTarget] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Edit user state
  const [editTarget, setEditTarget] = useState<UserItem | null>(null);
  const [editRole, setEditRole] = useState<'outlet' | 'kasir' | 'admin'>('outlet');
  const [editOutletId, setEditOutletId] = useState('none');
  
  // Search and Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const fetchUsers = useCallback(async () => {
    if (!session?.access_token) return;
    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-users', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.users) setUsers(data.users);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin, fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke('create-user', {
        body: { username, password, role, outlet_id: outletId === 'none' ? null : outletId },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (response.error) throw new Error(response.error.message || 'Gagal membuat user');
      if (response.data?.error) throw new Error(response.data.error);

      toast({
        title: 'Berhasil!',
        description: `User "${username}" berhasil dibuat dengan role ${role}`,
      });

      setUsername('');
      setPassword('');
      setRole('outlet');
      setOutletId('none');
      fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget || !session?.access_token) return;
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: deleteTarget.id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Berhasil!', description: `User "${deleteTarget.username}" berhasil dihapus` });
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menghapus user';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget || !session?.access_token || !newPassword) return;
    setIsResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: { user_id: resetTarget.id, new_password: newPassword },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Berhasil!', description: `Password "${resetTarget.username}" berhasil direset` });
      setResetTarget(null);
      setNewPassword('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal reset password';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsResetting(false);
    }
  };

  const openEditDialog = (u: UserItem) => {
    setEditTarget(u);
    setEditRole(u.role as 'outlet' | 'kasir' | 'admin');
    setEditOutletId(u.outlet_id || 'none');
  };

  const handleEditUser = async () => {
    if (!editTarget || !session?.access_token) return;
    setIsEditing(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-user', {
        body: { user_id: editTarget.id, role: editRole, outlet_id: editOutletId === 'none' ? null : editOutletId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Berhasil!', description: `User "${editTarget.username}" berhasil diperbarui` });
      setEditTarget(null);
      fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memperbarui user';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsEditing(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = searchTerm === '' || 
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.outlet_name && u.outlet_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const exportToCSV = () => {
    // Definisi header kolom
    const headers = ['Username', 'Role', 'Nama Outlet', 'Cabang', 'Tanggal Dibuat'];
    
    // Konversi data user ke baris CSV, tangani karakter khusus dengan membungkus dalam tanda kutip
    const csvRows = filteredUsers.map(u => [
      `"${u.username.replace(/"/g, '""')}"`,
      `"${u.role.replace(/"/g, '""')}"`,
      `"${(u.outlet_name || '-').replace(/"/g, '""')}"`,
      `"${(u.outlet_branch || '-').replace(/"/g, '""')}"`,
      `"${new Date(u.created_at).toLocaleDateString('id-ID')}"`
    ].join(','));

    // Gabungkan header dan data
    const csvString = [headers.join(','), ...csvRows].join('\n');
    
    // Buat blob dan trigger download
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `daftar_user_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'Export Berhasil',
      description: 'Daftar user telah diunduh dalam format CSV',
    });
  };

  const roleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-primary/10 text-primary border-primary/20"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
      case 'kasir':
        return <Badge variant="secondary"><Users className="h-3 w-3 mr-1" />Kasir</Badge>;
      default:
        return <Badge variant="outline"><Store className="h-3 w-3 mr-1" />Outlet</Badge>;
    }
  };

  // End of filtered users logic

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-6 w-6" />
              <p>Halaman ini hanya dapat diakses oleh Admin.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manajemen User</h1>
        <p className="text-muted-foreground">Tambah dan kelola akun pengguna sistem</p>
      </div>

      {/* User List */}
      <Card>
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Daftar User ({filteredUsers.length})
              </CardTitle>
              <CardDescription>Semua user yang terdaftar dalam sistem</CardDescription>
            </div>
            <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={isLoadingUsers || filteredUsers.length === 0}>
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={fetchUsers} disabled={isLoadingUsers}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingUsers ? 'animate-spin' : ''}`} />
              Refresh
              </Button>
          </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4 pt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari ID pengguna..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-[200px]">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Role</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="kasir">Kasir</SelectItem>
                  <SelectItem value="outlet">Outlet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingUsers && users.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {users.length === 0 ? 'Belum ada user terdaftar.' : 'Tidak ada user yang cocok dengan filter.'}
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Pengguna</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Outlet</TableHead>
                    <TableHead>Tanggal Dibuat</TableHead>
                    <TableHead className="w-[60px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.username}</TableCell>
                      <TableCell>{roleBadge(u.role)}</TableCell>
                      <TableCell>
                        {u.outlet_name ? (
                          <span>{u.outlet_name} <span className="text-muted-foreground text-xs">({u.outlet_branch})</span></span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell>
                        {u.id !== user?.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(u)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit Role & Outlet
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setResetTarget(u); setNewPassword(''); }}>
                                <KeyRound className="h-4 w-4 mr-2" />
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(u)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Hapus User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Create User Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Tambah User Baru
            </CardTitle>
            <CardDescription>Buat akun baru untuk kasir atau outlet</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="new-username">ID Pengguna</Label>
                <Input id="new-username" type="text" placeholder="Contoh: Kasir1, OutletCabang2" value={username} onChange={(e) => setUsername(e.target.value)} required />
                <p className="text-xs text-muted-foreground">User akan login dengan ID ini (tanpa @email)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Password</Label>
                <Input id="new-password" type="text" placeholder="Minimal 6 karakter" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={(v: 'outlet' | 'kasir' | 'admin') => setRole(v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outlet"><div className="flex items-center gap-2"><Store className="h-4 w-4" />Outlet</div></SelectItem>
                    <SelectItem value="kasir"><div className="flex items-center gap-2"><Users className="h-4 w-4" />Kasir</div></SelectItem>
                    <SelectItem value="admin"><div className="flex items-center gap-2"><Shield className="h-4 w-4" />Admin</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="outlet">Outlet (Opsional)</Label>
                <Select value={outletId || "none"} onValueChange={(v) => setOutletId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih outlet" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tidak ada</SelectItem>
                    {outlets.map((outlet) => (
                      <SelectItem key={outlet.id} value={outlet.id}>{outlet.name} - {outlet.branchNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Hubungkan user dengan outlet tertentu</p>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <div className="h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><UserPlus className="h-4 w-4 mr-2" />Buat User</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader><CardTitle>Informasi Role</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Admin</p>
                <p className="text-sm text-muted-foreground">Akses penuh ke semua fitur: kelola produk, outlet, user, dan laporan semua cabang.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <Users className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Kasir</p>
                <p className="text-sm text-muted-foreground">Akses ke POS untuk transaksi dan melihat laporan outlet sendiri.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <Store className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Outlet</p>
                <p className="text-sm text-muted-foreground">Role default. Akses terbatas ke dashboard dan stok outlet sendiri.</p>
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                User baru langsung aktif tanpa verifikasi email
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus User</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus user <strong>"{deleteTarget?.username}"</strong>? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <div className="h-4 w-4 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin" /> : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) { setResetTarget(null); setNewPassword(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Masukkan password baru untuk user <strong>"{resetTarget?.username}"</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="reset-password">Password Baru</Label>
            <Input
              id="reset-password"
              type="text"
              placeholder="Minimal 6 karakter"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetTarget(null); setNewPassword(''); }} disabled={isResetting}>Batal</Button>
            <Button onClick={handleResetPassword} disabled={isResetting || newPassword.length < 6}>
              {isResetting ? <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Ubah role dan outlet untuk user <strong>"{editTarget?.username}"</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={(v: 'outlet' | 'kasir' | 'admin') => setEditRole(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="outlet"><div className="flex items-center gap-2"><Store className="h-4 w-4" />Outlet</div></SelectItem>
                  <SelectItem value="kasir"><div className="flex items-center gap-2"><Users className="h-4 w-4" />Kasir</div></SelectItem>
                  <SelectItem value="admin"><div className="flex items-center gap-2"><Shield className="h-4 w-4" />Admin</div></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Outlet</Label>
              <Select value={editOutletId || "none"} onValueChange={(v) => setEditOutletId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Pilih outlet" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak ada</SelectItem>
                  {outlets.map((outlet) => (
                    <SelectItem key={outlet.id} value={outlet.id}>{outlet.name} - {outlet.branchNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={isEditing}>Batal</Button>
            <Button onClick={handleEditUser} disabled={isEditing}>
              {isEditing ? <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}