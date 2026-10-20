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
        backgroundColor: 'var(--severity-critical-bg)',
        border: '1px solid var(--severity-critical-border)',
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

  // Custom Light Frosted Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '0.65rem 0.85rem',
          fontSize: '0.75rem',
          color: 'var(--text-primary)',
          boxShadow: 'var(--card-shadow-hover)',
        }}>
          <p style={{ fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
            {label || payload[0]?.name}
          </p>
          {payload.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0', fontWeight: 500 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color || item.fill || 'var(--accent-primary)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>{item.name}:</span>
              <strong style={{ color: 'var(--text-primary)', marginLeft: 'auto' }}>{item.value}</strong>
            </div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'var(--gradient-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: 'var(--glow-primary)',
              }}
            >
              <BarChart3 size={20} />
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', margin: 0 }}>
              Security Posture Analytics
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.45rem', marginBottom: 0 }}>
            Real-time vulnerability telemetry, lifecycle resolution velocity, and severity distribution across government open-source repositories.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          title="Refresh analytics metrics"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.15rem',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-primary)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)';
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
        gap: '1.25rem',
      }}>
        {/* Security Health Score */}
        <div
          className="card-prismatic"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '1.35rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Security Health Score</span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--gradient-teal)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: 'var(--glow-teal)',
              }}
            >
              <ShieldCheck size={18} />
            </div>
          </div>
          <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'baseline', gap: '0.65rem' }}>
            <span style={{ fontSize: '2.15rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {analytics?.globalScore ?? 100}%
            </span>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.5rem',
              borderRadius: '6px',
              backgroundColor: (analytics?.globalScore ?? 100) >= 90 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(251, 113, 133, 0.12)',
              border: `1px solid ${(analytics?.globalScore ?? 100) >= 90 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(251, 113, 133, 0.3)'}`,
              color: (analytics?.globalScore ?? 100) >= 90 ? '#059669' : '#E11D48',
            }}>
              Grade {analytics?.globalGrade || 'A'}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontWeight: 500 }}>
            {analytics?.globalRiskLevel || 'Clean Posture'}
          </div>
        </div>

        {/* Resolution Rate */}
        <div
          className="card-prismatic"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '1.35rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Resolution Rate</span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
              }}
            >
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'baseline', gap: '0.65rem' }}>
            <span style={{ fontSize: '2.15rem', fontWeight: 800, color: '#059669', letterSpacing: '-0.02em' }}>
              {analytics?.resolutionRate || '100%'}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontWeight: 500 }}>
            {analytics?.resolvedFindings ?? 0} of {analytics?.totalFindings ?? 0} findings resolved
          </div>
        </div>

        {/* Repositories Scanned */}
        <div
          className="card-prismatic"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '1.35rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Tracked Repositories</span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--gradient-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: 'var(--glow-primary)',
              }}
            >
              <FolderGit2 size={18} />
            </div>
          </div>
          <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'baseline', gap: '0.65rem' }}>
            <span style={{ fontSize: '2.15rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {analytics?.totalRepositories ?? 0}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontWeight: 500 }}>
            {analytics?.scannedRepositories ?? 0} actively scanned with security tools
          </div>
        </div>

        {/* Total Scans Executed */}
        <div
          className="card-prismatic"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '1.35rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Scans Logged</span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--gradient-violet)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: 'var(--glow-violet)',
              }}
            >
              <Activity size={18} />
            </div>
          </div>
          <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'baseline', gap: '0.65rem' }}>
            <span style={{ fontSize: '2.15rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {analytics?.totalScans ?? 0}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontWeight: 500 }}>
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
        backgroundColor: 'var(--badge-info-bg)',
        border: '1px solid var(--badge-info-border)',
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
            <div
              className="card-prismatic"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Severity Distribution
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: '1.25rem' }}>
                Categorization of active vulnerabilities and secret leaks by CVSS impact.
              </p>
              <div style={{ height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.severityDistribution || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="anl-bar-CRITICAL" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FB7185" />
                        <stop offset="100%" stopColor="#E11D48" />
                      </linearGradient>
                      <linearGradient id="anl-bar-HIGH" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F97316" />
                        <stop offset="100%" stopColor="#EA580C" />
                      </linearGradient>
                      <linearGradient id="anl-bar-MEDIUM" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FBBF24" />
                        <stop offset="100%" stopColor="#D97706" />
                      </linearGradient>
                      <linearGradient id="anl-bar-LOW" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06B6D4" />
                        <stop offset="100%" stopColor="#2563EB" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF5" vertical={false} />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {(analytics?.severityDistribution || []).map((entry, index) => {
                        const gradId = entry.name === 'CRITICAL' ? 'url(#anl-bar-CRITICAL)'
                          : entry.name === 'HIGH' ? 'url(#anl-bar-HIGH)'
                          : entry.name === 'MEDIUM' ? 'url(#anl-bar-MEDIUM)'
                          : 'url(#anl-bar-LOW)';
                        return <Cell key={`cell-${index}`} fill={gradId} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Lifecycle Status Distribution */}
            <div
              className="card-prismatic"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Vulnerability Lifecycle Status
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: '1.25rem' }}>
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
                        innerRadius={58}
                        outerRadius={92}
                        paddingAngle={5}
                      >
                        {(analytics?.lifecycleBreakdown || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
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
          <div
            className="card-prismatic"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Scan History & Finding Velocity Trend
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: 0 }}>
                  Chronological progression of detected security findings across recent scans.
                </p>
              </div>
            </div>
            <div style={{ height: '280px', marginTop: '1rem' }}>
              {(analytics?.scanTrends || []).length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.scanTrends} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="anl-line-total" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#2563EB" />
                        <stop offset="100%" stopColor="#7C3AED" />
                      </linearGradient>
                      <linearGradient id="anl-line-crit" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#FB7185" />
                        <stop offset="100%" stopColor="#E11D48" />
                      </linearGradient>
                      <linearGradient id="anl-line-high" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#F97316" />
                        <stop offset="100%" stopColor="#EA580C" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF5" vertical={false} />
                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '0.75rem' }} />
                    <Line type="monotone" dataKey="totalFindings" name="Total Findings" stroke="url(#anl-line-total)" strokeWidth={2.5} dot={{ r: 3, fill: '#2563EB', stroke: '#ffffff' }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="critical" name="Critical" stroke="url(#anl-line-crit)" strokeWidth={2.5} dot={{ r: 3, fill: '#E11D48', stroke: '#ffffff' }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="high" name="High" stroke="url(#anl-line-high)" strokeWidth={2.5} dot={{ r: 3, fill: '#EA580C', stroke: '#ffffff' }} activeDot={{ r: 5 }} />
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
            <div
              className="card-prismatic"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Findings by Repository
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: '1.25rem' }}>
                Comparative vulnerability breakdown across individual codebases.
              </p>
              <div style={{ height: '260px' }}>
                {(analytics?.findingsByRepository || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.findingsByRepository} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="anl-repo-secrets" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#FBBF24" />
                          <stop offset="100%" stopColor="#D97706" />
                        </linearGradient>
                        <linearGradient id="anl-repo-cves" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#06B6D4" />
                          <stop offset="100%" stopColor="#2563EB" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF5" horizontal={false} />
                      <XAxis type="number" stroke="#94A3B8" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={80} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                      <Bar dataKey="secrets" name="Gitleaks Secrets" fill="url(#anl-repo-secrets)" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="vulnerabilities" name="Trivy CVEs" fill="url(#anl-repo-cves)" stackId="a" radius={[0, 6, 6, 0]} />
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
            <div
              className="card-prismatic"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Scanner Engine Coverage
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: '1.25rem' }}>
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
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={5}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {(analytics?.scannerBreakdown || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
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
