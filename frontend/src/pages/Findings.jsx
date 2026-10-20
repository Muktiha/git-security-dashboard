import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, 
  KeyRound, 
  Search, 
  FileCode, 
  EyeOff, 
  ShieldCheck, 
  RefreshCw, 
  AlertCircle,
  FolderGit2,
  Calendar,
  ExternalLink,
  Package,
  FileDown,
  ArrowLeft,
  X,
  CheckCircle2, 
  AlertTriangle,
  Wrench,
  Edit3,
  Clock,
  MessageSquare,
  History
} from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const formatDetectedAt = (dateStr) => {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return d.toLocaleDateString();
  } catch {
    return 'Recently';
  }
};

export default function Findings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const scanIdParam = searchParams.get('scanId');
  const repoIdParam = searchParams.get('repoId');

  const [findings, setFindings] = useState([]);
  const [repositories, setRepositories] = useState([]);
  const [selectedRepoId, setSelectedRepoId] = useState(repoIdParam || 'ALL');
  const [selectedScan, setSelectedScan] = useState(null);
  const [selectedScanRepo, setSelectedScanRepo] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scanNotFound, setScanNotFound] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Status Update Modal State
  const [statusModalFinding, setStatusModalFinding] = useState(null);
  const [modalStatus, setModalStatus] = useState('OPEN');
  const [modalNote, setModalNote] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusSuccessMsg, setStatusSuccessMsg] = useState('');

  // PDF Export Feedback State
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [pdfNotification, setPdfNotification] = useState(null);

  const token = localStorage.getItem('token');

  // Fetch Findings from backend (either scan-specific or collection)
  const fetchFindings = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      setScanNotFound(false);

      if (scanIdParam) {
        // Fetch findings for this specific scan
        const response = await api.get(`/findings?scanId=${scanIdParam}`);
        if (response.data && response.data.success) {
          setFindings(Array.isArray(response.data.findings) ? response.data.findings : []);
          setSelectedScan(response.data.scan || null);
          setSelectedScanRepo(response.data.repository || null);
          setRepositories(Array.isArray(response.data.repositories) ? response.data.repositories : []);
          if (response.data.repository?._id) {
            setSelectedRepoId(String(response.data.repository._id));
          }
        }
      } else {
        // Fetch all findings or repository-filtered findings
        setSelectedScan(null);
        setSelectedScanRepo(null);

        const url = selectedRepoId !== 'ALL'
          ? `/findings?repositoryId=${selectedRepoId}`
          : '/findings';

        const response = await api.get(url);
        if (response.data && response.data.success) {
          setFindings(Array.isArray(response.data.findings) ? response.data.findings : []);
          setRepositories(Array.isArray(response.data.repositories) ? response.data.repositories : []);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch security findings.';
      setError(msg);
      if (err.response?.status === 404 || err.response?.status === 400) {
        setScanNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFindings();
  }, [scanIdParam, selectedRepoId]);

  // Identify failed scans to warn user
  const relevantRepos = selectedScanRepo
    ? [selectedScanRepo]
    : selectedRepoId === 'ALL'
    ? repositories
    : repositories.filter((r) => String(r._id) === selectedRepoId);

  const failedRepos = relevantRepos.filter((r) => r.latestScan?.status === 'FAILED');
  const completedReposWithScans = relevantRepos.filter((r) => r.latestScan?.status === 'COMPLETED');
  const hasEverScanned = Boolean(selectedScan) || relevantRepos.some((r) => r.lastScannedAt !== null);

  // Filter findings based on active tab, status, severity, and search query (Memoized)
  const filteredFindings = useMemo(() => {
    return findings.filter((finding) => {
      // If not in single-scan mode and repository filter is active
      if (!selectedScan && selectedRepoId !== 'ALL') {
        const findingRepoId = finding.repositoryId?._id || finding.repositoryId?.id || finding.repositoryId;
        if (String(findingRepoId) !== selectedRepoId) {
          return false;
        }
      }

      const isSecret = finding.scanner === 'GITLEAKS' || (finding.type && finding.type.toLowerCase().includes('secret'));
      const isVuln = finding.scanner === 'TRIVY' || (finding.type && finding.type.toLowerCase().includes('vuln'));

      if (filter === 'SECRETS' && !isSecret) return false;
      if (filter === 'VULNERABILITIES' && !isVuln) return false;
      if (filter === 'CRITICAL' && finding.severity !== 'CRITICAL') return false;

      // Status filter
      const currentStatus = finding.status || 'OPEN';
      if (statusFilter !== 'ALL' && currentStatus !== statusFilter) {
        return false;
      }

      // Severity filter
      if (severityFilter !== 'ALL' && (finding.severity || '').toUpperCase() !== severityFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const repoName = finding.repositoryId 
          ? `${finding.repositoryId.owner || ''}/${finding.repositoryId.name || ''}`.toLowerCase()
          : '';
        const matchTitle = (finding.title || '').toLowerCase().includes(query);
        const matchFile = (finding.file || '').toLowerCase().includes(query);
        const matchId = (finding.identifier || '').toLowerCase().includes(query);
        const matchRepo = repoName.includes(query);
        const matchDesc = (finding.description || '').toLowerCase().includes(query);
        const matchRemediation = (finding.remediation || '').toLowerCase().includes(query);
        const matchStatus = currentStatus.toLowerCase().includes(query);
        const matchNote = (finding.remediationNote || '').toLowerCase().includes(query);

        if (!matchTitle && !matchFile && !matchId && !matchRepo && !matchDesc && !matchRemediation && !matchStatus && !matchNote) {
          return false;
        }
      }

      return true;
    });
  }, [findings, selectedScan, selectedRepoId, filter, statusFilter, severityFilter, searchQuery]);

  // High-performance client-side pagination: 20 cards per page
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Reset to first page when any search/filter criteria changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, statusFilter, severityFilter, searchQuery, selectedRepoId, scanIdParam]);

  const totalPages = Math.max(1, Math.ceil(filteredFindings.length / itemsPerPage));
  const paginatedFindings = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredFindings.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredFindings, currentPage]);

  const handleOpenStatusModal = (finding) => {
    setStatusModalFinding(finding);
    setModalStatus(finding.status || 'OPEN');
    setModalNote(finding.remediationNote || '');
    setStatusSuccessMsg('');
  };

  const handleSaveStatus = async (e) => {
    if (e) e.preventDefault();
    if (!statusModalFinding) return;

    try {
      setSavingStatus(true);
      const res = await api.patch(`/findings/${statusModalFinding._id}/status`, {
        status: modalStatus,
        note: modalNote,
      });

      if (res.data && res.data.success) {
        setFindings((prev) =>
          prev.map((f) => (f._id === statusModalFinding._id ? res.data.finding : f))
        );
        setStatusModalFinding(res.data.finding);
        setStatusSuccessMsg(`Status updated to "${modalStatus}" successfully!`);
        setTimeout(() => {
          setStatusModalFinding(null);
          setStatusSuccessMsg('');
        }, 1500);
      }
    } catch (err) {
      console.error('[Update Status Error]', err);
      alert(err.response?.data?.message || 'Failed to update finding status.');
    } finally {
      setSavingStatus(false);
    }
  };

  // Handle PDF Export
  const handleDownloadPDF = async (reportType = 'auto') => {
    try {
      setPdfDownloading(true);
      setPdfNotification(null);

      // Determine target repository and scan
      let targetRepo = selectedScanRepo;
      let targetScan = selectedScan;

      if (!targetRepo && selectedRepoId !== 'ALL') {
        targetRepo = repositories.find((r) => String(r._id) === selectedRepoId) || null;
        targetScan = targetRepo?.latestScan || null;
      }

      const activeFilterLabel = filter === 'SECRETS'
        ? 'Secrets Only (Gitleaks)'
        : filter === 'VULNERABILITIES'
        ? 'Vulnerabilities Only (Trivy)'
        : filter === 'CRITICAL'
        ? 'Critical Severity Only'
        : 'All Findings';

      const { downloadSecurityReportPDF } = await import('../utils/pdfGenerator');
      const filename = downloadSecurityReportPDF({
        findings: filteredFindings,
        repository: targetRepo,
        scan: targetScan,
        reportTitle: selectedScan ? `Scan Report: ${targetRepo?.name || 'Repository'}` : 'Consolidated Security Report',
        filterName: activeFilterLabel,
        searchQuery: searchQuery.trim(),
      });

      setPdfNotification({
        type: 'success',
        message: `Report exported successfully as "${filename}".`,
      });

      setTimeout(() => {
        setPdfNotification(null);
      }, 5000);
    } catch (pdfErr) {
      console.error('[PDF Export Error]', pdfErr);
      setPdfNotification({
        type: 'error',
        message: `Failed to generate PDF report: ${pdfErr.message}`,
      });
    } finally {
      setPdfDownloading(false);
    }
  };

  // Clear single-scan view and return to full findings list
  const handleClearScanFilter = () => {
    setSearchParams({});
    setSelectedScan(null);
    setSelectedScanRepo(null);
    setSelectedRepoId('ALL');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {selectedScan && (
              <button
                onClick={handleClearScanFilter}
                title="Back to all findings"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {selectedScan ? 'Scan Security Findings' : 'Security Findings'}
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {selectedScan
              ? `Inspection findings for scan ${selectedScan._id.slice(-8)} on repository ${selectedScanRepo?.name || ''}`
              : 'Consolidated findings from Gitleaks (secret detection) and Trivy (vulnerability analysis).'}
          </p>
        </div>

        {/* Action Buttons: Download PDF and Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleDownloadPDF('auto')}
            disabled={pdfDownloading || loading}
            title="Download PDF report of current findings"
            className="btn-primary-gradient"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: pdfDownloading || loading ? 'not-allowed' : 'pointer',
              border: 'none',
            }}
          >
            {pdfDownloading ? (
              <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <FileDown size={15} />
            )}
            <span>
              {pdfDownloading 
                ? 'Generating PDF...' 
                : selectedScan 
                ? 'Download Scan Report (PDF)' 
                : selectedRepoId !== 'ALL'
                ? 'Download Repo Report (PDF)'
                : 'Download PDF Report'}
            </span>
          </button>

          <button
            onClick={fetchFindings}
            disabled={loading}
            title="Refresh findings from database"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.15rem',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.12)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)';
              }
            }}
          >
            <RefreshCw size={15} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* PDF Export Feedback Alert */}
      {pdfNotification && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          backgroundColor: pdfNotification.type === 'success' ? 'var(--status-success-bg)' : 'var(--severity-critical-bg)',
          border: `1px solid ${pdfNotification.type === 'success' ? 'var(--status-success-border)' : 'var(--severity-critical-border)'}`,
          borderRadius: '8px',
          color: pdfNotification.type === 'success' ? 'var(--status-success)' : 'var(--severity-critical)',
          fontSize: '0.85rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {pdfNotification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{pdfNotification.message}</span>
          </div>
          <button
            onClick={() => setPdfNotification(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              display: 'flex',
              padding: '0.2rem',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Auth Notice if not logged in */}
      {!token && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.25rem',
          backgroundColor: 'var(--severity-medium-bg)',
          border: '1px solid var(--severity-medium-border)',
          borderRadius: '8px',
          color: 'var(--severity-medium)',
          fontSize: '0.875rem',
        }}>
          <div>
            <strong>Authentication required:</strong> Sign in to view security findings for your repositories.
          </div>
          <Link
            to="/login"
            style={{
              padding: '0.4rem 0.85rem',
              backgroundColor: 'var(--accent-cyan)',
              color: '#ffffff',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.8rem',
              textDecoration: 'none',
            }}
          >
            Sign In
          </Link>
        </div>
      )}

      {/* Invalid Scan / Non-existent Record Error Handling */}
      {scanNotFound && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          padding: '1.5rem',
          backgroundColor: 'var(--severity-critical-bg)',
          border: '1px solid var(--severity-critical-border)',
          borderRadius: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--severity-critical)', fontWeight: 700, fontSize: '1rem' }}>
            <AlertCircle size={20} />
            <span>Scan Record Not Found</span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            The requested scan ID <code>{scanIdParam}</code> could not be found, or you do not have permission to view it.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={14} />
              <span>Return to Dashboard</span>
            </button>
            <button
              onClick={handleClearScanFilter}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--accent-cyan)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              <span>View All Security Findings</span>
            </button>
          </div>
        </div>
      )}

      {/* General Error Banner */}
      {error && !scanNotFound && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--severity-critical-bg)',
          border: '1px solid var(--severity-critical-border)',
          borderRadius: '8px',
          color: 'var(--severity-critical)',
          fontSize: '0.85rem',
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Selected Scan Context Card */}
      {selectedScan && (
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FolderGit2 size={20} color="var(--accent-cyan)" />
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedScanRepo?.owner ? `${selectedScanRepo.owner}/${selectedScanRepo.name}` : selectedScanRepo?.name || 'Target Repository'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                  <span>Branch: <strong>{selectedScanRepo?.branch || 'main'}</strong></span>
                  <span>•</span>
                  <span>Scanned: {formatDetectedAt(selectedScan.completedAt || selectedScan.createdAt)}</span>
                  {selectedScan.duration > 0 && <span>• Duration: {selectedScan.duration}s</span>}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: selectedScan.status === 'COMPLETED' ? 'var(--status-success-bg)' : 'var(--severity-critical-bg)',
                color: selectedScan.status === 'COMPLETED' ? 'var(--status-success)' : 'var(--severity-critical)',
                border: `1px solid ${selectedScan.status === 'COMPLETED' ? 'var(--status-success-border)' : 'var(--severity-critical-border)'}`,
              }}>
                {selectedScan.status}
              </span>
              <button
                onClick={handleClearScanFilter}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Clear Filter
              </button>
            </div>
          </div>

          {/* Severity Counts Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-color)',
          }}>
            <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TOTAL FINDINGS</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedScan.totalFindings || 0}</div>
            </div>
            <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--severity-critical-bg)', border: '1px solid var(--severity-critical-border)', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--severity-critical)' }}>CRITICAL</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--severity-critical)' }}>{selectedScan.criticalCount || 0}</div>
            </div>
            <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--severity-high-bg)', border: '1px solid var(--severity-high-border)', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--severity-high)' }}>HIGH</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--severity-high)' }}>{selectedScan.highCount || 0}</div>
            </div>
            <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--severity-medium-bg)', border: '1px solid var(--severity-medium-border)', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--severity-medium)' }}>MEDIUM</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--severity-medium)' }}>{selectedScan.mediumCount || 0}</div>
            </div>
            <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--severity-low-bg)', border: '1px solid var(--severity-low-border)', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--severity-low)' }}>LOW</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--severity-low)' }}>{selectedScan.lowCount || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* Failed Scan Alert */}
      {!selectedScan && failedRepos.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          padding: '1rem 1.25rem',
          backgroundColor: 'var(--severity-critical-bg)',
          border: '1px solid var(--severity-critical-border)',
          borderRadius: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--severity-critical)', fontWeight: 700, fontSize: '0.95rem' }}>
            <AlertCircle size={18} />
            <span>Scan failed on tracked repository</span>
          </div>
          {failedRepos.map((r) => (
            <div key={r._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.85rem' }}>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>{r.name}</strong> ({r.url}):{' '}
                <span style={{ color: 'var(--severity-critical)' }}>
                  {r.latestScan?.failureReason || 'Security scanner encountered an execution error.'}
                </span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Notice: An empty findings list cannot be treated as clean posture because this scan did not complete successfully.
                </div>
              </div>
              <Link
                to="/repositories"
                style={{
                  padding: '0.35rem 0.75rem',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--severity-critical-border)',
                  color: 'var(--severity-critical)',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textDecoration: 'none',
                }}
              >
                Go to Repositories & Retry
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Filter Tabs, Repository Selector, and Search */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}>
        {/* Severity / Type Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All Findings' },
            { id: 'SECRETS', label: 'Secrets (Gitleaks)' },
            { id: 'VULNERABILITIES', label: 'Vulnerabilities (Trivy)' },
            { id: 'CRITICAL', label: 'Critical Severity' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                backgroundColor: filter === tab.id ? 'var(--accent-cyan)' : 'var(--bg-card)',
                color: filter === tab.id ? '#ffffff' : 'var(--text-secondary)',
                border: filter === tab.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                transition: 'all 0.15s ease',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status, Severity & Repository Filter Dropdowns & Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            title="Filter by Vulnerability Lifecycle Status"
            style={{
              padding: '0.45rem 0.75rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">🔴 Open</option>
            <option value="IN_PROGRESS">🔵 In Progress</option>
            <option value="RESOLVED">🟢 Resolved</option>
            <option value="ACCEPTED_RISK">🟣 Accepted Risk</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            title="Filter by Severity Level"
            style={{
              padding: '0.45rem 0.75rem',
              backgroundColor: 'var(--bg-card)',
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

          {!selectedScan && repositories.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FolderGit2 size={16} color="var(--text-muted)" />
              <select
                value={selectedRepoId}
                onChange={(e) => setSelectedRepoId(e.target.value)}
                style={{
                  padding: '0.45rem 0.85rem',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Repositories ({repositories.length})</option>
                {repositories.map((repo) => (
                  <option key={repo._id} value={repo._id}>
                    {repo.name} ({repo.branch || 'main'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.45rem 0.85rem',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            width: '240px',
          }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search findings or packages..."
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>
        </div>
      </div>

      {/* Findings Content Area */}
      {loading ? (
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '3.5rem',
          textAlign: 'center',
          color: 'var(--text-secondary)',
        }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
          <div>Loading security findings from database...</div>
        </div>
      ) : filteredFindings.length === 0 ? (
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '3.5rem 1.5rem',
          textAlign: 'center',
        }}>
          {searchQuery || filter !== 'ALL' ? (
            <>
              <Search size={44} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                No matching security findings
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
                Try adjusting your search keywords or switching to another filter tab.
              </p>
            </>
          ) : selectedScan && selectedScan.status === 'FAILED' ? (
            <>
              <AlertCircle size={48} color="var(--severity-critical)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--severity-critical)', marginBottom: '0.5rem' }}>
                Scan failed
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto 1.5rem auto' }}>
                {selectedScan.failureReason || 'The security scan failed to complete. An empty result cannot be displayed as proof that the repository is clean.'}
              </p>
              <Link
                to="/repositories"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.55rem 1.1rem',
                  backgroundColor: 'var(--accent-cyan)',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                }}
              >
                <span>Retry Scan in Repositories</span>
              </Link>
            </>
          ) : !hasEverScanned && completedReposWithScans.length === 0 && failedRepos.length === 0 ? (
            <>
              <FolderGit2 size={44} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                No Scans Executed Yet
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
                Add your Git repository and trigger a scan to detect exposed credentials and vulnerabilities.
              </p>
              <Link
                to="/repositories"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.55rem 1.1rem',
                  backgroundColor: 'var(--accent-cyan)',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                }}
              >
                <span>Go to Repositories</span>
              </Link>
            </>
          ) : (
            <>
              <ShieldCheck size={48} color="var(--status-success)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                No findings detected in this scan
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
                All automated Gitleaks secret pattern checks and Trivy vulnerability evaluations completed successfully with 0 security findings detected.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleDownloadPDF('auto')}
                  disabled={pdfDownloading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.55rem 1.1rem',
                    backgroundColor: 'var(--accent-cyan)',
                    color: '#ffffff',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <FileDown size={15} />
                  <span>Download Clean Report (PDF)</span>
                </button>
                <Link
                  to="/repositories"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.55rem 1.1rem',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                  }}
                >
                  <span>View Tracked Repositories</span>
                </Link>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {paginatedFindings.map((finding) => {
            const isSecret = finding.scanner === 'GITLEAKS' || (finding.type && finding.type.toLowerCase().includes('secret'));
            const repoName = finding.repositoryId 
              ? `${finding.repositoryId.owner || ''}/${finding.repositoryId.name || ''}`
              : 'Repository';
            const scannerLabel = finding.scanner === 'GITLEAKS' ? 'Gitleaks' : finding.scanner === 'TRIVY' ? 'Trivy' : finding.scanner;
            const scanDate = finding.scanId?.completedAt || finding.createdAt;

            return (
              <div
                key={finding._id || finding.id}
                className="card-prismatic"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '1.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  boxShadow: 'var(--card-shadow)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: finding.severity === 'CRITICAL' 
                        ? 'var(--severity-critical-bg)' 
                        : finding.severity === 'HIGH' 
                        ? 'var(--severity-high-bg)' 
                        : finding.severity === 'MEDIUM'
                        ? 'var(--severity-medium-bg)'
                        : 'var(--severity-low-bg)',
                      color: finding.severity === 'CRITICAL' 
                        ? 'var(--severity-critical)' 
                        : finding.severity === 'HIGH' 
                        ? 'var(--severity-high)' 
                        : finding.severity === 'MEDIUM'
                        ? 'var(--severity-medium)'
                        : 'var(--severity-low)',
                      border: `1px solid ${
                        finding.severity === 'CRITICAL' 
                          ? 'var(--severity-critical-border)' 
                          : finding.severity === 'HIGH' 
                          ? 'var(--severity-high-border)' 
                          : finding.severity === 'MEDIUM' 
                          ? 'var(--severity-medium-border)'
                          : 'var(--severity-low-border)'
                      }`,
                    }}>
                      {finding.severity}
                    </span>

                    {/* Status Badge */}
                    {(() => {
                      const st = finding.status || 'OPEN';
                      const stColors = {
                        OPEN: { bg: 'var(--severity-critical-bg)', color: 'var(--severity-critical)', border: 'var(--severity-critical-border)', label: 'OPEN' },
                        IN_PROGRESS: { bg: 'var(--badge-info-bg)', color: 'var(--badge-info-text)', border: 'var(--badge-info-border)', label: 'IN PROGRESS' },
                        RESOLVED: { bg: 'var(--status-success-bg)', color: 'var(--status-success)', border: 'var(--status-success-border)', label: 'RESOLVED' },
                        ACCEPTED_RISK: { bg: '#f5f3ff', color: 'var(--accent-violet)', border: '#ddd6fe', label: 'ACCEPTED RISK' },
                      };
                      const conf = stColors[st] || stColors.OPEN;
                      return (
                        <span style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: conf.bg,
                          color: conf.color,
                          border: `1px solid ${conf.border}`,
                          letterSpacing: '0.02em',
                        }}>
                          {conf.label}
                        </span>
                      );
                    })()}

                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      color: isSecret ? 'var(--severity-secret)' : 'var(--accent-cyan)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}>
                      {isSecret ? <KeyRound size={12} /> : <ShieldAlert size={12} />}
                      {scannerLabel}
                    </span>

                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {finding.title}
                    </h3>
                  </div>

                  {/* Right Header Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      onClick={() => handleOpenStatusModal(finding)}
                      title="Update Vulnerability Lifecycle Status & Remediation Notes"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--accent-cyan)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--accent-cyan-glow)';
                        e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                      }}
                    >
                      <Edit3 size={13} />
                      <span>Update Status</span>
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <Calendar size={13} />
                      <span>{formatDetectedAt(scanDate)}</span>
                    </div>
                  </div>
                </div>

                {/* Context details: Repository, File, Affected Package */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '1.25rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <FolderGit2 size={14} color="var(--text-muted)" />
                    <span>Repository: <strong style={{ color: 'var(--text-primary)' }}>{repoName}</strong></span>
                  </div>

                  {finding.file && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <FileCode size={14} color="var(--text-muted)" />
                      <span>File: <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{finding.file}{finding.line ? `:${finding.line}` : ''}</span></span>
                    </div>
                  )}

                  {finding.identifier && !isSecret && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Package size={14} color="var(--text-muted)" />
                      <span>Vulnerability / CVE: <strong style={{ color: 'var(--text-primary)' }}>{finding.identifier}</strong></span>
                    </div>
                  )}
                </div>

                {/* Description text */}
                {finding.description && !isSecret && (
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {finding.description}
                  </div>
                )}

                {/* Remediation Note Banner (if user documented any) */}
                {finding.remediationNote && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                    backgroundColor: 'var(--status-success-bg)',
                    border: '1px solid var(--status-success-border)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                  }}>
                    <MessageSquare size={14} color="var(--status-success)" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                    <div>
                      <strong style={{ color: 'var(--status-success)' }}>Remediation Note: </strong>
                      <span>{finding.remediationNote}</span>
                    </div>
                  </div>
                )}

                {/* Recommended Remediation Section */}
                {finding.remediation && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                    backgroundColor: 'var(--badge-info-bg)',
                    border: '1px solid var(--badge-info-border)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                  }}>
                    <Wrench size={14} color="var(--accent-cyan)" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                    <div>
                      <strong style={{ color: 'var(--accent-cyan)' }}>Scanner Remediation: </strong>
                      <span>{finding.remediation}</span>
                    </div>
                  </div>
                )}

                {/* Masked Secret Alert if Secret Leak */}
                {isSecret && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: 'var(--severity-secret-bg)',
                    border: '1px solid var(--severity-secret-border)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                    color: 'var(--text-primary)',
                  }}>
                    <EyeOff size={14} color="var(--severity-secret)" />
                    <span style={{ color: 'var(--text-muted)' }}>Masked Secret:</span>
                    <span style={{ color: 'var(--severity-secret)', fontWeight: 600 }}>
                      {finding.description && finding.description.includes('Match:')
                        ? finding.description.split('Match:')[1].trim()
                        : '****************'}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Rule: {finding.identifier || 'Secret Detection'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* High-Performance Pagination Toolbar */}
        {filteredFindings.length > itemsPerPage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.25rem',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginTop: '1rem',
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Showing <strong style={{ color: 'var(--text-primary)' }}>{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong style={{ color: 'var(--text-primary)' }}>{Math.min(currentPage * itemsPerPage, filteredFindings.length)}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{filteredFindings.length}</strong> findings
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '0.35rem 0.75rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0 0.5rem' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '0.35rem 0.75rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </>
    )}

      {/* Vulnerability Lifecycle Status & Remediation Note Modal */}
      {statusModalFinding && (
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
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Update Finding Status
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Vulnerability Lifecycle Management
                </div>
              </div>
              <button
                onClick={() => setStatusModalFinding(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem', borderRadius: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {statusSuccessMsg && (
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                color: '#059669',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}>
                ✓ {statusSuccessMsg}
              </div>
            )}

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                Finding
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {statusModalFinding.title}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                {statusModalFinding.file || statusModalFinding.identifier}
              </div>
            </div>

            <form onSubmit={handleSaveStatus} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Lifecycle Status
                </label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="OPEN">🔴 Open (Triage Required)</option>
                  <option value="IN_PROGRESS">🔵 In Progress (Under Remediation)</option>
                  <option value="RESOLVED">🟢 Resolved (Patched / Fixed)</option>
                  <option value="ACCEPTED_RISK">🟣 Accepted Risk (Mitigating Controls Active)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Remediation Note & Justification
                </label>
                <textarea
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value)}
                  placeholder="Document PR fix link, mitigation rationale, or secret rotation details..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Status History Audit Trail */}
              {statusModalFinding.statusHistory && statusModalFinding.statusHistory.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <History size={13} />
                    <span>Audit Trail / History</span>
                  </div>
                  <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {statusModalFinding.statusHistory.slice().reverse().map((h, i) => (
                      <div key={i} style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '0.75rem', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)', fontWeight: 600 }}>
                          <span>Status set to [{h.status}]</span>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{new Date(h.changedAt).toLocaleString()}</span>
                        </div>
                        {h.note && (
                          <div style={{ color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                            "{h.note}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setStatusModalFinding(null)}
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
                  disabled={savingStatus}
                  className="btn-primary-gradient"
                  style={{
                    padding: '0.6rem 1.35rem',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: savingStatus ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingStatus ? 'Saving...' : 'Save Status & Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
