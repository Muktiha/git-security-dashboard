import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  KeyRound, 
  ShieldAlert, 
  CheckCircle2, 
  Play, 
  AlertTriangle,
  RefreshCw,
  ChevronRight 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return 'recently';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return d.toLocaleDateString();
  } catch {
    return 'recently';
  }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    stats: {
      trackedRepositories: 0,
      scannedRepositories: 0,
      exposedSecrets: 0,
      criticalCVEs: 0,
      totalFindings: 0,
      healthScore: '100%',
      healthLabel: 'Loading...',
    },
    recentScans: [],
  });
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');

  const fetchDashboardStats = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/scans/dashboard/stats');
      if (response.data && response.data.success) {
        setDashboardData({
          stats: response.data.stats || {},
          recentScans: response.data.recentScans || [],
        });
      }
    } catch (error) {
      console.error('[Dashboard Error]', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const statsCards = [
    { 
      label: 'Tracked Repositories', 
      value: loading ? '-' : String(dashboardData.stats.trackedRepositories ?? 0), 
      change: `${dashboardData.stats.scannedRepositories ?? 0} scanned`, 
      icon: GitBranch, 
      color: 'var(--accent-cyan)' 
    },
    { 
      label: 'Exposed Secrets (Gitleaks)', 
      value: loading ? '-' : String(dashboardData.stats.exposedSecrets ?? 0), 
      change: (dashboardData.stats.exposedSecrets ?? 0) === 0 ? '0 unreviewed leaks' : `${dashboardData.stats.exposedSecrets} unreviewed`, 
      icon: KeyRound, 
      color: 'var(--severity-secret)' 
    },
    { 
      label: 'Critical CVEs (Trivy)', 
      value: loading ? '-' : String(dashboardData.stats.criticalCVEs ?? 0), 
      change: (dashboardData.stats.criticalCVEs ?? 0) === 0 ? 'No critical vulnerabilities' : 'Immediate fix needed', 
      icon: ShieldAlert, 
      color: 'var(--severity-critical)' 
    },
    { 
      label: 'Security Health Score', 
      value: loading ? '-' : (dashboardData.stats.healthScore || '100%'), 
      change: dashboardData.stats.healthLabel || 'Clean posture', 
      icon: CheckCircle2, 
      color: 'var(--status-success)' 
    },
  ];

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
        {statsCards.map((item) => {
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

      {/* Security Engines Status & Recent Activity */}
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

        {/* Real Recent Scan History */}
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
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '0.8rem' }}>Loading recent scan activity...</div>
              </div>
            ) : dashboardData.recentScans && dashboardData.recentScans.length > 0 ? (
              dashboardData.recentScans.map((scan) => {
                const targetScanId = scan.scanId || scan.id;
                const targetRepoId = scan.repositoryId;
                const findingsUrl = `/findings?scanId=${targetScanId}${targetRepoId ? `&repoId=${targetRepoId}` : ''}`;

                return (
                  <div
                    key={targetScanId}
                    onClick={() => navigate(findingsUrl)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(findingsUrl);
                      }
                    }}
                    title={`Click to view security findings for ${scan.repo} (${scan.status})`}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                      e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                        {scan.repo}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Scanned {formatTimeAgo(scan.completedAt)} • Branch: {scan.branch}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        color: scan.status === 'FAILED'
                          ? 'var(--severity-critical)'
                          : scan.criticalCount > 0 
                          ? 'var(--severity-critical)' 
                          : scan.totalFindings > 0 
                          ? 'var(--severity-high)' 
                          : 'var(--status-success)',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}>
                        {scan.status === 'FAILED' ? (
                          <>
                            <AlertTriangle size={14} /> Scan Failed
                          </>
                        ) : scan.criticalCount > 0 ? (
                          <>
                            <AlertTriangle size={14} /> {scan.criticalCount} Critical
                          </>
                        ) : scan.totalFindings > 0 ? (
                          <>
                            <AlertTriangle size={14} /> {scan.totalFindings} Findings
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={14} /> Clean
                          </>
                        )}
                      </span>
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{
                padding: '2rem 1rem',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                border: '1px dashed var(--border-color)',
                borderRadius: '8px',
              }}>
                No recent scan activity. Navigate to Repositories to trigger your first scan.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
