import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      padding: '1.5rem',
    }}>
      {/* Brand Header */}
      <Link to="/dashboard" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '2rem',
        textDecoration: 'none',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          backgroundColor: 'var(--accent-cyan-glow)',
          border: '1px solid var(--accent-cyan)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent-cyan)',
        }}>
          <Shield size={24} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
            Git Security Scanner
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Government Repository Security Platform
          </div>
        </div>
      </Link>

      {/* Auth Card Container */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '2.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }}>
        <Outlet />
      </div>
    </div>
  );
}
