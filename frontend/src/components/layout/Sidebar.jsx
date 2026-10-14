import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  GitBranch, 
  ShieldAlert, 
  LogIn, 
  UserPlus,
  LogOut 
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Repositories', path: '/repositories', icon: GitBranch },
  { name: 'Security Findings', path: '/findings', icon: ShieldAlert },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getLinkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.65rem 0.85rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: isActive ? 600 : 500,
    color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
    backgroundColor: isActive ? 'var(--accent-cyan-glow)' : 'transparent',
    border: isActive ? '1px solid rgba(14, 165, 233, 0.3)' : '1px solid transparent',
    transition: 'all 0.15s ease',
  });

  return (
    <aside style={{
      width: '240px',
      borderRight: '1px solid var(--border-color)',
      backgroundColor: 'var(--bg-secondary)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '1.25rem 0.75rem',
      minHeight: 'calc(100vh - 64px)',
    }}>
      {/* Primary Navigation */}
      <div>
        <div style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          padding: '0 0.85rem 0.65rem 0.85rem',
        }}>
          Security Operations
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={item.path} style={getLinkStyle}>
                <Icon size={18} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Auth / Account Links */}
      <div style={{
        borderTop: '1px solid var(--border-color)',
        paddingTop: '1rem',
      }}>
        <div style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          padding: '0 0.85rem 0.65rem 0.85rem',
        }}>
          Access Control
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {token ? (
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--severity-critical)',
                backgroundColor: 'transparent',
                border: '1px solid transparent',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          ) : (
            <>
              <NavLink to="/login" style={getLinkStyle}>
                <LogIn size={18} />
                <span>Sign In</span>
              </NavLink>
              <NavLink to="/register" style={getLinkStyle}>
                <UserPlus size={18} />
                <span>Register</span>
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </aside>
  );
}
