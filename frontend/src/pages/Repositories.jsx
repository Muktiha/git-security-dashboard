import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  Plus, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  X, 
  AlertCircle, 
  FolderGit2, 
  Lock, 
  Globe 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const GITHUB_REPO_REGEX = /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git|\/)?$/;

export default function Repositories() {
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [visibility, setVisibility] = useState('public');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Scanning State
  const [scanningMap, setScanningMap] = useState({});
  const [scanNotification, setScanNotification] = useState(null);
  const [repoErrors, setRepoErrors] = useState({});

  const token = localStorage.getItem('token');

  // Trigger Scan for a repository
  const handleTriggerScan = async (repo) => {
    const repoId = repo._id || repo.id;
    if (!repoId || scanningMap[repoId]) return;

    setScanningMap((prev) => ({ ...prev, [repoId]: true }));
    setScanNotification(null);
    setRepoErrors((prev) => {
      const next = { ...prev };
      delete next[repoId];
      return next;
    });

    try {
      const response = await api.post(`/scans/${repoId}`, {}, { timeout: 120000 });

      if (response.data && response.data.success) {
        const updatedRepo = response.data.repository;
        const lastScannedAt = updatedRepo?.lastScannedAt || response.data.scan?.completedAt || new Date().toISOString();

        setRepositories((prev) =>
          prev.map((r) =>
            (r._id === repoId || r.id === repoId)
              ? { ...r, lastScannedAt }
              : r
          )
        );

        const findingsCount = response.data.findingsSummary?.total ?? (response.data.scan?.totalFindings ?? 0);
        setScanNotification({
          type: 'success',
          message: `Scan completed successfully for "${repo.name}"! ${findingsCount} finding(s) detected.`,
        });
      } else {
        const errMsg = response.data?.message || `Failed to complete scan for "${repo.name}".`;
        setRepoErrors((prev) => ({ ...prev, [repoId]: errMsg }));
        setScanNotification({
          type: 'error',
          message: errMsg,
        });
      }
    } catch (err) {
      let errorMsg = `Failed to run security scan for "${repo.name}".`;
      if (err.code === 'ECONNABORTED') {
        errorMsg = `Scan request timed out after 2 minutes for "${repo.name}".`;
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.message) {
        errorMsg = err.message;
      }

      setRepoErrors((prev) => ({ ...prev, [repoId]: errorMsg }));
      setScanNotification({
        type: 'error',
        message: errorMsg,
      });
    } finally {
      setScanningMap((prev) => {
        const next = { ...prev };
        delete next[repoId];
        return next;
      });
    }
  };

  // Fetch real repositories from backend on load
  const fetchRepositories = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setFetchError('');
      const response = await api.get('/repositories');
      if (response.data && Array.isArray(response.data.repositories)) {
        setRepositories(response.data.repositories);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch repositories.';
      setFetchError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepositories();
  }, []);

  // Handle Add Repository Form Submission
  const handleAddRepository = async (e) => {
    e.preventDefault();
    setModalError('');

    const trimmedUrl = repoUrl.trim();
    if (!trimmedUrl) {
      setModalError('Repository URL is required.');
      return;
    }

    if (!GITHUB_REPO_REGEX.test(trimmedUrl)) {
      setModalError('Please enter a valid GitHub repository URL (e.g. https://github.com/owner/repo)');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/repositories', {
        url: trimmedUrl,
        branch: branch.trim() || 'main',
        visibility,
      });

      if (response.status === 201 && response.data?.repository) {
        // Prepend new repository to state so it renders immediately without manual page reload
        setRepositories((prev) => [response.data.repository, ...prev]);

        // Reset and close modal
        setRepoUrl('');
        setBranch('main');
        setVisibility('public');
        setIsModalOpen(false);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to add repository.';
      setModalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter repositories by search query
  const filteredRepositories = repositories.filter((repo) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (repo.name && repo.name.toLowerCase().includes(query)) ||
      (repo.owner && repo.owner.toLowerCase().includes(query)) ||
      (repo.url && repo.url.toLowerCase().includes(query)) ||
      (repo.branch && repo.branch.toLowerCase().includes(query))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Tracked Repositories
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Manage Git repositories configured for automated Gitleaks & Trivy security auditing.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={fetchRepositories}
            disabled={loading}
            title="Reload repository records from database"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.borderColor = 'var(--accent-cyan)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }
            }}
          >
            <RefreshCw size={15} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              setModalError('');
              setIsModalOpen(true);
            }}
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
              cursor: 'pointer',
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <Plus size={16} />
            <span>Add Repository</span>
          </button>
        </div>
      </div>

      {/* Authentication Notice if not logged in */}
      {!token && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.25rem',
          backgroundColor: 'rgba(234, 179, 8, 0.1)',
          border: '1px solid rgba(234, 179, 8, 0.3)',
          borderRadius: '8px',
          color: '#facc15',
          fontSize: '0.875rem',
        }}>
          <div>
            <strong>Authentication required:</strong> Sign in to link and persist your repositories in MongoDB Atlas.
          </div>
          <Link
            to="/login"
            style={{
              padding: '0.4rem 0.85rem',
              backgroundColor: '#eab308',
              color: '#0f172a',
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

      {/* Fetch Error Banner */}
      {fetchError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          color: 'var(--severity-critical)',
          fontSize: '0.85rem',
        }}>
          <AlertCircle size={16} />
          <span>{fetchError}</span>
        </div>
      )}

      {/* Scan Feedback Banner */}
      {scanNotification && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          backgroundColor: scanNotification.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${scanNotification.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          borderRadius: '8px',
          color: scanNotification.type === 'success' ? 'var(--status-success)' : 'var(--severity-critical)',
          fontSize: '0.85rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {scanNotification.type === 'success' ? <ShieldCheck size={16} /> : <AlertCircle size={16} />}
            <span>{scanNotification.message}</span>
          </div>
          <button
            onClick={() => setScanNotification(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '0.2rem',
              opacity: 0.8,
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

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
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search repositories by name, owner, URL, or branch..."
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            width: '100%',
            outline: 'none',
          }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{ color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Repositories Table / Card List */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
            <div>Loading tracked repositories from MongoDB...</div>
          </div>
        ) : filteredRepositories.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <FolderGit2 size={40} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              {searchQuery ? 'No matching repositories found' : 'No repositories tracked yet'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 1.5rem auto' }}>
              {searchQuery 
                ? 'Try searching with a different repository name or branch.' 
                : 'Click "Add Repository" above to configure your first open-source project repository for security scanning.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => {
                  setModalError('');
                  setIsModalOpen(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.55rem 1rem',
                  backgroundColor: 'var(--accent-cyan)',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                <Plus size={16} />
                <span>Add Your First Repository</span>
              </button>
            )}
          </div>
        ) : (
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
                <th style={{ padding: '0.85rem 1.25rem' }}>Visibility</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Security Posture</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Created / Last Scanned</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRepositories.map((repo) => (
                <tr
                  key={repo._id || repo.id}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    fontSize: '0.875rem',
                  }}
                >
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {repo.owner ? `${repo.owner}/${repo.name}` : repo.name}
                    </div>
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--accent-cyan)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        marginTop: '0.2rem',
                        textDecoration: 'none',
                      }}
                    >
                      <span>{repo.url}</span>
                      <ExternalLink size={12} />
                    </a>
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
                      {repo.branch || 'main'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      textTransform: 'capitalize',
                    }}>
                      {repo.visibility === 'private' ? <Lock size={12} /> : <Globe size={12} />}
                      {repo.visibility || 'public'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    {scanningMap[repo._id || repo.id] ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: 'var(--accent-cyan)',
                        backgroundColor: 'rgba(6, 182, 212, 0.1)',
                        border: '1px solid rgba(6, 182, 212, 0.3)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                      }}>
                        <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                        Scanning...
                      </span>
                    ) : repoErrors[repo._id || repo.id] ? (
                      <span 
                        title={repoErrors[repo._id || repo.id]}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: 'var(--severity-critical)',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}>
                        <AlertCircle size={13} />
                        Scan Failed
                      </span>
                    ) : repo.lastScannedAt ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: 'var(--status-success)',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                      }}>
                        <ShieldCheck size={16} /> Scanned
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: '#facc15',
                        backgroundColor: 'rgba(234, 179, 8, 0.1)',
                        border: '1px solid rgba(234, 179, 8, 0.25)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                      }}>
                        <Clock size={12} /> Pending First Scan
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {repo.lastScannedAt
                      ? new Date(repo.lastScannedAt).toLocaleDateString()
                      : repo.createdAt
                      ? `Added ${new Date(repo.createdAt).toLocaleDateString()}`
                      : 'Recently added'}
                  </td>
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                    {(() => {
                      const repoId = repo._id || repo.id;
                      const isScanning = Boolean(scanningMap[repoId]);
                      const hasFailed = Boolean(repoErrors[repoId]);

                      return (
                        <button
                          onClick={() => handleTriggerScan(repo)}
                          disabled={isScanning}
                          title={isScanning ? 'Scan in progress' : hasFailed ? 'Retry failed scan' : 'Trigger security scan'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            backgroundColor: isScanning 
                              ? 'rgba(6, 182, 212, 0.15)' 
                              : hasFailed 
                              ? 'rgba(239, 68, 68, 0.15)' 
                              : 'var(--bg-secondary)',
                            border: `1px solid ${
                              isScanning 
                                ? 'var(--accent-cyan)' 
                                : hasFailed 
                                ? 'rgba(239, 68, 68, 0.4)' 
                                : 'var(--border-color)'
                            }`,
                            color: isScanning 
                              ? 'var(--accent-cyan)' 
                              : hasFailed 
                              ? 'var(--severity-critical)' 
                              : 'var(--text-secondary)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: isScanning ? 'not-allowed' : 'pointer',
                            opacity: isScanning ? 0.8 : 1,
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isScanning) {
                              e.currentTarget.style.color = hasFailed ? 'var(--severity-critical)' : 'var(--accent-cyan)';
                              e.currentTarget.style.borderColor = hasFailed ? 'var(--severity-critical)' : 'var(--accent-cyan)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isScanning) {
                              e.currentTarget.style.color = hasFailed ? 'var(--severity-critical)' : 'var(--text-secondary)';
                              e.currentTarget.style.borderColor = hasFailed ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)';
                            }
                          }}
                        >
                          <RefreshCw size={12} style={isScanning ? { animation: 'spin 1s linear infinite' } : {}} />
                          <span>{isScanning ? 'Scanning...' : hasFailed ? 'Retry Scan' : repo.lastScannedAt ? 'Rescan' : 'Trigger Scan'}</span>
                        </button>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Repository Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(11, 15, 25, 0.8)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          zIndex: 50,
        }}>
          <div style={{
            width: '100%',
            maxWidth: '520px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            position: 'relative',
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '0.85rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FolderGit2 size={20} color="var(--accent-cyan)" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Add Repository
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
                style={{
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.25rem',
                  borderRadius: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Error */}
            {modalError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: 'var(--severity-critical)',
                fontSize: '0.85rem',
              }}>
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleAddRepository} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '0.5rem',
                }}>
                  GitHub Repository URL <span style={{ color: 'var(--severity-critical)' }}>*</span>
                </label>
                <input
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/torvalds/linux"
                  required
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  Format: https://github.com/owner/repository (or .git)
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '0.5rem',
                  }}>
                    Branch
                  </label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                    disabled={submitting}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '0.5rem',
                  }}>
                    Visibility
                  </label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    disabled={submitting}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                marginTop: '0.5rem',
                paddingTop: '0.85rem',
                borderTop: '1px solid var(--border-color)',
              }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    backgroundColor: submitting ? '#0284c7' : 'var(--accent-cyan)',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.75 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {submitting && <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                  <span>{submitting ? 'Adding Repository...' : 'Add Repository'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
