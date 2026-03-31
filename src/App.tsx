import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import POSPage from "@/pages/POSPage";
import ProductsPage from "@/pages/ProductsPage";
import StockPage from "@/pages/StockPage";
import TransactionsPage from "@/pages/TransactionsPage";
import OutletsPage from "@/pages/OutletsPage";
import ReportsPage from "@/pages/ReportsPage";
import UsersPage from "@/pages/UsersPage";
import OnlineOrders from "@/pages/OnlineOrders";
import AdminOnlineOrders from "@/pages/AdminOnlineOrders";
import OrderPage from "@/pages/OrderPage";
import PaymentPage from "@/pages/PaymentPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <CartProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<OrderPage />} />
              <Route path="/order" element={<Navigate to="/" replace />} />
              <Route path="/menu" element={<Navigate to="/" replace />} />
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/pos" element={<POSPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/stock" element={<StockPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/outlets" element={<OutletsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/online-orders" element={<OnlineOrders />} />
                <Route path="/verify-payments" element={<AdminOnlineOrders />} />
                <Route path="/users" element={<UsersPage />} />
              </Route>
              <Route path="/payment/:id" element={<PaymentPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
