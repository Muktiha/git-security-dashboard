import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  AlertCircle, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  RefreshCw, 
  Filter 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  const fetchNotifications = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/notifications');
      if (res.data && res.data.success) {
        setNotifications(res.data.notifications || []);
      }
    } catch (err) {
      console.error('[Notifications Fetch Error]', err);
      setError(err.response?.data?.message || 'Failed to retrieve notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('[Mark Read Error]', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('[Mark All Read Error]', err);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getNotificationIcon = (type) => {
    if (type === 'CRITICAL_FINDINGS' || type === 'SCAN_FAILED') {
      return <AlertCircle size={20} color="var(--severity-critical)" />;
    }
    if (type === 'HIGH_FINDINGS') {
      return <ShieldAlert size={20} color="var(--severity-high)" />;
    }
    if (type === 'STATUS_CHANGED' || type === 'SCAN_COMPLETED') {
      return <CheckCircle2 size={20} color="var(--status-success)" />;
    }
    return <Bell size={20} color="var(--accent-cyan)" />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Bell size={24} color="var(--accent-cyan)" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Security Notification Center
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            In-app security alerts for critical vulnerabilities, secret leaks, scan terminations, and status updates.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1rem',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--accent-cyan)',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <CheckCheck size={16} />
              <span>Mark all as read</span>
            </button>
          )}

          <button
            onClick={fetchNotifications}
            title="Refresh notifications"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => setFilter('ALL')}
          style={{
            padding: '0.45rem 1rem',
            borderRadius: '6px',
            fontSize: '0.825rem',
            fontWeight: 600,
            backgroundColor: filter === 'ALL' ? 'var(--accent-cyan)' : 'var(--bg-card)',
            color: filter === 'ALL' ? '#ffffff' : 'var(--text-secondary)',
            border: filter === 'ALL' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
            cursor: 'pointer',
          }}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('UNREAD')}
          style={{
            padding: '0.45rem 1rem',
            borderRadius: '6px',
            fontSize: '0.825rem',
            fontWeight: 600,
            backgroundColor: filter === 'UNREAD' ? 'var(--accent-cyan)' : 'var(--bg-card)',
            color: filter === 'UNREAD' ? '#ffffff' : 'var(--text-secondary)',
            border: filter === 'UNREAD' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
            cursor: 'pointer',
          }}
        >
          Unread Only ({unreadCount})
        </button>
      </div>

      {/* Notifications List Container */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
            <div>Loading notifications...</div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCheck size={44} color="var(--status-success)" style={{ marginBottom: '1rem', opacity: 0.8 }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              You're all caught up!
            </h3>
            <p style={{ fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto' }}>
              {filter === 'UNREAD'
                ? 'No unread notifications at this time.'
                : 'No security scan or finding alert notifications have been generated yet.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredNotifications.map((n) => (
              <div
                key={n._id}
                onClick={() => {
                  if (!n.isRead) handleMarkAsRead(n._id);
                  if (n.link) navigate(n.link);
                }}
                style={{
                  padding: '1.15rem 1.25rem',
                  borderBottom: '1px solid var(--border-color)',
                  backgroundColor: n.isRead ? 'transparent' : 'rgba(14, 165, 233, 0.04)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  cursor: n.link ? 'pointer' : 'default',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <div style={{ marginTop: '0.15rem', flexShrink: 0 }}>
                  {getNotificationIcon(n.type)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        fontSize: '0.9rem',
                        fontWeight: n.isRead ? 600 : 700,
                        color: n.type === 'CRITICAL_FINDINGS' || n.type === 'SCAN_FAILED'
                          ? 'var(--severity-critical)'
                          : 'var(--text-primary)',
                      }}>
                        {n.title}
                      </span>
                      {!n.isRead && (
                        <span style={{
                          padding: '0.1rem 0.4rem',
                          borderRadius: '9999px',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          backgroundColor: 'var(--accent-cyan)',
                          color: '#ffffff',
                        }}>
                          NEW
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <Clock size={12} />
                      <span>{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: '0.2rem 0' }}>
                    {n.message}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                    {n.link && (
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--accent-cyan)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}>
                        View details <ExternalLink size={12} />
                      </span>
                    )}

                    {!n.isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(n._id, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline',
                        }}
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
