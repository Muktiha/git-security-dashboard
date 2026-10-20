import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Shield, 
  CheckCircle2, 
  Cpu, 
  BookOpen, 
  User, 
  Award, 
  FileText, 
  Info,
  Server,
  Lock
} from 'lucide-react';

export default function Settings() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch {}
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'var(--gradient-primary)',
            color: '#FFFFFF',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.28)',
            flexShrink: 0
          }}>
            <SettingsIcon size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              System Settings & Architecture
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', margin: 0 }}>
              Platform configuration, scanner engine status, security score formulation, and SIH project alignment documentation.
            </p>
          </div>
        </div>
      </div>

      {/* Grid: User Profile & Project Metadata */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* User Profile Card */}
        <div className="card-prismatic" style={{
          borderRadius: '16px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--gradient-cyan)',
              color: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(6, 182, 212, 0.2)'
            }}>
              <User size={16} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Active Operator Session
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Name</span>
              <strong style={{ color: 'var(--text-primary)' }}>{currentUser?.name || 'Security Analyst'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Email</span>
              <strong style={{ color: 'var(--text-primary)' }}>{currentUser?.email || 'analyst@secops.local'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Access Level</span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>Administrator / SecOps</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Auth Scheme</span>
              <span style={{ color: 'var(--status-success)', fontWeight: 600 }}>JWT Bearer Token</span>
            </div>
          </div>
        </div>

        {/* Project Alignment Card */}
        <div className="card-prismatic" style={{
          borderRadius: '16px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--gradient-violet)',
              color: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.2)'
            }}>
              <Award size={16} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              SIH Problem Statement Alignment
            </h3>
          </div>

          <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Topic: </strong>
              SIH-Aligned Distributed Git Repository Security Scan Dashboard for Open-Source Government Project Contributions.
            </p>
            <p style={{ margin: '0 0 0.65rem 0' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Focus: </strong>
              Prevent supply-chain vulnerability infiltration, sensitive credential leakage, and insecure dependencies in public government software repositories.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--status-success)', fontWeight: 600, fontSize: '0.78rem', backgroundColor: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>
              <CheckCircle2 size={14} />
              <span>5th Semester Major Project Review Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Scanner Engines Card */}
      <div className="card-prismatic" style={{
        borderRadius: '16px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'var(--gradient-teal)',
            color: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(20, 184, 166, 0.2)'
          }}>
            <Cpu size={16} />
          </div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Integrated Security Engines Status
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {/* Gitleaks Engine */}
          <div style={{ padding: '1.1rem', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(37, 99, 235, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--gradient-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <Shield size={14} />
                </div>
                <span>Gitleaks Secret Engine</span>
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--status-success)', backgroundColor: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', padding: '0.2rem 0.55rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--status-success)' }}></span>
                ONLINE
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Detects API tokens, RSA private keys, AWS secrets, password hashes, and database connection strings before commits reach upstream main branch.
            </div>
          </div>

          {/* Trivy Engine */}
          <div style={{ padding: '1.1rem', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(37, 99, 235, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--gradient-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <Shield size={14} />
                </div>
                <span>Trivy Vulnerability Engine</span>
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--status-success)', backgroundColor: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', padding: '0.2rem 0.55rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--status-success)' }}></span>
                ONLINE
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Performs software composition analysis (SCA) on lockfiles, package manifests, and dependencies mapped against National Vulnerability Database (NVD) CVE records.
            </div>
          </div>
        </div>
      </div>

      {/* Security Score Formula Documentation */}
      <div className="card-prismatic" style={{
        borderRadius: '16px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'var(--gradient-primary)',
            color: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)'
          }}>
            <BookOpen size={16} />
          </div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Repository Security Score Formulation (Reviewer Reference)
          </h3>
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}>
            The dashboard computes a standardized <strong style={{ color: 'var(--text-primary)' }}>0 to 100 Security Health Score</strong> using a severity-weighted penalty model derived from active, unresolved findings:
          </p>

          <div style={{
            padding: '1.1rem 1.25rem',
            backgroundColor: '#F8FAFF',
            borderRadius: '10px',
            fontFamily: 'Consolas, Monaco, monospace',
            color: 'var(--accent-primary)',
            fontSize: '0.88rem',
            fontWeight: 600,
            margin: '0.75rem 0',
            border: '1px solid var(--border-color)',
            boxShadow: 'inset 0 1px 3px rgba(37, 99, 235, 0.05)'
          }}>
            Score = Math.max(0, 100 - (Critical × 25 + High × 15 + Medium × 5 + Low × 2 + AcceptedRisk × 1))
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
            <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--status-success-bg)', borderRadius: '8px', border: '1px solid var(--status-success-border)' }}>
              <strong style={{ color: 'var(--status-success)', display: 'block', fontSize: '0.85rem' }}>Grade A (90 - 100%)</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Low Risk / Clean Posture</div>
            </div>
            <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--severity-medium-bg)', borderRadius: '8px', border: '1px solid var(--severity-medium-border)' }}>
              <strong style={{ color: 'var(--severity-medium)', display: 'block', fontSize: '0.85rem' }}>Grade B (75 - 89%)</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Moderate Risk / Triage Advised</div>
            </div>
            <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--severity-high-bg)', borderRadius: '8px', border: '1px solid var(--severity-high-border)' }}>
              <strong style={{ color: 'var(--severity-high)', display: 'block', fontSize: '0.85rem' }}>Grade C (50 - 74%)</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Elevated Risk / Action Required</div>
            </div>
            <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--severity-critical-bg)', borderRadius: '8px', border: '1px solid var(--severity-critical-border)' }}>
              <strong style={{ color: 'var(--severity-critical)', display: 'block', fontSize: '0.85rem' }}>Grade D (0 - 49%)</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Critical Risk / Urgent Remediation</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.85rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <Info size={15} color="var(--accent-primary)" />
            <span>Note: Findings marked with status <strong style={{ color: 'var(--text-primary)' }}>RESOLVED</strong> incur 0 penalty, restoring repository score immediately.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
