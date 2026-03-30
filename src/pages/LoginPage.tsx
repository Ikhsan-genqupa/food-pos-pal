import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

const INTERNAL_DOMAIN = '@genqupa.internal';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Convert username to internal email format
    const email = username.toLowerCase().replace(/\s+/g, '') + INTERNAL_DOMAIN;

    const result = await login(email, password);

    if (result.success) {
      toast({
        title: 'Selamat Datang!',
        description: 'Login berhasil',
      });
      navigate('/dashboard');
    } else {
      setError(result.error || 'ID atau kata sandi salah');
    }

    setIsLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={logo} alt="GenQuPa" className="h-24 w-24 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">GenQuPa POS</h1>
          <p className="text-muted-foreground text-sm">Sistem Manajemen Penjualan Multi-Outlet</p>
        </div>

        <div className="bg-card rounded-xl shadow-sm p-8 border border-border">
          <h2 className="text-xl font-semibold text-center mb-6">Masuk ke Sistem</h2>
          
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">ID Pengguna</Label>
              <Input
                id="username"
                type="text"
                placeholder="Contoh: AdminOutlet"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
              <p className="text-xs text-muted-foreground">
                Masukkan ID tanpa @email
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Masuk
                </>
              )}
            </Button>
          </form>

          {/* Info */}
          <div className="mt-6 p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              Sistem tertutup. Hubungi admin untuk mendapatkan akun.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
