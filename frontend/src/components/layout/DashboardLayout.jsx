import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function DashboardLayout() {
  const location = useLocation();
  const token = localStorage.getItem('token');

  // Check if authentication token exists
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Validate JWT structure and expiration
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return <Navigate to="/login" replace state={{ from: location }} />;
      }
    } else {
      // Malformed token
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return <Navigate to="/login" replace state={{ from: location }} />;
    }
  } catch {
    // If decoding fails, treat as invalid token
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <main style={{
          flex: 1,
          padding: '2rem',
          backgroundColor: 'var(--bg-primary)',
          overflowY: 'auto',
          minWidth: 0,
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
