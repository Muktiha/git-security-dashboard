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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <SettingsIcon size={24} color="var(--accent-cyan)" />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            System Settings & Project Architecture
          </h1>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Platform configuration, scanner engine status, security score formulation, and SIH project alignment documentation.
        </p>
      </div>

      {/* Grid: User Profile & Project Metadata */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* User Profile Card */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <User size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Active Operator Session
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Name</span>
              <strong style={{ color: 'var(--text-primary)' }}>{currentUser?.name || 'Security Analyst'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Email</span>
              <strong style={{ color: 'var(--text-primary)' }}>{currentUser?.email || 'analyst@secops.local'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Access Level</span>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Administrator / SecOps</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Auth Scheme</span>
              <span style={{ color: 'var(--status-success)', fontWeight: 600 }}>JWT Bearer Token</span>
            </div>
          </div>
        </div>

        {/* Project Alignment Card */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <Award size={18} color="#f59e0b" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              SIH Problem Statement Alignment
            </h3>
          </div>

          <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              <strong>Topic: </strong>
              SIH-Aligned Distributed Git Repository Security Scan Dashboard for Open-Source Government Project Contributions.
            </p>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              <strong>Focus: </strong>
              Prevent supply-chain vulnerability infiltration, sensitive credential leakage, and insecure dependencies in public government software repositories.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--status-success)', fontWeight: 600, fontSize: '0.75rem' }}>
              <CheckCircle2 size={14} />
              <span>5th Semester Major Project Review Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Scanner Engines Card */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <Cpu size={18} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Integrated Security Engines Status
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {/* Gitleaks Engine */}
          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                <Shield size={16} color="var(--severity-secret)" />
                <span>Gitleaks Secret Engine</span>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--status-success)', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                ONLINE
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Detects API tokens, RSA private keys, AWS secrets, password hashes, and database connection strings before commits reach upstream main branch.
            </div>
          </div>

          {/* Trivy Engine */}
          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                <Shield size={16} color="var(--accent-cyan)" />
                <span>Trivy Vulnerability Engine</span>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--status-success)', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                ONLINE
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Performs software composition analysis (SCA) on lockfiles, package manifests, and dependencies mapped against National Vulnerability Database (NVD) CVE records.
            </div>
          </div>
        </div>
      </div>

      {/* Security Score Formula Documentation */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <BookOpen size={18} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Repository Security Score Formulation (Reviewer Reference)
          </h3>
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <p>
            The dashboard computes a standardized <strong>0 to 100 Security Health Score</strong> using a severity-weighted penalty model derived from active, unresolved findings:
          </p>

          <div style={{
            padding: '1rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '8px',
            fontFamily: 'monospace',
            color: 'var(--accent-cyan)',
            fontSize: '0.85rem',
            margin: '0.5rem 0',
            border: '1px solid var(--border-color)',
          }}>
            Score = Math.max(0, 100 - (Critical × 25 + High × 15 + Medium × 5 + Low × 2 + AcceptedRisk × 1))
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
            <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <strong style={{ color: 'var(--status-success)' }}>Grade A (90 - 100%)</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Low Risk / Clean Posture</div>
            </div>
            <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'rgba(234, 179, 8, 0.08)', borderRadius: '6px', border: '1px solid rgba(234, 179, 8, 0.25)' }}>
              <strong style={{ color: '#eab308' }}>Grade B (75 - 89%)</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Moderate Risk / Triage Advised</div>
            </div>
            <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'rgba(249, 115, 22, 0.08)', borderRadius: '6px', border: '1px solid rgba(249, 115, 22, 0.25)' }}>
              <strong style={{ color: 'var(--severity-high)' }}>Grade C (50 - 74%)</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Elevated Risk / Action Required</div>
            </div>
            <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <strong style={{ color: 'var(--severity-critical)' }}>Grade D (0 - 49%)</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Critical Risk / Urgent Remediation</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <Info size={14} color="var(--accent-cyan)" />
            <span>Note: Findings marked with status <strong>RESOLVED</strong> incur 0 penalty, restoring repository score immediately.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
