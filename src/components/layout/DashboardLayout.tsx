import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationListener } from '../notifications/NotificationListener';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { FloatingOrderAlert } from '../notifications/FloatingOrderAlert';
import { SoundToggleButton } from '../notifications/SoundToggleButton';

export default function DashboardLayout() {
  const { isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-background">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        
        {/* Main content */}
        <div className="lg:pl-64">
          {/* Mobile header */}
          <header className="lg:hidden sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
            <div className="flex items-center justify-between p-4 h-16">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-6 w-6" />
                </Button>
                <h1 className="font-semibold text-foreground">GenQuPa POS</h1>
              </div>
              <SoundToggleButton />
            </div>
          </header>

          {/* Desktop Top Header */}
          <header className="hidden lg:flex sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border h-16 items-center px-6 justify-between">
             <h1 className="text-sm font-medium text-muted-foreground">Dashboard</h1>
             <div className="flex items-center gap-4">
               <SoundToggleButton />
             </div>
          </header>

          {/* Page content */}
          <main className="p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
        <NotificationListener />
        <FloatingOrderAlert />
      </div>
    </NotificationProvider>
  );
}
