import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  ShieldCheck, 
  ShieldAlert, 
  KeyRound, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  TrendingUp, 
  FolderGit2, 
  Activity, 
  Info,
  Calendar
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  const fetchAnalytics = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/scans/analytics');
      if (res.data && res.data.success) {
        setAnalytics(res.data.analytics);
      }
    } catch (err) {
      console.error('[Analytics Fetch Error]', err);
      setError(err.response?.data?.message || 'Failed to retrieve security analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '4rem',
        textAlign: 'center',
        color: 'var(--text-secondary)',
      }}>
        <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.75rem' }} />
        <div>Aggregating real-time security analytics from database...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '1.5rem',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '8px',
        color: 'var(--severity-critical)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}>
        <AlertTriangle size={20} />
        <div>{error}</div>
      </div>
    );
  }

  const hasScans = analytics && analytics.totalScans > 0;
  const hasFindings = analytics && analytics.totalFindings > 0;

  // Custom Dark Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '0.5rem 0.75rem',
          fontSize: '0.75rem',
          color: '#f8fafc',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        }}>
          <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{label || payload[0]?.name}</p>
          {payload.map((item, idx) => (
            <p key={idx} style={{ color: item.color || '#38bdf8', margin: '0.15rem 0' }}>
              {item.name}: <strong>{item.value}</strong>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <BarChart3 size={24} color="var(--accent-cyan)" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Security Posture Analytics
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Real-time vulnerability telemetry, lifecycle resolution velocity, and severity distribution across government open-source repositories.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          title="Refresh analytics metrics"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={15} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Top Telemetry Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
      }}>
        {/* Security Health Score */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Security Health Score</span>
            <ShieldCheck size={18} color="var(--accent-cyan)" />
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {analytics?.globalScore ?? 100}%
            </span>
            <span style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              padding: '0.15rem 0.5rem',
              borderRadius: '4px',
              backgroundColor: (analytics?.globalScore ?? 100) >= 90 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: (analytics?.globalScore ?? 100) >= 90 ? 'var(--status-success)' : 'var(--severity-critical)',
            }}>
              Grade {analytics?.globalGrade || 'A'}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            {analytics?.globalRiskLevel || 'Clean Posture'}
          </div>
        </div>

        {/* Resolution Rate */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Resolution Rate</span>
            <CheckCircle2 size={18} color="var(--status-success)" />
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-success)' }}>
              {analytics?.resolutionRate || '100%'}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            {analytics?.resolvedFindings ?? 0} of {analytics?.totalFindings ?? 0} findings resolved
          </div>
        </div>

        {/* Repositories Scanned */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tracked Repositories</span>
            <FolderGit2 size={18} color="var(--accent-cyan)" />
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {analytics?.totalRepositories ?? 0}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            {analytics?.scannedRepositories ?? 0} actively scanned with security tools
          </div>
        </div>

        {/* Total Scans Executed */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Scans Logged</span>
            <Activity size={18} color="#f59e0b" />
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {analytics?.totalScans ?? 0}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Gitleaks secrets & Trivy vulnerability scans
          </div>
        </div>
      </div>

      {/* Internal Heuristic Score Notice */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '0.75rem 1rem',
        backgroundColor: 'rgba(14, 165, 233, 0.08)',
        border: '1px solid rgba(14, 165, 233, 0.25)',
        borderRadius: '8px',
        fontSize: '0.78rem',
        color: 'var(--text-secondary)',
      }}>
        <Info size={16} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
        <div>
          <strong>Documented Scoring Heuristic: </strong>
          Score (0-100) = <code>100 - (Critical×25 + High×15 + Medium×5 + Low×2 + AcceptedRisk×1)</code>. Resolved vulnerabilities incur zero deduction.
          <em> Notice: This metric serves as an internal operational indicator for review boards and is not a formal ISO/NIST certification.</em>
        </div>
      </div>

      {!hasScans ? (
        /* Empty State */
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '4rem 2rem',
          textAlign: 'center',
        }}>
          <TrendingUp size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            No scan telemetry available yet
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
            Run an automated security scan on your tracked repositories to generate real-time severity distributions, lifecycle tracking, and historical trends.
          </p>
          <Link
            to="/repositories"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              backgroundColor: 'var(--accent-cyan)',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.875rem',
              textDecoration: 'none',
            }}
          >
            <span>Go to Repositories & Run Scan</span>
          </Link>
        </div>
      ) : (
        /* Charts Grid */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Row 1: Severity Distribution & Lifecycle Status */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
            {/* Severity Distribution Chart */}
            <div style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '1.5rem',
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                Severity Distribution
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Categorization of active vulnerabilities and secret leaks by CVSS impact.
              </p>
              <div style={{ height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.severityDistribution || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {(analytics?.severityDistribution || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Lifecycle Status Distribution */}
            <div style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '1.5rem',
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                Vulnerability Lifecycle Status
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Current state of remediation workflows across all inspected repositories.
              </p>
              <div style={{ height: '260px' }}>
                {hasFindings ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics?.lifecycleBreakdown || []}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={4}
                      >
                        {(analytics?.lifecycleBreakdown || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '0.75rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No findings recorded. All tracked repositories are clean!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Scan History Trends (Line Chart) */}
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '1.5rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Scan History & Finding Velocity Trend
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Chronological progression of detected security findings across recent scans.
                </p>
              </div>
            </div>
            <div style={{ height: '280px', marginTop: '1rem' }}>
              {(analytics?.scanTrends || []).length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.scanTrends} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '0.75rem' }} />
                    <Line type="monotone" dataKey="totalFindings" name="Total Findings" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="critical" name="Critical" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="high" name="High" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Insufficient completed scans to graph historical trends.
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Findings by Repository & Scanner Comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
            {/* Findings by Repository */}
            <div style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '1.5rem',
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                Findings by Repository
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Comparative vulnerability breakdown across individual codebases.
              </p>
              <div style={{ height: '260px' }}>
                {(analytics?.findingsByRepository || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.findingsByRepository} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={80} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                      <Bar dataKey="secrets" name="Gitleaks Secrets" fill="#f59e0b" stackId="a" />
                      <Bar dataKey="vulnerabilities" name="Trivy CVEs" fill="#0ea5e9" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No repositories registered.
                  </div>
                )}
              </div>
            </div>

            {/* Scanner Engine Distribution */}
            <div style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '1.5rem',
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                Scanner Engine Coverage
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Secret leak detection (Gitleaks) versus dependency vulnerability scanning (Trivy).
              </p>
              <div style={{ height: '260px' }}>
                {hasFindings ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics?.scannerBreakdown || []}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {(analytics?.scannerBreakdown || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '0.75rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No findings detected by scanner engines.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
