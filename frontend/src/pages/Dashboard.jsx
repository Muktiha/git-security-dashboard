import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  KeyRound, 
  ShieldAlert, 
  CheckCircle2, 
  Play, 
  AlertTriangle, 
  RefreshCw, 
  ChevronRight, 
  BarChart3, 
  Clock, 
  TrendingUp, 
  FolderGit2, 
  Plus, 
  FileDown, 
  ExternalLink, 
  Activity, 
  ArrowRight, 
  ShieldCheck, 
  X, 
  Search, 
  Filter, 
  AlertCircle, 
  Sparkles,
  GitCompare,
  Zap,
  HelpCircle,
  Calendar
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell, 
  Legend 
} from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return 'Never';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  } catch {
    return 'recently';
  }
};

export default function Dashboard() {
  const navigate = useNavigate();

  // Dashboard Data State
  const [data, setData] = useState({
    stats: {
      totalRepositories: 0,
      scannedRepositories: 0,
      openCriticalFindings: 0,
      unresolvedFindings: 0,
      resolvedFindings: 0,
      totalFindings: 0,
      exposedSecrets: 0,
      criticalCVEs: 0,
      healthScore: '100%',
      healthScoreNumber: 100,
      healthGrade: 'A',
      healthLabel: 'Loading...',
      freshness: { fresh: 0, stale: 0, neverScanned: 0, thresholdDays: 7 },
    },
    repositoryRiskTable: [],
    recommendedActions: [],
    latestScanComparison: null,
    trends: {
      scanTrends: [],
      newVsResolvedTrends: [],
      severityDistribution: [],
    },
    recentActivity: [],
    availableRepositories: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Global Filter State
  const [filterRepo, setFilterRepo] = useState('ALL');
  const [filterTime, setFilterTime] = useState('all'); // '7d' | '30d' | 'all'
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterScanner, setFilterScanner] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [repoSearch, setRepoSearch] = useState('');

  // Quick Action Modal States
  const [showAddRepoModal, setShowAddRepoModal] = useState(false);
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newRepoBranch, setNewRepoBranch] = useState('main');
  const [addingRepo, setAddingRepo] = useState(false);
  const [addRepoError, setAddRepoError] = useState('');

  const [showQuickScanModal, setShowQuickScanModal] = useState(false);
  const [selectedScanRepoId, setSelectedScanRepoId] = useState('');
  const [scanningRepoId, setScanningRepoId] = useState(null);
  const [scanBannerMsg, setScanBannerMsg] = useState(null);

  // PDF Export Feedback State
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [pdfFeedback, setPdfFeedback] = useState(null);

  const token = localStorage.getItem('token');

  // Fetch Dashboard Telemetry
  const fetchDashboardStats = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (filterRepo !== 'ALL') params.append('repositoryId', filterRepo);
      if (filterTime !== 'all') params.append('timeRange', filterTime);
      if (filterSeverity !== 'ALL') params.append('severity', filterSeverity);
      if (filterScanner !== 'ALL') params.append('scanner', filterScanner);
      if (filterStatus !== 'ALL') params.append('status', filterStatus);

      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get(`/scans/dashboard/stats${queryStr}`);

      if (response.data && response.data.success) {
        setData({
          stats: response.data.stats || {},
          repositoryRiskTable: response.data.repositoryRiskTable || [],
          recommendedActions: response.data.recommendedActions || [],
          latestScanComparison: response.data.latestScanComparison || null,
          trends: response.data.trends || { scanTrends: [], newVsResolvedTrends: [], severityDistribution: [] },
          recentActivity: response.data.recentActivity || [],
          availableRepositories: response.data.availableRepositories || [],
        });

        // Set default repo for quick scan modal if available
        if (response.data.availableRepositories && response.data.availableRepositories.length > 0 && !selectedScanRepoId) {
          setSelectedScanRepoId(response.data.availableRepositories[0]._id);
        }
      }
    } catch (err) {
      console.error('[Dashboard Error]', err);
      setError(err.response?.data?.message || 'Failed to load command center statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [filterRepo, filterTime, filterSeverity, filterScanner, filterStatus]);

  // Handle Quick Scan Execution
  const handleTriggerScan = async (repoId) => {
    if (!repoId) return;
    try {
      setScanningRepoId(repoId);
      setScanBannerMsg({ type: 'info', message: 'Initiating automated Gitleaks & Trivy scan...' });

      const res = await api.post(`/scans/${repoId}`);
      if (res.data && res.data.success) {
        setScanBannerMsg({
          type: 'success',
          message: `Scan completed successfully for repository. Total findings detected: ${res.data.scan?.totalFindings || 0}.`,
        });
        fetchDashboardStats();
      }
    } catch (scanErr) {
      console.error('[Quick Scan Error]', scanErr);
      setScanBannerMsg({
        type: 'error',
        message: scanErr.response?.data?.message || 'Security scan failed to complete.',
      });
    } finally {
      setScanningRepoId(null);
      setTimeout(() => setScanBannerMsg(null), 6000);
      setShowQuickScanModal(false);
    }
  };

  // Handle Adding New Repository
  const handleAddRepository = async (e) => {
    e.preventDefault();
    if (!newRepoUrl.trim()) return;

    try {
      setAddingRepo(true);
      setAddRepoError('');
      const res = await api.post('/repositories', {
        url: newRepoUrl.trim(),
        branch: newRepoBranch.trim() || 'main',
        visibility: 'public',
      });

      if (res.data && res.data.success) {
        setShowAddRepoModal(false);
        setNewRepoUrl('');
        setNewRepoBranch('main');
        setScanBannerMsg({
          type: 'success',
          message: `Repository "${res.data.repository?.name || 'repo'}" added successfully. Ready for scan.`,
        });
        fetchDashboardStats();
        setTimeout(() => setScanBannerMsg(null), 5000);
      }
    } catch (addErr) {
      console.error('[Add Repo Error]', addErr);
      setAddRepoError(addErr.response?.data?.message || 'Failed to register repository.');
    } finally {
      setAddingRepo(false);
    }
  };

  // Handle Executive PDF Download
  const handleDownloadExecutiveSummary = async () => {
    try {
      setPdfDownloading(true);
      setPdfFeedback(null);

      const { downloadExecutiveDashboardPDF } = await import('../utils/pdfGenerator');
      const filename = downloadExecutiveDashboardPDF({
        stats: data.stats,
        repositoryRiskTable: data.repositoryRiskTable,
        recommendedActions: data.recommendedActions,
      });

      setPdfFeedback({
        type: 'success',
        message: `Executive Summary exported successfully as "${filename}".`,
      });
      setTimeout(() => setPdfFeedback(null), 5000);
    } catch (pdfErr) {
      console.error('[PDF Export Error]', pdfErr);
      setPdfFeedback({
        type: 'error',
        message: `Failed to export PDF: ${pdfErr.message}`,
      });
    } finally {
      setPdfDownloading(false);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setFilterRepo('ALL');
    setFilterTime('all');
    setFilterSeverity('ALL');
    setFilterScanner('ALL');
    setFilterStatus('ALL');
  };

  // Filtered Repository Risk Table
  const filteredRiskTable = (data.repositoryRiskTable || []).filter((r) => {
    if (!repoSearch.trim()) return true;
    const q = repoSearch.toLowerCase();
    return (
      (r.name || '').toLowerCase().includes(q) ||
      (r.owner || '').toLowerCase().includes(q) ||
      (r.branch || '').toLowerCase().includes(q)
    );
  });

  // Custom Chart Tooltip
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
      {/* 1. Command Center Hero Section */}
      <div
        className="card-prismatic"
        style={{
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          padding: '1.75rem 2rem',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        {/* Subtle Ambient Radial Glow Orbs */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-30px',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, rgba(124, 58, 237, 0.05) 50%, transparent 70%)',
            pointerEvents: 'none',
            filter: 'blur(24px)',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '-40px',
            left: '30%',
            width: '240px',
            height: '180px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.10) 0%, transparent 65%)',
            pointerEvents: 'none',
            filter: 'blur(20px)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.65rem' }}>
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
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                }}
              >
                <Activity size={20} />
              </div>

              {/* Status pulse indicator */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#059669',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    boxShadow: '0 0 6px #10B981',
                  }}
                />
                <span>Engines Ready • Trivy & Gitleaks Active</span>
              </div>
            </div>

            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', margin: 0, lineHeight: 1.2 }}>
              DevSecOps Security Command Center
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: 0, lineHeight: 1.5 }}>
              Continuous vulnerability orchestration, automated secret leak interception, and hygiene SLA telemetry for open-source government codebases.
            </p>
          </div>

          {/* Quick Actions Header Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Quick Scan Action (Primary Gradient) */}
            <button
              onClick={() => setShowQuickScanModal(true)}
              title="Trigger an automated security scan"
              className="btn-primary-gradient"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.85rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Play size={15} />
              <span>Start Scan</span>
            </button>

            {/* Add Repository Action (Secondary Prismatic) */}
            <button
              onClick={() => setShowAddRepoModal(true)}
              title="Register a new GitHub repository"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.15rem',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.85rem',
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
              <Plus size={15} color="var(--accent-primary)" />
              <span>Add Repository</span>
            </button>

            {/* View Critical Findings */}
            <Link
              to="/findings?severity=CRITICAL&status=OPEN"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.15rem',
                backgroundColor: 'rgba(251, 113, 133, 0.08)',
                border: '1px solid rgba(251, 113, 133, 0.25)',
                color: '#E11D48',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.85rem',
                textDecoration: 'none',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(251, 113, 133, 0.14)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(251, 113, 133, 0.08)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <ShieldAlert size={15} />
              <span>Critical ({data.stats?.openCriticalFindings || 0})</span>
            </Link>

            {/* Download Security Summary */}
            <button
              onClick={handleDownloadExecutiveSummary}
              disabled={pdfDownloading || loading}
              title="Export DevSecOps Executive Security Summary PDF"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.15rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: pdfDownloading || loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseEnter={(e) => {
                if (!pdfDownloading && !loading) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!pdfDownloading && !loading) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              {pdfDownloading ? (
                <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <FileDown size={15} />
              )}
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Alerts & Feedback */}
      {scanBannerMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          fontSize: '0.85rem',
          backgroundColor: scanBannerMsg.type === 'success' 
            ? 'var(--status-success-bg)' 
            : scanBannerMsg.type === 'error' 
            ? 'var(--severity-critical-bg)' 
            : 'var(--badge-info-bg)',
          border: `1px solid ${
            scanBannerMsg.type === 'success' 
              ? 'var(--status-success-border)' 
              : scanBannerMsg.type === 'error' 
              ? 'var(--severity-critical-border)' 
              : 'var(--badge-info-border)'
          }`,
          color: scanBannerMsg.type === 'success' 
            ? 'var(--status-success)' 
            : scanBannerMsg.type === 'error' 
            ? 'var(--severity-critical)' 
            : 'var(--accent-cyan)',
        }}>
          {scanBannerMsg.type === 'success' ? <CheckCircle2 size={18} /> : scanBannerMsg.type === 'error' ? <AlertTriangle size={18} /> : <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />}
          <span>{scanBannerMsg.message}</span>
        </div>
      )}

      {pdfFeedback && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          fontSize: '0.85rem',
          backgroundColor: pdfFeedback.type === 'success' ? 'var(--status-success-bg)' : 'var(--severity-critical-bg)',
          border: `1px solid ${pdfFeedback.type === 'success' ? 'var(--status-success-border)' : 'var(--severity-critical-border)'}`,
          color: pdfFeedback.type === 'success' ? 'var(--status-success)' : 'var(--severity-critical)',
        }}>
          {pdfFeedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{pdfFeedback.message}</span>
        </div>
      )}

      {/* 2. Global Filter Controls Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem',
        padding: '0.85rem 1.25rem',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Filter size={14} color="var(--accent-cyan)" />
            <span>Filters:</span>
          </div>

          {/* Repo Filter */}
          <select
            value={filterRepo}
            onChange={(e) => setFilterRepo(e.target.value)}
            style={{
              padding: '0.4rem 0.75rem',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Repositories ({data.availableRepositories.length})</option>
            {data.availableRepositories.map((r) => (
              <option key={r._id} value={r._id}>
                {r.name}
              </option>
            ))}
          </select>

          {/* Time Range Filter */}
          <select
            value={filterTime}
            onChange={(e) => setFilterTime(e.target.value)}
            style={{
              padding: '0.4rem 0.75rem',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            style={{
              padding: '0.4rem 0.75rem',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Scanner Filter */}
          <select
            value={filterScanner}
            onChange={(e) => setFilterScanner(e.target.value)}
            style={{
              padding: '0.4rem 0.75rem',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Scanners</option>
            <option value="GITLEAKS">Gitleaks (Secrets)</option>
            <option value="TRIVY">Trivy (Vulnerabilities)</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.4rem 0.75rem',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="ACCEPTED_RISK">Accepted Risk</option>
          </select>
        </div>

        {(filterRepo !== 'ALL' || filterTime !== 'all' || filterSeverity !== 'ALL' || filterScanner !== 'ALL' || filterStatus !== 'ALL') && (
          <button
            onClick={handleResetFilters}
            style={{
              padding: '0.35rem 0.75rem',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--accent-cyan)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* 3. Executive KPI Metric Cards (5 Cards) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1.25rem',
      }}>
        {/* Card 1: Health Score */}
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
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Security Health Score
            </span>
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
              {loading ? '-' : data.stats?.healthScore || '100%'}
            </span>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.5rem',
              borderRadius: '6px',
              backgroundColor: (data.stats?.healthScoreNumber ?? 100) >= 90 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(251, 113, 133, 0.12)',
              border: `1px solid ${(data.stats?.healthScoreNumber ?? 100) >= 90 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(251, 113, 133, 0.3)'}`,
              color: (data.stats?.healthScoreNumber ?? 100) >= 90 ? '#059669' : '#E11D48',
            }}>
              Grade {data.stats?.healthGrade || 'A'}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontWeight: 500 }}>
            {data.stats?.healthLabel || 'Clean posture'}
          </div>
        </div>

        {/* Card 2: Open Critical Findings */}
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
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#E11D48' }}>
              Open Critical Findings
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--gradient-warm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: 'var(--glow-warm)',
              }}
            >
              <ShieldAlert size={18} />
            </div>
          </div>
          <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'baseline', gap: '0.65rem' }}>
            <span style={{ fontSize: '2.15rem', fontWeight: 800, color: '#E11D48', letterSpacing: '-0.02em' }}>
              {loading ? '-' : data.stats?.openCriticalFindings ?? 0}
            </span>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '0.15rem 0.45rem',
              borderRadius: '6px',
              backgroundColor: 'rgba(251, 113, 133, 0.12)',
              color: '#E11D48',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              Urgent
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontWeight: 500 }}>
            {data.stats?.exposedSecrets ?? 0} exposed secrets • {data.stats?.criticalCVEs ?? 0} critical CVEs
          </div>
        </div>

        {/* Card 3: Total Unresolved Findings */}
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
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Total Unresolved Issues
            </span>
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
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'baseline', gap: '0.65rem' }}>
            <span style={{ fontSize: '2.15rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {loading ? '-' : data.stats?.unresolvedFindings ?? 0}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>open / in progress</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontWeight: 500 }}>
            Across all active repository scans
          </div>
        </div>

        {/* Card 4: Resolved Findings */}
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
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Resolved Vulnerabilities
            </span>
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
              {loading ? '-' : data.stats?.resolvedFindings ?? 0}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
              ({(data.stats?.totalFindings || 0) > 0 ? Math.round(((data.stats?.resolvedFindings || 0) / data.stats?.totalFindings) * 100) : 100}% rate)
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontWeight: 500 }}>
            Patched credentials & dependencies
          </div>
        </div>

        {/* Card 5: Repositories & Scan Hygiene */}
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
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Scan Hygiene & Freshness
            </span>
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
              {loading ? '-' : data.stats?.totalRepositories ?? 0}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>repositories</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', gap: '0.5rem', fontWeight: 500 }}>
            <span style={{ color: '#059669', fontWeight: 600 }}>{data.stats?.freshness?.fresh || 0} Fresh</span>
            <span>•</span>
            <span style={{ color: data.stats?.freshness?.stale > 0 ? '#EA580C' : 'var(--text-muted)' }}>{data.stats?.freshness?.stale || 0} Stale</span>
            <span>•</span>
            <span>{data.stats?.freshness?.neverScanned || 0} Unscanned</span>
          </div>
        </div>
      </div>

      {/* 4. Actionable Security Recommendations & Automated Scan Diff Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Recommended Actions Card */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} color="#f59e0b" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Recommended Security Actions
              </h2>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Prioritized Remediation Feed
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.recommendedActions.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                <CheckCircle2 size={32} color="var(--status-success)" style={{ margin: '0 auto 0.5rem auto' }} />
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>All Baselines Clean & Fresh</div>
                <div style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>No critical vulnerabilities, failed scans, or stale repositories detected.</div>
              </div>
            ) : (
              data.recommendedActions.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: `1px solid ${
                      item.priority === 'CRITICAL' 
                        ? 'var(--severity-critical-border)' 
                        : item.priority === 'HIGH' 
                        ? 'var(--severity-high-border)' 
                        : 'var(--border-color)'
                    }`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                      <span style={{
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        backgroundColor: item.priority === 'CRITICAL' ? 'var(--severity-critical-bg)' : item.priority === 'HIGH' ? 'var(--severity-high-bg)' : 'var(--badge-info-bg)',
                        border: `1px solid ${item.priority === 'CRITICAL' ? 'var(--severity-critical-border)' : item.priority === 'HIGH' ? 'var(--severity-high-border)' : 'var(--badge-info-border)'}`,
                        color: item.priority === 'CRITICAL' ? 'var(--severity-critical)' : item.priority === 'HIGH' ? 'var(--severity-high)' : 'var(--badge-info-text)',
                      }}>
                        {item.priority}
                      </span>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{item.title}</strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                      {item.description}
                    </div>
                  </div>

                  {item.actionType === 'RETRY_SCAN' || item.actionType === 'SCAN' ? (
                    <button
                      onClick={() => handleTriggerScan(item.repoId)}
                      disabled={scanningRepoId === item.repoId}
                      style={{
                        padding: '0.4rem 0.85rem',
                        backgroundColor: 'var(--accent-cyan)',
                        border: 'none',
                        color: '#ffffff',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: scanningRepoId === item.repoId ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        flexShrink: 0,
                      }}
                    >
                      {scanningRepoId === item.repoId ? (
                        <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Play size={13} />
                      )}
                      <span>Scan Now</span>
                    </button>
                  ) : (
                    <Link
                      to={item.link}
                      style={{
                        padding: '0.4rem 0.85rem',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--accent-cyan)',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        flexShrink: 0,
                      }}
                    >
                      <span>Triage</span>
                      <ArrowRight size={13} />
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Latest Scan Diff Summary Card */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <GitCompare size={18} color="var(--accent-cyan)" />
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Latest Scan Comparison Diff
                </h2>
              </div>
              <Link
                to="/scan-history"
                style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
              >
                View Full Diff <ChevronRight size={14} />
              </Link>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Automated diff between the latest scan and its predecessor baseline.
            </p>
          </div>

          {data.latestScanComparison ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {data.latestScanComparison.repoOwner}/{data.latestScanComparison.repoName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Evaluated {formatTimeAgo(data.latestScanComparison.targetDate)}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: data.latestScanComparison.scoreDelta > 0 
                      ? 'var(--status-success)' 
                      : data.latestScanComparison.scoreDelta < 0 
                      ? 'var(--severity-critical)' 
                      : 'var(--text-primary)',
                  }}>
                    {data.latestScanComparison.scoreDelta > 0 ? `+${data.latestScanComparison.scoreDelta}%` : `${data.latestScanComparison.scoreDelta}%`}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Score Delta</div>
                </div>
              </div>

              {/* 3 Metric Pills */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--severity-critical-bg)', border: '1px solid var(--severity-critical-border)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--severity-critical)' }}>
                    {data.latestScanComparison.newCount}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Newly Detected</div>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--status-success)' }}>
                    {data.latestScanComparison.fixedCount}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Fixed / Patched</div>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: 'var(--severity-medium-bg)', border: '1px solid var(--severity-medium-border)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--severity-medium)' }}>
                    {data.latestScanComparison.persistentCount}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Persistent</div>
                </div>
              </div>

              <Link
                to="/scan-history"
                style={{
                  padding: '0.5rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Inspect Finding Changes in Comparator
              </Link>
            </div>
          ) : (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
              <GitCompare size={32} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>Insufficient Scan History for Diff</div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>Run at least two consecutive scans on the same repository to generate delta telemetry.</div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Security Trend Visualizations (Recharts) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Trend 1: Findings Over Time */}
        <div
          className="card-prismatic"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '1.5rem',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Findings Progression Over Time
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: 0 }}>
                Chronological volume of total findings detected in recent scan runs.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.7rem', fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#2563EB' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB' }} />
                <span>Total</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#E11D48' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#E11D48' }} />
                <span>Critical</span>
              </div>
            </div>
          </div>

          <div style={{ height: '220px' }}>
            {(data.trends?.scanTrends || []).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trends.scanTrends} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="linePrimaryGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#2563EB" />
                      <stop offset="100%" stopColor="#7C3AED" />
                    </linearGradient>
                    <linearGradient id="lineWarmGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#FB7185" />
                      <stop offset="100%" stopColor="#E11D48" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF5" vertical={false} />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="totalFindings" name="Total Findings" stroke="url(#linePrimaryGrad)" strokeWidth={2.5} dot={{ r: 3, fill: '#2563EB', strokeWidth: 1, stroke: '#ffffff' }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="critical" name="Critical" stroke="url(#lineWarmGrad)" strokeWidth={2.5} dot={{ r: 3, fill: '#E11D48', strokeWidth: 1, stroke: '#ffffff' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No completed scans logged yet.
              </div>
            )}
          </div>
        </div>

        {/* Trend 2: Active Severity Distribution */}
        <div
          className="card-prismatic"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '1.5rem',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Active Severity Breakdown
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: '1.25rem' }}>
            Impact distribution across unresolved vulnerabilities & secrets.
          </p>
          <div style={{ height: '220px' }}>
            {(data.trends?.severityDistribution || []).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.trends.severityDistribution} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGrad-CRITICAL" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FB7185" />
                      <stop offset="100%" stopColor="#E11D48" />
                    </linearGradient>
                    <linearGradient id="barGrad-HIGH" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F97316" />
                      <stop offset="100%" stopColor="#EA580C" />
                    </linearGradient>
                    <linearGradient id="barGrad-MEDIUM" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FBBF24" />
                      <stop offset="100%" stopColor="#D97706" />
                    </linearGradient>
                    <linearGradient id="barGrad-LOW" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06B6D4" />
                      <stop offset="100%" stopColor="#2563EB" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF5" vertical={false} />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {(data.trends.severityDistribution || []).map((entry, idx) => {
                      const gradId = entry.name === 'CRITICAL' ? 'url(#barGrad-CRITICAL)'
                        : entry.name === 'HIGH' ? 'url(#barGrad-HIGH)'
                        : entry.name === 'MEDIUM' ? 'url(#barGrad-MEDIUM)'
                        : 'url(#barGrad-LOW)';
                      return <Cell key={`cell-${idx}`} fill={gradId} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Zero active findings recorded.
              </div>
            )}
          </div>
        </div>

        {/* Trend 3: Lifecycle Posture */}
        <div
          className="card-prismatic"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '1.5rem',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Lifecycle Remediation Posture
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: '1.25rem' }}>
            Volume of findings active, in progress, resolved, or accepted risk.
          </p>
          <div style={{ height: '220px' }}>
            {(data.trends?.newVsResolvedTrends || []).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.trends.newVsResolvedTrends} layout="vertical" margin={{ top: 5, right: 10, left: 20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barHoriz-Open" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#FB7185" />
                      <stop offset="100%" stopColor="#E11D48" />
                    </linearGradient>
                    <linearGradient id="barHoriz-InProgress" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#60A5FA" />
                      <stop offset="100%" stopColor="#2563EB" />
                    </linearGradient>
                    <linearGradient id="barHoriz-Resolved" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#34D399" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id="barHoriz-Accepted" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#A78BFA" />
                      <stop offset="100%" stopColor="#7C3AED" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF5" horizontal={false} />
                  <XAxis type="number" stroke="#94A3B8" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={80} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {(data.trends.newVsResolvedTrends || []).map((entry, idx) => {
                      const gradId = entry.name.includes('Open') ? 'url(#barHoriz-Open)'
                        : entry.name.includes('Progress') ? 'url(#barHoriz-InProgress)'
                        : entry.name.includes('Resolved') ? 'url(#barHoriz-Resolved)'
                        : 'url(#barHoriz-Accepted)';
                      return <Cell key={`cell-l-${idx}`} fill={gradId} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No lifecycle data available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Repository Risk Table with Scan Freshness & Quick Actions */}
      <div
        className="card-prismatic"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        {/* Table Header with Search */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: 'var(--bg-secondary)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Repository Risk & Freshness Hygiene
              </h2>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                color: 'var(--accent-primary)',
              }}>
                {filteredRiskTable.length} Repositories
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: 0 }}>
              Live posture matrix, vulnerability scores, and scan freshness tracking across monitored repositories.
            </p>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.45rem 0.85rem',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
          }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              value={repoSearch}
              onChange={(e) => setRepoSearch(e.target.value)}
              placeholder="Search repositories..."
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                outline: 'none',
                width: '180px',
              }}
            />
          </div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
            <div>Loading repository risk matrix...</div>
          </div>
        ) : filteredRiskTable.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FolderGit2 size={36} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No repositories found</div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
              Add a GitHub repository to begin tracking security posture.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Repository</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Score</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Critical</th>
                  <th style={{ padding: '0.85rem 1rem' }}>High</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Scan Hygiene</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Latest Status</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRiskTable.map((repo) => (
                  <tr
                    key={repo._id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {/* Repository Name & Branch */}
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {repo.owner ? `${repo.owner}/${repo.name}` : repo.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        branch: {repo.branch}
                      </div>
                    </td>

                    {/* Security Health Score */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {repo.scanStatus === 'FAILED' ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--severity-critical)', fontWeight: 600 }}>
                          Scan Failed
                        </span>
                      ) : repo.score !== null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{
                            fontWeight: 700,
                            color: repo.score >= 90 ? 'var(--status-success)' : repo.score >= 75 ? 'var(--severity-medium)' : 'var(--severity-critical)',
                          }}>
                            {repo.score}%
                          </span>
                          <span style={{
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            backgroundColor: repo.score >= 90 ? 'var(--status-success-bg)' : 'var(--severity-critical-bg)',
                            border: `1px solid ${repo.score >= 90 ? 'var(--status-success-border)' : 'var(--severity-critical-border)'}`,
                            color: repo.score >= 90 ? 'var(--status-success)' : 'var(--severity-critical)',
                          }}>
                            Grade {repo.grade}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending</span>
                      )}
                    </td>

                    {/* Critical Count */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: repo.openCriticalCount > 0 ? 'var(--severity-critical-bg)' : 'transparent',
                        border: repo.openCriticalCount > 0 ? '1px solid var(--severity-critical-border)' : 'none',
                        color: repo.openCriticalCount > 0 ? 'var(--severity-critical)' : 'var(--text-muted)',
                      }}>
                        {repo.openCriticalCount}
                      </span>
                    </td>

                    {/* High Count */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: repo.openHighCount > 0 ? 'var(--severity-high-bg)' : 'transparent',
                        border: repo.openHighCount > 0 ? '1px solid var(--severity-high-border)' : 'none',
                        color: repo.openHighCount > 0 ? 'var(--severity-high)' : 'var(--text-muted)',
                      }}>
                        {repo.openHighCount}
                      </span>
                    </td>

                    {/* Scan Freshness Hygiene */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: repo.freshness === 'FRESH'
                            ? 'var(--status-success-bg)'
                            : repo.freshness === 'STALE'
                            ? 'var(--severity-high-bg)'
                            : 'var(--bg-secondary)',
                          border: `1px solid ${
                            repo.freshness === 'FRESH'
                              ? 'var(--status-success-border)'
                              : repo.freshness === 'STALE'
                              ? 'var(--severity-high-border)'
                              : 'var(--border-color)'
                          }`,
                          color: repo.freshness === 'FRESH'
                            ? 'var(--status-success)'
                            : repo.freshness === 'STALE'
                            ? 'var(--severity-high)'
                            : 'var(--text-muted)',
                        }}>
                          {repo.freshness === 'FRESH' ? 'FRESH' : repo.freshness === 'STALE' ? 'STALE (>7d)' : 'UNSCANNED'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatTimeAgo(repo.lastScannedAt)}
                        </span>
                      </div>
                    </td>

                    {/* Scan Status */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        backgroundColor: repo.scanStatus === 'COMPLETED'
                          ? 'var(--status-success-bg)'
                          : repo.scanStatus === 'FAILED'
                          ? 'var(--severity-critical-bg)'
                          : 'var(--badge-info-bg)',
                        border: `1px solid ${
                          repo.scanStatus === 'COMPLETED'
                            ? 'var(--status-success-border)'
                            : repo.scanStatus === 'FAILED'
                            ? 'var(--severity-critical-border)'
                            : 'var(--badge-info-border)'
                        }`,
                        color: repo.scanStatus === 'COMPLETED'
                          ? 'var(--status-success)'
                          : repo.scanStatus === 'FAILED'
                          ? 'var(--severity-critical)'
                          : 'var(--badge-info-text)',
                      }}>
                        {repo.scanStatus}
                      </span>
                    </td>

                    {/* Row Actions */}
                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Link
                          to={`/findings?repoId=${repo._id}`}
                          title="View findings for this repository"
                          style={{
                            padding: '0.35rem 0.65rem',
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--accent-cyan)',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          Findings
                        </Link>

                        <button
                          onClick={() => handleTriggerScan(repo._id)}
                          disabled={scanningRepoId === repo._id}
                          title="Trigger a new scan now"
                          style={{
                            padding: '0.35rem 0.65rem',
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: scanningRepoId === repo._id ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <Play size={11} color="var(--accent-cyan)" />
                          <span>{scanningRepoId === repo._id ? 'Scanning...' : 'Scan'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 7. Real Security Activity Feed Stream */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '1.5rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Recent Security Activity Feed
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Live audit stream of completed scans, failures, alert notifications, and remediation state transitions.
            </p>
          </div>
          <Link
            to="/notifications"
            style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
          >
            All Notifications <ChevronRight size={14} />
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {data.recentActivity.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
              No recent activity recorded.
            </div>
          ) : (
            data.recentActivity.map((act) => (
              <div
                key={act.id}
                onClick={() => {
                  if (act.link) navigate(act.link);
                }}
                style={{
                  padding: '0.8rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  cursor: act.link ? 'pointer' : 'default',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (act.link) e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                }}
                onMouseLeave={(e) => {
                  if (act.link) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {act.type === 'SCAN_FAILED' ? (
                    <AlertTriangle size={16} color="var(--severity-critical)" />
                  ) : act.type === 'CRITICAL_FINDINGS' ? (
                    <ShieldAlert size={16} color="var(--severity-critical)" />
                  ) : act.type === 'HIGH_FINDINGS' ? (
                    <ShieldAlert size={16} color="var(--severity-high)" />
                  ) : (
                    <CheckCircle2 size={16} color="var(--status-success)" />
                  )}

                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {act.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {act.message}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.72rem', flexShrink: 0 }}>
                  <Clock size={12} />
                  <span>{formatTimeAgo(act.timestamp)}</span>
                  {act.link && <ChevronRight size={13} />}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL 1: Add Repository Dialog */}
      {showAddRepoModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem',
        }}>
          <div
            className="card-prismatic"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '500px',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                  <Plus size={16} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Track New Git Repository
                </h3>
              </div>
              <button
                onClick={() => setShowAddRepoModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem', borderRadius: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {addRepoError && (
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(251, 113, 133, 0.12)',
                border: '1px solid rgba(251, 113, 133, 0.3)',
                borderRadius: '8px',
                color: '#E11D48',
                fontSize: '0.825rem',
                fontWeight: 500,
              }}>
                {addRepoError}
              </div>
            )}

            <form onSubmit={handleAddRepository} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Repository HTTPS Clone URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://github.com/owner/repository"
                  value={newRepoUrl}
                  onChange={(e) => setNewRepoUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Target Inspection Branch
                </label>
                <input
                  type="text"
                  required
                  placeholder="main"
                  value={newRepoBranch}
                  onChange={(e) => setNewRepoBranch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddRepoModal(false)}
                  style={{
                    padding: '0.6rem 1.15rem',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingRepo}
                  className="btn-primary-gradient"
                  style={{
                    padding: '0.6rem 1.35rem',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: addingRepo ? 'not-allowed' : 'pointer',
                  }}
                >
                  {addingRepo ? 'Registering...' : 'Register Repository'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Quick Scan Launcher Dialog */}
      {showQuickScanModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem',
        }}>
          <div
            className="card-prismatic"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '480px',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                  <Play size={14} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Launch Security Scan
                </h3>
              </div>
              <button
                onClick={() => setShowQuickScanModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem', borderRadius: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Triggers synchronous Gitleaks credential history analysis and Trivy SCA dependency vulnerability detection.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Select Tracked Repository
              </label>
              <select
                value={selectedScanRepoId}
                onChange={(e) => setSelectedScanRepoId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {data.availableRepositories.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.owner ? `${r.owner}/${r.name}` : r.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowQuickScanModal(false)}
                style={{
                  padding: '0.6rem 1.15rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleTriggerScan(selectedScanRepoId)}
                disabled={!selectedScanRepoId || scanningRepoId !== null}
                className="btn-primary-gradient"
                style={{
                  padding: '0.6rem 1.35rem',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: !selectedScanRepoId || scanningRepoId !== null ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {scanningRepoId ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
                <span>{scanningRepoId ? 'Running Scanners...' : 'Start Scan Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
