import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import DashboardLayout from './components/layout/DashboardLayout';
import AuthLayout from './components/layout/AuthLayout';

// Route-level code-splitting: Lazy-load pages on demand
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Repositories = lazy(() => import('./pages/Repositories'));
const Findings = lazy(() => import('./pages/Findings'));
const Analytics = lazy(() => import('./pages/Analytics'));
const ScanHistory = lazy(() => import('./pages/ScanHistory'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Settings = lazy(() => import('./pages/Settings'));

// Sleek loading skeleton for route transitions
const PageSuspenseFallback = () => (
  <div style={{
    minHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.85rem',
    color: 'var(--text-muted)',
  }}>
    <div style={{
      width: '32px',
      height: '32px',
      border: '3px solid var(--border-color)',
      borderTopColor: 'var(--accent-cyan)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
    <span style={{ fontSize: '0.8rem', fontWeight: 500, letterSpacing: '0.02em' }}>
      Loading security module...
    </span>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSuspenseFallback />}>
        <Routes>
          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ForgotPassword />} />
          </Route>

          {/* Dashboard Operations Routes */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/repositories" element={<Repositories />} />
            <Route path="/scans" element={<Repositories />} />
            <Route path="/findings" element={<Findings />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/scan-history" element={<ScanHistory />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Fallbacks */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
