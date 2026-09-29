import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function DashboardLayout() {
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
