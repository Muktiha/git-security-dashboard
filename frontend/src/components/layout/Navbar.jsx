import React, { useState, useEffect, useRef } from 'react';
import { Shield, LogOut, User, Bell, Check, ExternalLink } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function Navbar() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifs, setRecentNotifs] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const notifMenuRef = useRef(null);
  const token = localStorage.getItem('token');

  const fetchNotificationSummary = async () => {
    if (!token) return;
    try {
      const res = await api.get('/notifications');
      if (res.data && res.data.success) {
        setUnreadCount(res.data.unreadCount || 0);
        setRecentNotifs(Array.isArray(res.data.notifications) ? res.data.notifications.slice(0, 5) : []);
      }
    } catch {
      // Ignore background notification fetch errors
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    }

    if (token) {
      fetchNotificationSummary();
      const interval = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          fetchNotificationSummary();
        }
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      fetchNotificationSummary();
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      fetchNotificationSummary();
    } catch {}
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <header style={{
      height: '64px',
      borderBottom: '1px solid var(--border-color)',
      backgroundColor: 'rgba(255, 255, 255, 0.92)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      position: 'sticky',
      top: 0,
      zIndex: 20,
    }}>
      {/* Brand / Title */}
      <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'var(--gradient-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.28)',
        }}>
          <Shield size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.98rem', letterSpacing: '0.01em', color: 'var(--text-primary)' }}>
            Git Security Scanner
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Gov Open-Source Integrity Dashboard
          </div>
        </div>
      </Link>

      {/* Right Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Tool Engine Status Badges */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem 0.85rem',
          borderRadius: '9999px',
          background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          fontSize: '0.75rem',
          color: 'var(--status-success)',
          fontWeight: 600,
        }}>
          <span style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: 'var(--status-success)',
            boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
          }} />
          <span>Gitleaks & Trivy Engines Ready</span>
        </div>

        {/* User Session & Logout Action */}
        {token ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Notification Bell Button & Dropdown */}
            <div style={{ position: 'relative' }} ref={notifMenuRef}>
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                title="Notifications"
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: showNotifMenu ? 'var(--badge-info-bg)' : 'var(--bg-card)',
                  border: showNotifMenu ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                  color: showNotifMenu ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      backgroundColor: 'var(--severity-critical)',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      minWidth: '18px',
                      height: '18px',
                      borderRadius: '9999px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px',
                      border: '2px solid var(--bg-secondary)',
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Quick Notification Dropdown */}
              {showNotifMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '340px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                    zIndex: 50,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-cyan)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: 500,
                          padding: 0,
                        }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {recentNotifs.length === 0 ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        No recent notifications.
                      </div>
                    ) : (
                      recentNotifs.map((n) => (
                        <div
                          key={n._id}
                          onClick={() => {
                            if (!n.isRead) handleMarkAsRead(n._id);
                            if (n.link) {
                              setShowNotifMenu(false);
                              navigate(n.link);
                            }
                          }}
                          style={{
                            padding: '0.75rem 1rem',
                            borderBottom: '1px solid var(--border-color)',
                            backgroundColor: n.isRead ? 'transparent' : '#f0f9ff',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.2rem',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span
                              style={{
                                fontSize: '0.8rem',
                                fontWeight: n.isRead ? 500 : 700,
                                color: n.type === 'CRITICAL_FINDINGS' || n.type === 'SCAN_FAILED'
                                  ? 'var(--severity-critical)'
                                  : 'var(--text-primary)',
                              }}
                            >
                              {n.title}
                            </span>
                            {!n.isRead && (
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--accent-cyan)',
                                }}
                              />
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                            {n.message}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div
                    style={{
                      padding: '0.6rem 1rem',
                      borderTop: '1px solid var(--border-color)',
                      textAlign: 'center',
                      backgroundColor: 'var(--bg-secondary)',
                    }}
                  >
                    <Link
                      to="/notifications"
                      onClick={() => setShowNotifMenu(false)}
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--accent-cyan)',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      View all notifications <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Info Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.65rem',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
            }}>
              <User size={14} color="var(--accent-cyan)" />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser?.name || currentUser?.email || 'SecOps User'}
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              title="Sign Out of Dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.85rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '6px',
                backgroundColor: 'var(--severity-critical-bg)',
                border: '1px solid var(--severity-critical-border)',
                color: 'var(--severity-critical)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--severity-critical-border)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--severity-critical-bg)';
              }}
            >
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.85rem',
              fontWeight: 500,
              borderRadius: '6px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.borderColor = 'var(--accent-cyan)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
