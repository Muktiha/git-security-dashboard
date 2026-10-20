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
import { downloadExecutiveDashboardPDF } from '../utils/pdfGenerator';

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
  const handleDownloadExecutiveSummary = () => {
    try {
      setPdfDownloading(true);
      setPdfFeedback(null);

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
          backgroundColor: '#1e293b',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '0.5rem 0.75rem',
          fontSize: '0.75rem',
          color: '#f8fafc',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.4)',
        }}>
          <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{label || payload[0]?.name}</p>
          {payload.map((item, idx) => (
            <p key={idx} style={{ color: item.color || item.fill || '#38bdf8', margin: '0.15rem 0' }}>
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
      {/* 1. Command Center Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'var(--accent-cyan-glow)',
              border: '1px solid var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)',
            }}>
              <Activity size={18} />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              DevSecOps Security Command Center
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Continuous vulnerability orchestration, automated secret leak interception, and hygiene SLA telemetry for open-source government codebases.
          </p>
        </div>

        {/* Quick Actions Header Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* Quick Scan Action */}
          <button
            onClick={() => setShowQuickScanModal(true)}
            title="Trigger an automated security scan"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              backgroundColor: 'var(--accent-cyan)',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.825rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(6, 182, 212, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <Play size={14} />
            <span>Start Scan</span>
          </button>

          {/* Add Repository Action */}
          <button
            onClick={() => setShowAddRepoModal(true)}
            title="Register a new GitHub repository"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.825rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={14} color="var(--accent-cyan)" />
            <span>Add Repository</span>
          </button>

          {/* View Critical Findings */}
          <Link
            to="/findings?severity=CRITICAL&status=OPEN"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: 'var(--severity-critical)',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.825rem',
              textDecoration: 'none',
            }}
          >
            <ShieldAlert size={14} />
            <span>View Critical ({data.stats?.openCriticalFindings || 0})</span>
          </Link>

          {/* Download Security Summary */}
          <button
            onClick={handleDownloadExecutiveSummary}
            disabled={pdfDownloading || loading}
            title="Export DevSecOps Executive Security Summary PDF"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.825rem',
              cursor: pdfDownloading || loading ? 'not-allowed' : 'pointer',
            }}
          >
            {pdfDownloading ? (
              <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <FileDown size={14} />
            )}
            <span>Export Executive PDF</span>
          </button>
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
            ? 'rgba(16, 185, 129, 0.15)' 
            : scanBannerMsg.type === 'error' 
            ? 'rgba(239, 68, 68, 0.15)' 
            : 'rgba(14, 165, 233, 0.15)',
          border: `1px solid ${
            scanBannerMsg.type === 'success' 
              ? 'rgba(16, 185, 129, 0.3)' 
              : scanBannerMsg.type === 'error' 
              ? 'rgba(239, 68, 68, 0.3)' 
              : 'rgba(14, 165, 233, 0.3)'
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
          backgroundColor: pdfFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${pdfFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
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
        gap: '1rem',
      }}>
        {/* Card 1: Health Score */}
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
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Security Health Score
            </span>
            <ShieldCheck size={18} color="var(--accent-cyan)" />
          </div>
          <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {loading ? '-' : data.stats?.healthScore || '100%'}
            </span>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.15rem 0.45rem',
              borderRadius: '4px',
              backgroundColor: (data.stats?.healthScoreNumber ?? 100) >= 90 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: (data.stats?.healthScoreNumber ?? 100) >= 90 ? 'var(--status-success)' : 'var(--severity-critical)',
            }}>
              Grade {data.stats?.healthGrade || 'A'}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            {data.stats?.healthLabel || 'Clean posture'}
          </div>
        </div>

        {/* Card 2: Open Critical Findings */}
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
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--severity-critical)' }}>
              Open Critical Findings
            </span>
            <ShieldAlert size={18} color="var(--severity-critical)" />
          </div>
          <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--severity-critical)' }}>
              {loading ? '-' : data.stats?.openCriticalFindings ?? 0}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>urgent</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            {data.stats?.exposedSecrets ?? 0} exposed secrets • {data.stats?.criticalCVEs ?? 0} critical CVEs
          </div>
        </div>

        {/* Card 3: Total Unresolved Findings */}
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
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--severity-high)' }}>
              Total Unresolved Issues
            </span>
            <AlertTriangle size={18} color="var(--severity-high)" />
          </div>
          <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {loading ? '-' : data.stats?.unresolvedFindings ?? 0}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>open / in progress</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Across all active repository scans
          </div>
        </div>

        {/* Card 4: Resolved Findings */}
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
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--status-success)' }}>
              Resolved Vulnerabilities
            </span>
            <CheckCircle2 size={18} color="var(--status-success)" />
          </div>
          <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-success)' }}>
              {loading ? '-' : data.stats?.resolvedFindings ?? 0}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ({(data.stats?.totalFindings || 0) > 0 ? Math.round(((data.stats?.resolvedFindings || 0) / data.stats?.totalFindings) * 100) : 100}% rate)
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Patched credentials & dependencies
          </div>
        </div>

        {/* Card 5: Repositories & Scan Hygiene */}
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
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Scan Hygiene & Freshness
            </span>
            <FolderGit2 size={18} color="var(--accent-cyan)" />
          </div>
          <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {loading ? '-' : data.stats?.totalRepositories ?? 0}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>repositories</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'flex', gap: '0.5rem' }}>
            <span style={{ color: 'var(--status-success)', fontWeight: 600 }}>{data.stats?.freshness?.fresh || 0} Fresh</span>
            <span>•</span>
            <span style={{ color: data.stats?.freshness?.stale > 0 ? 'var(--severity-high)' : 'var(--text-muted)' }}>{data.stats?.freshness?.stale || 0} Stale</span>
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
                        ? 'rgba(239, 68, 68, 0.35)' 
                        : item.priority === 'HIGH' 
                        ? 'rgba(249, 115, 22, 0.35)' 
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
                        backgroundColor: item.priority === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' : item.priority === 'HIGH' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(14, 165, 233, 0.2)',
                        color: item.priority === 'CRITICAL' ? 'var(--severity-critical)' : item.priority === 'HIGH' ? 'var(--severity-high)' : 'var(--accent-cyan)',
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
                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--severity-critical)' }}>
                    {data.latestScanComparison.newCount}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Newly Detected</div>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--status-success)' }}>
                    {data.latestScanComparison.fixedCount}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Fixed / Patched</div>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.25)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#eab308' }}>
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
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.5rem',
        }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
            Findings Progression Over Time
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Chronological volume of total findings detected in recent scan runs.
          </p>
          <div style={{ height: '220px' }}>
            {(data.trends?.scanTrends || []).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trends.scanTrends} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="totalFindings" name="Total Findings" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="critical" name="Critical" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
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
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.5rem',
        }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
            Active Severity Breakdown
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Impact distribution across unresolved vulnerabilities & secrets.
          </p>
          <div style={{ height: '220px' }}>
            {(data.trends?.severityDistribution || []).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.trends.severityDistribution} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {(data.trends.severityDistribution || []).map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.fill} />
                    ))}
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
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.5rem',
        }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
            Lifecycle Remediation Posture
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Volume of findings active, in progress, resolved, or accepted risk.
          </p>
          <div style={{ height: '220px' }}>
            {(data.trends?.newVsResolvedTrends || []).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.trends.newVsResolvedTrends} layout="vertical" margin={{ top: 5, right: 10, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {(data.trends.newVsResolvedTrends || []).map((entry, idx) => (
                      <Cell key={`cell-l-${idx}`} fill={entry.fill} />
                    ))}
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
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Table Header with Search */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: 'var(--bg-secondary)',
        }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Repository Risk & Freshness Hygiene
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Live posture matrix, vulnerability scores, and scan freshness tracking across monitored repositories.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
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
                            color: repo.score >= 90 ? 'var(--status-success)' : repo.score >= 75 ? '#eab308' : 'var(--severity-critical)',
                          }}>
                            {repo.score}%
                          </span>
                          <span style={{
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            backgroundColor: repo.score >= 90 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
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
                        backgroundColor: repo.openCriticalCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
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
                        backgroundColor: repo.openHighCount > 0 ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
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
                            ? 'rgba(16, 185, 129, 0.15)'
                            : repo.freshness === 'STALE'
                            ? 'rgba(249, 115, 22, 0.15)'
                            : 'rgba(100, 116, 139, 0.15)',
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
                          ? 'rgba(16, 185, 129, 0.12)'
                          : repo.scanStatus === 'FAILED'
                          ? 'rgba(239, 68, 68, 0.12)'
                          : 'rgba(14, 165, 233, 0.12)',
                        color: repo.scanStatus === 'COMPLETED'
                          ? 'var(--status-success)'
                          : repo.scanStatus === 'FAILED'
                          ? 'var(--severity-critical)'
                          : 'var(--accent-cyan)',
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
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Track New Git Repository
              </h3>
              <button
                onClick={() => setShowAddRepoModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {addRepoError && (
              <div style={{
                padding: '0.75rem',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                color: 'var(--severity-critical)',
                fontSize: '0.8rem',
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
                    padding: '0.55rem 1rem',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    borderRadius: '6px',
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
                  style={{
                    padding: '0.55rem 1.25rem',
                    backgroundColor: 'var(--accent-cyan)',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '6px',
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
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '480px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Play size={18} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Launch Security Scan
                </h3>
              </div>
              <button
                onClick={() => setShowQuickScanModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
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
                  padding: '0.55rem 1rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  borderRadius: '6px',
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
                style={{
                  padding: '0.55rem 1.25rem',
                  backgroundColor: 'var(--accent-cyan)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: !selectedScanRepoId || scanningRepoId !== null ? 'not-allowed' : 'pointer',
                }}
              >
                {scanningRepoId ? 'Running Scanners...' : 'Start Scan Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
