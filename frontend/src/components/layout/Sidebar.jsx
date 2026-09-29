import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  GitBranch, 
  ShieldAlert, 
  LogIn, 
  UserPlus 
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Repositories', path: '/repositories', icon: GitBranch },
  { name: 'Security Findings', path: '/findings', icon: ShieldAlert },
];

const authItems = [
  { name: 'Sign In', path: '/login', icon: LogIn },
  { name: 'Register', path: '/register', icon: UserPlus },
];

export default function Sidebar() {
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
          {authItems.map((item) => {
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
    </aside>
  );
}
