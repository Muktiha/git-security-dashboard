import React from 'react';
import { 
  GitBranch, 
  KeyRound, 
  ShieldAlert, 
  CheckCircle2, 
  Play, 
  AlertTriangle 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const stats = [
  { label: 'Tracked Repositories', value: '12', change: '+3 this week', icon: GitBranch, color: 'var(--accent-cyan)' },
  { label: 'Exposed Secrets (Gitleaks)', value: '4', change: '2 unreviewed', icon: KeyRound, color: 'var(--severity-secret)' },
  { label: 'Critical CVEs (Trivy)', value: '7', change: 'Immediate fix needed', icon: ShieldAlert, color: 'var(--severity-critical)' },
  { label: 'Security Health Score', value: '88%', change: 'Moderate posture', icon: CheckCircle2, color: 'var(--status-success)' },
];

export default function Dashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Security Posture Overview
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Continuous secret leak detection and vulnerability posture for open-source repositories.
          </p>
        </div>

        <Link
          to="/repositories"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            backgroundColor: 'var(--accent-cyan)',
            color: '#ffffff',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.875rem',
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <Play size={16} />
          <span>New Repository Scan</span>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '1.25rem',
      }}>
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {item.label}
                </span>
                <span style={{ color: item.color }}>
                  <Icon size={20} />
                </span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {item.value}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {item.change}
              </div>
            </div>
          );
        })}
      </div>

      {/* Security Engines Status & Recent Activity Placeholder */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.5rem',
      }}>
        {/* Scanner Integrations Status */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
            Integrated Security Engines
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Gitleaks Engine</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Git commit history & regex secret scanner</div>
              </div>
              <span style={{
                padding: '0.25rem 0.6rem',
                borderRadius: '9999px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--status-success)',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}>
                Ready
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Trivy Scanner</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dependency & repository vulnerability analyzer</div>
              </div>
              <span style={{
                padding: '0.25rem 0.6rem',
                borderRadius: '9999px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--status-success)',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}>
                Ready
              </span>
            </div>
          </div>
        </div>

        {/* Recent Scan History Placeholder */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
            Recent Scan Activity
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{
              padding: '0.85rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>gov-portal/citizen-auth</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Scanned 25 mins ago • Branch: main</div>
              </div>
              <span style={{
                fontSize: '0.75rem',
                color: 'var(--severity-critical)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}>
                <AlertTriangle size={14} /> 2 Critical
              </span>
            </div>

            <div style={{
              padding: '0.85rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>digital-infra/api-gateway</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Scanned 1 hour ago • Branch: develop</div>
              </div>
              <span style={{
                fontSize: '0.75rem',
                color: 'var(--status-success)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}>
                <CheckCircle2 size={14} /> Clean
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
