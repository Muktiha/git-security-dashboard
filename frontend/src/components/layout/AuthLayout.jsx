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
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative Ambient Gradient Orbs */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '20%',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, rgba(124, 58, 237, 0.05) 70%, transparent 100%)',
        filter: 'blur(50px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '20%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, rgba(37, 99, 235, 0.05) 70%, transparent 100%)',
        filter: 'blur(50px)',
        pointerEvents: 'none',
      }} />

      {/* Brand Header */}
      <Link to="/dashboard" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '2rem',
        textDecoration: 'none',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'var(--gradient-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          boxShadow: '0 6px 18px -2px rgba(37, 99, 235, 0.35)',
        }}>
          <Shield size={24} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Git Security Scanner
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Government Repository Security Platform
          </div>
        </div>
      </Link>

      {/* Auth Card Container */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '2.5rem',
        boxShadow: '0 20px 40px -15px rgba(37, 99, 235, 0.1), 0 0 0 1px rgba(229, 234, 245, 0.8)',
        position: 'relative',
        zIndex: 1,
      }}>
        <Outlet />
      </div>
    </div>
  );
}
