import React from 'react';
import { Shield, Bell, Terminal } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <header style={{
      height: '64px',
      borderBottom: '1px solid var(--border-color)',
      backgroundColor: 'var(--bg-secondary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      position: 'sticky',
      top: 0,
      zIndex: 20,
    }}>
      {/* Brand / Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          backgroundColor: 'var(--accent-cyan-glow)',
          border: '1px solid var(--accent-cyan)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent-cyan)',
        }}>
          <Shield size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '0.02em', color: 'var(--text-primary)' }}>
            Git Security Scanner
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Gov Open-Source Integrity Dashboard
          </div>
        </div>
      </div>

      {/* Right Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Tool Engine Status Badges */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem 0.75rem',
          borderRadius: '9999px',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          fontSize: '0.75rem',
          color: 'var(--status-success)',
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'var(--status-success)',
          }} />
          <span>Gitleaks & Trivy Engines Ready</span>
        </div>

        {/* Auth Quick Links */}
        <Link
          to="/login"
          style={{
            padding: '0.4rem 0.85rem',
            fontSize: '0.85rem',
            fontWeight: 500,
            borderRadius: '6px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.borderColor = 'var(--accent-cyan)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
        >
          Sign In
        </Link>
      </div>
    </header>
  );
}
