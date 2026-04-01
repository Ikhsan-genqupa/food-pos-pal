import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import logo from '@/assets/logo.png';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Store,
  History,
  BarChart3,
  LogOut,
  X,
  Users,
  ShoppingBag,
  ShieldCheck,
  ChefHat,
  CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { pendingVerificationCount } = useNotifications();

  const adminLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/verify-payments', icon: ShieldCheck, label: 'Verifikasi Pembayaran' },
    { to: '/online-orders', icon: ShoppingBag, label: 'Pesanan Online' },
    { to: '/outlets', icon: Store, label: 'Manajemen Outlet' },
    { to: '/users', icon: Users, label: 'Manajemen User' },
    { to: '/products', icon: Package, label: 'Produk' },
    { to: '/stock', icon: Package, label: 'Stok' },
    { to: '/transactions', icon: History, label: 'Transaksi' },
    { to: '/reports', icon: BarChart3, label: 'Laporan' },
    { to: '/payment-settings', icon: CreditCard, label: 'Pengaturan Pembayaran' },
  ];

  const outletLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/stock', icon: Package, label: 'Stok' },
  ];
  
  const kitchenLinks = [
    { to: '/kitchen', icon: ChefHat, label: 'Dapur' },
  ];

  const cashierLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/pos', icon: ShoppingCart, label: 'Penjualan' },
    { to: '/online-orders', icon: ShoppingBag, label: 'Pesanan Online' },
    { to: '/transactions', icon: History, label: 'Transaksi' },
  ];

  const getLinks = () => {
    switch (user?.role) {
      case 'admin': return adminLinks;
      case 'kasir': return cashierLinks;
      case 'outlet': return outletLinks;
      case 'kitchen': return kitchenLinks;
      default: return [];
    }
  };

  const links = getLinks();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-56 bg-sidebar transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <img src={logo} alt="GenQuPa" className="h-8 w-8 object-contain brightness-0 invert" />
              <div>
                <h1 className="text-sm font-bold text-sidebar-foreground">GenQuPa</h1>
                <p className="text-[10px] text-sidebar-foreground/60">Sistem POS</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-sidebar-foreground h-8 w-8"
              onClick={onToggle}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-sidebar-border">
            <p className="font-medium text-sm text-sidebar-foreground truncate">{user?.email}</p>
            <p className="text-[11px] text-sidebar-foreground/60 capitalize">
              {isAdmin ? 'Administrator' : user?.outletName ? `${user.outletName}` : user?.role}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn('nav-link text-sm', isActive && 'nav-link-active')
                }
                onClick={() => window.innerWidth < 1024 && onToggle()}
              >
                <link.icon className="h-4 w-4" />
                <span className="flex-1">{link.label}</span>
                {link.to === '/verify-payments' && pendingVerificationCount > 0 && (
                  <span className="flex items-center justify-center bg-red-600 text-white text-[10px] font-bold h-5 min-w-5 px-1.5 rounded-full animate-pulse shadow-md shadow-red-200">
                    {pendingVerificationCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-3 border-t border-sidebar-border">
            <button
              onClick={async () => {
                await logout();
                navigate('/', { replace: true });
              }}
              className="nav-link w-full text-sm text-sidebar-foreground/70 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
