import React, { useState } from 'react';
import { 
  ShieldAlert, 
  KeyRound, 
  Search, 
  Filter, 
  FileCode, 
  EyeOff, 
  ExternalLink 
} from 'lucide-react';

const mockFindings = [
  {
    id: 'f1',
    type: 'secret',
    title: 'Exposed AWS Secret Access Key',
    scanner: 'Gitleaks',
    severity: 'CRITICAL',
    repo: 'gov-portal/citizen-auth',
    file: 'backend/config/aws.js',
    line: 14,
    maskedValue: 'AKIA****************', // Following security rule: never expose actual secrets in UI
    ruleId: 'aws-access-token',
    detectedAt: '25 mins ago',
  },
  {
    id: 'f2',
    type: 'vulnerability',
    title: 'CVE-2023-45853: zlib buffer overflow in minizip',
    scanner: 'Trivy',
    severity: 'CRITICAL',
    repo: 'gov-portal/citizen-auth',
    package: 'zlib 1.2.11',
    fixedVersion: '1.2.12',
    detectedAt: '25 mins ago',
  },
  {
    id: 'f3',
    type: 'secret',
    title: 'Hardcoded Database Connection String with Credentials',
    scanner: 'Gitleaks',
    severity: 'HIGH',
    repo: 'transport-sys/fleet-tracker',
    file: 'services/db.py',
    line: 28,
    maskedValue: 'mongodb+srv://admin:****************@cluster.gov.in',
    ruleId: 'mongodb-uri',
    detectedAt: '4 hours ago',
  },
  {
    id: 'f4',
    type: 'vulnerability',
    title: 'CVE-2023-30533: Prototype pollution in SheetJS',
    scanner: 'Trivy',
    severity: 'MEDIUM',
    repo: 'transport-sys/fleet-tracker',
    package: 'xlsx 0.18.5',
    fixedVersion: '0.19.3',
    detectedAt: '4 hours ago',
  },
];

export default function Findings() {
  const [filter, setFilter] = useState('ALL');

  const filteredFindings = mockFindings.filter((finding) => {
    if (filter === 'SECRETS') return finding.type === 'secret';
    if (filter === 'VULNERABILITIES') return finding.type === 'vulnerability';
    if (filter === 'CRITICAL') return finding.severity === 'CRITICAL';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Security Findings
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Consolidated findings from Gitleaks (secret detection) and Trivy (vulnerability analysis).
        </p>
      </div>

      {/* Filter Tabs & Search */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
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
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.45rem 0.85rem',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          width: '260px',
        }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search findings..."
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

      {/* Findings List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredFindings.map((finding) => (
          <div
            key={finding.id}
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: finding.severity === 'CRITICAL' 
                    ? 'rgba(239, 68, 68, 0.15)' 
                    : finding.severity === 'HIGH' 
                    ? 'rgba(249, 115, 22, 0.15)' 
                    : 'rgba(234, 179, 8, 0.15)',
                  color: finding.severity === 'CRITICAL' 
                    ? 'var(--severity-critical)' 
                    : finding.severity === 'HIGH' 
                    ? 'var(--severity-high)' 
                    : 'var(--severity-medium)',
                  border: `1px solid ${
                    finding.severity === 'CRITICAL' 
                      ? 'rgba(239, 68, 68, 0.3)' 
                      : finding.severity === 'HIGH' 
                      ? 'rgba(249, 115, 22, 0.3)' 
                      : 'rgba(234, 179, 8, 0.3)'
                  }`,
                }}>
                  {finding.severity}
                </span>

                <span style={{
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: finding.type === 'secret' ? 'var(--severity-secret)' : 'var(--accent-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}>
                  {finding.type === 'secret' ? <KeyRound size={12} /> : <ShieldAlert size={12} />}
                  {finding.scanner}
                </span>

                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {finding.title}
                </h3>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {finding.detectedAt}
              </div>
            </div>

            {/* Context details */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
            }}>
              <div>Repository: <strong style={{ color: 'var(--text-primary)' }}>{finding.repo}</strong></div>
              {finding.file && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <FileCode size={14} />
                  <span>{finding.file}:{finding.line}</span>
                </div>
              )}
              {finding.package && (
                <div>Affected Package: <strong style={{ color: 'var(--text-primary)' }}>{finding.package}</strong> (Fix: {finding.fixedVersion})</div>
              )}
            </div>

            {/* Masked Secret Alert if Secret Leak */}
            {finding.maskedValue && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'rgba(236, 72, 153, 0.08)',
                border: '1px solid rgba(236, 72, 153, 0.25)',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                color: 'var(--text-primary)',
              }}>
                <EyeOff size={14} color="var(--severity-secret)" />
                <span style={{ color: 'var(--text-muted)' }}>Masked Secret:</span>
                <span style={{ color: 'var(--severity-secret)', fontWeight: 600 }}>{finding.maskedValue}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Rule: {finding.ruleId}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
