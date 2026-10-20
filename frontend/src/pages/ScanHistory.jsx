import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, 
  GitCompare, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  ShieldAlert, 
  AlertCircle, 
  CheckCircle2, 
  FolderGit2, 
  ArrowRight, 
  ExternalLink, 
  RefreshCw,
  PlusCircle,
  MinusCircle,
  HelpCircle,
  Search,
  Filter
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';

export default function ScanHistory() {
  const [searchParams] = useSearchParams();
  const initialRepoId = searchParams.get('repoId') || 'ALL';

  const [activeTab, setActiveTab] = useState('LOGS'); // 'LOGS' | 'COMPARE'
  const [scans, setScans] = useState([]);
  const [repositories, setRepositories] = useState([]);
  const [selectedRepoId, setSelectedRepoId] = useState(initialRepoId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Comparator State
  const [compareRepoId, setCompareRepoId] = useState('');
  const [baseScanId, setBaseScanId] = useState('');
  const [targetScanId, setTargetScanId] = useState('');
  const [comparing, setComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [compareError, setCompareError] = useState('');

  const token = localStorage.getItem('token');

  const fetchData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');

      const [historyRes, reposRes] = await Promise.all([
        api.get('/scans/history'),
        api.get('/repositories'),
      ]);

      if (historyRes.data && historyRes.data.success) {
        setScans(historyRes.data.scans || []);
      }
      if (reposRes.data && reposRes.data.success) {
        const rList = reposRes.data.repositories || [];
        setRepositories(rList);
        if (rList.length > 0 && !compareRepoId) {
          setCompareRepoId(rList[0]._id);
        }
      }
    } catch (err) {
      console.error('[Scan History Fetch Error]', err);
      setError(err.response?.data?.message || 'Failed to load scan history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter scans by repository if selected (Memoized)
  const filteredScans = useMemo(() => {
    return scans.filter((s) => {
      if (selectedRepoId === 'ALL') return true;
      const rId = s.repository?._id || s.repository;
      return String(rId) === selectedRepoId;
    });
  }, [scans, selectedRepoId]);

  // Client-side pagination: 15 scans per page
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRepoId]);

  const totalPages = Math.max(1, Math.ceil(filteredScans.length / itemsPerPage));
  const paginatedScans = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredScans.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredScans, currentPage]);

  // Repositories available for comparison
  const compareRepoScans = useMemo(() => {
    return scans.filter((s) => {
      const rId = s.repository?._id || s.repository;
      return String(rId) === compareRepoId;
    });
  }, [scans, compareRepoId]);

  // Auto-select initial 2 scans for comparison when compareRepoId changes
  useEffect(() => {
    if (compareRepoScans.length >= 2) {
      setBaseScanId(compareRepoScans[1]._id);
      setTargetScanId(compareRepoScans[0]._id);
    } else if (compareRepoScans.length === 1) {
      setBaseScanId(compareRepoScans[0]._id);
      setTargetScanId('');
    } else {
      setBaseScanId('');
      setTargetScanId('');
    }
    setComparisonResult(null);
    setCompareError('');
  }, [compareRepoId, scans]);

  const handleRunComparison = async (e) => {
    if (e) e.preventDefault();
    if (!baseScanId || !targetScanId) {
      setCompareError('Please select both a Base Scan (older) and a Target Scan (newer) to compare.');
      return;
    }

    try {
      setComparing(true);
      setCompareError('');
      setComparisonResult(null);

      const res = await api.post('/scans/compare', {
        baseScanId,
        targetScanId,
      });

      if (res.data && res.data.success) {
        setComparisonResult(res.data.comparison);
      }
    } catch (err) {
      console.error('[Compare Scans Error]', err);
      setCompareError(err.response?.data?.message || 'Failed to compare scans.');
    } finally {
      setComparing(false);
    }
  };

  const handleSelectScanForCompare = (scan) => {
    const rId = scan.repository?._id || scan.repository;
    setCompareRepoId(String(rId));
    setTargetScanId(scan._id);
    setActiveTab('COMPARE');
  };

  const getStatusBadge = (status) => {
    if (status === 'COMPLETED') {
      return (
        <span style={{
          padding: '0.2rem 0.6rem',
          borderRadius: '9999px',
          fontSize: '0.72rem',
          fontWeight: 700,
          backgroundColor: 'var(--status-success-bg)',
          color: 'var(--status-success)',
          border: '1px solid var(--status-success-border)',
        }}>
          COMPLETED
        </span>
      );
    }
    if (status === 'FAILED') {
      return (
        <span style={{
          padding: '0.2rem 0.6rem',
          borderRadius: '9999px',
          fontSize: '0.72rem',
          fontWeight: 700,
          backgroundColor: 'var(--severity-critical-bg)',
          color: 'var(--severity-critical)',
          border: '1px solid var(--severity-critical-border)',
        }}>
          FAILED
        </span>
      );
    }
    return (
      <span style={{
        padding: '0.2rem 0.6rem',
        borderRadius: '9999px',
        fontSize: '0.72rem',
        fontWeight: 700,
        backgroundColor: 'var(--badge-info-bg)',
        color: 'var(--badge-info-text)',
        border: '1px solid var(--badge-info-border)',
      }}>
        RUNNING
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <History size={24} color="var(--accent-cyan)" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Scan History & Comparison
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Audit chronological scan activity, monitor score deltas, and compare consecutive scans to detect fixed and persistent vulnerabilities.
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          padding: '0.3rem',
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}>
          <button
            onClick={() => setActiveTab('LOGS')}
            style={{
              padding: '0.5rem 1.15rem',
              borderRadius: '8px',
              fontSize: '0.825rem',
              fontWeight: 600,
              backgroundColor: activeTab === 'LOGS' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
              color: activeTab === 'LOGS' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              border: activeTab === 'LOGS' ? '1px solid rgba(37, 99, 235, 0.25)' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <History size={15} />
            <span>Scan Log ({scans.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('COMPARE')}
            style={{
              padding: '0.5rem 1.15rem',
              borderRadius: '8px',
              fontSize: '0.825rem',
              fontWeight: 600,
              backgroundColor: activeTab === 'COMPARE' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
              color: activeTab === 'COMPARE' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              border: activeTab === 'COMPARE' ? '1px solid rgba(37, 99, 235, 0.25)' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <GitCompare size={15} />
            <span>Scan Comparator (Diff)</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Scan Log */}
      {activeTab === 'LOGS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Filter Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            backgroundColor: 'var(--bg-card)',
            padding: '0.85rem 1.25rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Filter size={16} color="var(--text-muted)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Repository:</span>
              <select
                value={selectedRepoId}
                onChange={(e) => setSelectedRepoId(e.target.value)}
                style={{
                  padding: '0.45rem 0.85rem',
                  backgroundColor: 'var(--bg-secondary)',
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

            <button
              onClick={fetchData}
              title="Refresh scan history"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.85rem',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
            >
              <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
              <span>Refresh Log</span>
            </button>
          </div>

          {/* Table Container */}
          <div
            className="card-prismatic"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            {filteredScans.length === 0 ? (
              <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <History size={40} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  No scans logged for this selection
                </h4>
                <p style={{ fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto' }}>
                  Execute a security scan from the Repositories page to record audit history.
                </p>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem' }}>REPOSITORY</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem' }}>SCAN DATE</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem' }}>STATUS</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem' }}>DURATION</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem' }}>FINDINGS</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem' }}>SECURITY SCORE</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedScans.map((s) => {
                      const repoName = s.repository?.name || 'Repository';
                      const repoOwner = s.repository?.owner || '';
                      const repoBranch = s.repository?.branch || 'main';

                      return (
                        <tr
                          key={s._id}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {repoOwner ? `${repoOwner}/${repoName}` : repoName}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              branch: {repoBranch}
                            </div>
                          </td>

                          <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Calendar size={13} color="var(--text-muted)" />
                              <span>{new Date(s.completedAt || s.startedAt).toLocaleDateString()}</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {new Date(s.completedAt || s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          <td style={{ padding: '0.85rem 1rem' }}>
                            {getStatusBadge(s.status)}
                            {s.failureReason && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--severity-critical)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.2rem' }} title={s.failureReason}>
                                {s.failureReason}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Clock size={13} color="var(--text-muted)" />
                              <span>{s.duration ? `${s.duration}s` : '1s'}</span>
                            </div>
                          </td>

                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: 700, color: s.totalFindings > 0 ? 'var(--text-primary)' : 'var(--status-success)' }}>
                              {s.totalFindings} {s.totalFindings === 1 ? 'issue' : 'issues'}
                            </div>
                            {s.totalFindings > 0 && (
                              <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.7rem', marginTop: '0.2rem' }}>
                                {s.criticalCount > 0 && <span style={{ color: 'var(--severity-critical)', fontWeight: 600 }}>{s.criticalCount} Crit</span>}
                                {s.highCount > 0 && <span style={{ color: 'var(--severity-high)', fontWeight: 600 }}>{s.highCount} High</span>}
                                {s.mediumCount > 0 && <span style={{ color: 'var(--severity-medium)', fontWeight: 600 }}>{s.mediumCount} Med</span>}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '0.85rem 1rem' }}>
                            {s.status === 'FAILED' ? (
                              <span style={{ fontSize: '0.75rem', color: 'var(--severity-critical)' }}>Unavailable (Scan Failed)</span>
                            ) : s.securityScore !== null ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{
                                  fontWeight: 700,
                                  fontSize: '0.9rem',
                                  color: s.securityScore >= 90 ? 'var(--status-success)' : s.securityScore >= 75 ? 'var(--severity-medium)' : 'var(--severity-critical)',
                                }}>
                                  {s.securityScore}%
                                </span>
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '4px',
                                  backgroundColor: s.securityScore >= 90 ? 'var(--status-success-bg)' : 'var(--severity-critical-bg)',
                                  border: `1px solid ${s.securityScore >= 90 ? 'var(--status-success-border)' : 'var(--severity-critical-border)'}`,
                                  color: s.securityScore >= 90 ? 'var(--status-success)' : 'var(--severity-critical)',
                                }}>
                                  Grade {s.grade}
                                </span>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending</span>
                            )}
                          </td>

                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Link
                                to={`/findings?scanId=${s._id}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '0.35rem 0.65rem',
                                  backgroundColor: 'var(--bg-secondary)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  color: 'var(--accent-cyan)',
                                  textDecoration: 'none',
                                }}
                              >
                                <span>Findings</span>
                                <ExternalLink size={12} />
                              </Link>

                              <button
                                onClick={() => handleSelectScanForCompare(s)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '0.35rem 0.65rem',
                                  backgroundColor: 'var(--bg-secondary)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  color: 'var(--text-secondary)',
                                  cursor: 'pointer',
                                }}
                              >
                                <GitCompare size={12} />
                                <span>Compare</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* High-Performance Pagination Toolbar */}
              {filteredScans.length > itemsPerPage && (
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
                  marginTop: '0.5rem',
                }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Showing <strong style={{ color: 'var(--text-primary)' }}>{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong style={{ color: 'var(--text-primary)' }}>{Math.min(currentPage * itemsPerPage, filteredScans.length)}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{filteredScans.length}</strong> scans
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
          </div>
        </div>
      )}

      {/* Tab 2: Scan Comparator */}
      {activeTab === 'COMPARE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Comparator Selection Form Card */}
          <div
            className="card-prismatic"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Configure Scan Comparison
            </h3>

            {compareError && (
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(251, 113, 133, 0.12)',
                border: '1px solid rgba(251, 113, 133, 0.3)',
                borderRadius: '8px',
                color: '#E11D48',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <AlertCircle size={16} />
                <span>{compareError}</span>
              </div>
            )}

            <form onSubmit={handleRunComparison} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'end' }}>
              {/* Repository Select */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Target Repository
                </label>
                <select
                  value={compareRepoId}
                  onChange={(e) => setCompareRepoId(e.target.value)}
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
                  {repositories.map((repo) => (
                    <option key={repo._id} value={repo._id}>
                      {repo.owner}/{repo.name} ({repo.branch || 'main'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Base Scan (Older) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Base Scan (Older Baseline)
                </label>
                <select
                  value={baseScanId}
                  onChange={(e) => setBaseScanId(e.target.value)}
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
                  <option value="">Select older baseline scan...</option>
                  {compareRepoScans.map((s) => (
                    <option key={s._id} value={s._id}>
                      {new Date(s.completedAt || s.startedAt).toLocaleDateString()} {new Date(s.completedAt || s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({s.status}) - {s.totalFindings} findings
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Scan (Newer) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Target Scan (Newer Evaluation)
                </label>
                <select
                  value={targetScanId}
                  onChange={(e) => setTargetScanId(e.target.value)}
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
                  <option value="">Select newer evaluation scan...</option>
                  {compareRepoScans.map((s) => (
                    <option key={s._id} value={s._id}>
                      {new Date(s.completedAt || s.startedAt).toLocaleDateString()} {new Date(s.completedAt || s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({s.status}) - {s.totalFindings} findings
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={comparing || !baseScanId || !targetScanId || baseScanId === targetScanId}
                  className="btn-primary-gradient"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1rem',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    border: 'none',
                    cursor: comparing || !baseScanId || !targetScanId || baseScanId === targetScanId ? 'not-allowed' : 'pointer',
                    opacity: comparing || !baseScanId || !targetScanId || baseScanId === targetScanId ? 0.6 : 1,
                  }}
                >
                  {comparing ? (
                    <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <GitCompare size={16} />
                  )}
                  <span>{comparing ? 'Analyzing Diff...' : 'Compare Scans'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Comparison Output Results */}
          {comparisonResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Reliability Warning Banner if Target Scan Failed */}
              {!comparisonResult.reliable && (
                <div style={{
                  padding: '1rem 1.25rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  color: 'var(--severity-critical)',
                  fontSize: '0.85rem',
                }}>
                  <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                  <div>
                    <strong>Warning — Incomplete Comparison: </strong>
                    {comparisonResult.warning || 'Target scan failed during execution. Findings absent from the target scan CANNOT be considered fixed.'}
                  </div>
                </div>
              )}

              {/* Metric Delta Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1.25rem',
              }}>
                {/* Score Delta */}
                <div
                  className="card-prismatic"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '14px',
                    padding: '1.35rem',
                    boxShadow: 'var(--card-shadow)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>SECURITY HEALTH SCORE DELTA</div>
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{
                      fontSize: '2rem',
                      fontWeight: 800,
                      color: comparisonResult.scoreDelta === null
                        ? 'var(--text-muted)'
                        : comparisonResult.scoreDelta > 0
                        ? 'var(--status-success)'
                        : comparisonResult.scoreDelta < 0
                        ? 'var(--severity-critical)'
                        : 'var(--text-primary)',
                      letterSpacing: '-0.02em',
                    }}>
                      {comparisonResult.scoreDelta === null
                        ? 'N/A'
                        : comparisonResult.scoreDelta > 0
                        ? `+${comparisonResult.scoreDelta}%`
                        : `${comparisonResult.scoreDelta}%`}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      ({comparisonResult.baseScan.score ?? 'N/A'}% → {comparisonResult.targetScan.score ?? 'N/A'}%)
                    </span>
                  </div>
                </div>

                {/* Newly Introduced Findings */}
                <div
                  className="card-prismatic"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '14px',
                    padding: '1.35rem',
                    boxShadow: 'var(--card-shadow)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#E11D48', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <PlusCircle size={14} />
                    <span>NEWLY DETECTED FINDINGS</span>
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '2rem', fontWeight: 800, color: '#E11D48', letterSpacing: '-0.02em' }}>
                    {comparisonResult.summary.newCount}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Introduced in target scan</div>
                </div>

                {/* Fixed Findings */}
                <div
                  className="card-prismatic"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '14px',
                    padding: '1.35rem',
                    boxShadow: 'var(--card-shadow)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <MinusCircle size={14} />
                    <span>FIXED FINDINGS</span>
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '2rem', fontWeight: 800, color: '#059669', letterSpacing: '-0.02em' }}>
                    {comparisonResult.summary.fixedCount}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Resolved since base scan</div>
                </div>

                {/* Persistent Findings */}
                <div
                  className="card-prismatic"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '14px',
                    padding: '1.35rem',
                    boxShadow: 'var(--card-shadow)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#D97706', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <HelpCircle size={14} />
                    <span>PERSISTENT FINDINGS</span>
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '2rem', fontWeight: 800, color: '#D97706', letterSpacing: '-0.02em' }}>
                    {comparisonResult.summary.persistentCount}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Present across both scans</div>
                </div>
              </div>

              {/* Categorized Findings Lists */}
              {/* 1. Newly Detected List */}
              {comparisonResult.newlyDetected.length > 0 && (
                <div style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--severity-critical-border)',
                  borderRadius: '10px',
                  padding: '1.25rem',
                }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--severity-critical)', marginBottom: '0.75rem' }}>
                    🔴 Newly Detected Findings ({comparisonResult.newlyDetected.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {comparisonResult.newlyDetected.map((f, i) => (
                      <div key={i} style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>{f.title}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {f.file ? `${f.file}${f.line ? `:${f.line}` : ''}` : f.identifier}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--severity-critical)' }}>
                          {f.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Fixed Findings List */}
              {comparisonResult.fixed.length > 0 && (
                <div style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--status-success-border)',
                  borderRadius: '10px',
                  padding: '1.25rem',
                }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--status-success)', marginBottom: '0.75rem' }}>
                    🟢 Fixed Findings ({comparisonResult.fixed.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {comparisonResult.fixed.map((f, i) => (
                      <div key={i} style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>{f.title}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {f.file ? `${f.file}${f.line ? `:${f.line}` : ''}` : f.identifier}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--status-success)' }}>
                          FIXED
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Persistent Findings List */}
              {comparisonResult.persistent.length > 0 && (
                <div style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--severity-medium-border)',
                  borderRadius: '10px',
                  padding: '1.25rem',
                }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--severity-medium)', marginBottom: '0.75rem' }}>
                    🟡 Persistent Findings ({comparisonResult.persistent.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {comparisonResult.persistent.map((f, i) => (
                      <div key={i} style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>{f.title}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {f.file ? `${f.file}${f.line ? `:${f.line}` : ''}` : f.identifier}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--severity-medium)' }}>
                          PERSISTENT
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
