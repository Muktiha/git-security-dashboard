import React from 'react';
import { GitBranch, Plus, Search, RefreshCw, ExternalLink, ShieldCheck, ShieldAlert } from 'lucide-react';

const mockRepos = [
  {
    id: '1',
    name: 'gov-portal/citizen-auth',
    url: 'https://github.com/gov-portal/citizen-auth.git',
    branch: 'main',
    lastScan: '25 minutes ago',
    status: 'vulnerable',
    secretsFound: 2,
    cvesFound: 5,
  },
  {
    id: '2',
    name: 'digital-infra/api-gateway',
    url: 'https://github.com/digital-infra/api-gateway.git',
    branch: 'develop',
    lastScan: '1 hour ago',
    status: 'clean',
    secretsFound: 0,
    cvesFound: 0,
  },
  {
    id: '3',
    name: 'transport-sys/fleet-tracker',
    url: 'https://github.com/transport-sys/fleet-tracker.git',
    branch: 'main',
    lastScan: '4 hours ago',
    status: 'vulnerable',
    secretsFound: 1,
    cvesFound: 2,
  },
];

export default function Repositories() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Tracked Repositories
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Manage Git repositories configured for automated Gitleaks & Trivy security auditing.
          </p>
        </div>

        <button
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
          <Plus size={16} />
          <span>Add Repository</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.65rem 1rem',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
      }}>
        <Search size={18} color="var(--text-muted)" />
        <input
          type="text"
          placeholder="Search repositories by name, URL, or branch..."
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            width: '100%',
            outline: 'none',
          }}
        />
      </div>

      {/* Repositories Table */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              <th style={{ padding: '0.85rem 1.25rem' }}>Repository</th>
              <th style={{ padding: '0.85rem 1.25rem' }}>Branch</th>
              <th style={{ padding: '0.85rem 1.25rem' }}>Security Posture</th>
              <th style={{ padding: '0.85rem 1.25rem' }}>Last Scanned</th>
              <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockRepos.map((repo) => (
              <tr
                key={repo.id}
                style={{
                  borderBottom: '1px solid var(--border-color)',
                  fontSize: '0.875rem',
                }}
              >
                <td style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{repo.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem' }}>
                    <span>{repo.url}</span>
                    <ExternalLink size={12} />
                  </div>
                </td>
                <td style={{ padding: '1rem 1.25rem' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                  }}>
                    <GitBranch size={12} />
                    {repo.branch}
                  </span>
                </td>
                <td style={{ padding: '1rem 1.25rem' }}>
                  {repo.status === 'clean' ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      color: 'var(--status-success)',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                    }}>
                      <ShieldCheck size={16} /> Clean
                    </span>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(236, 72, 153, 0.15)',
                        color: 'var(--severity-secret)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}>
                        {repo.secretsFound} Secrets
                      </span>
                      <span style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        color: 'var(--severity-critical)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}>
                        {repo.cvesFound} Vulnerabilities
                      </span>
                    </div>
                  )}
                </td>
                <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  {repo.lastScan}
                </td>
                <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                  <button
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--accent-cyan)';
                      e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-secondary)';
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }}
                  >
                    <RefreshCw size={12} />
                    <span>Trigger Scan</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
