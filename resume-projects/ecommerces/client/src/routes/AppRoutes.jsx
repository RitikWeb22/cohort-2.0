import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { HomePage } from '../pages/HomePage.jsx';
import { CatalogPage } from '../pages/CatalogPage.jsx';
import { ProductDetailPage } from '../pages/ProductDetailPage.jsx';
import { CheckoutPage } from '../pages/CheckoutPage.jsx';
import { OrdersPage } from '../pages/OrdersPage.jsx';
import { OrderDetailPage } from '../pages/OrderDetailPage.jsx';
import { VerifyEmailPage } from '../pages/VerifyEmailPage.jsx';
import { AdminPage } from '../pages/AdminPage.jsx';
import { AuthPage } from '../pages/AuthPage.jsx';
import { ResetPasswordPage } from '../pages/ResetPasswordPage.jsx';
import { ProfilePage } from '../pages/ProfilePage.jsx';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import { AdminRoute } from './AdminRoute.jsx';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/products/:slug" element={<ProductDetailPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected Customer & Admin Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
        </Route>

        {/* Protected Admin Routes */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<HomePage />} />
      </Route>
    </Routes>
  );
};
