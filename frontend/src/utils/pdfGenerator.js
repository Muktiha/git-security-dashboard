import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Sanitizes string content for clean PDF rendering.
 */
const sanitizeText = (text, fallback = 'N/A') => {
  if (text === null || text === undefined) return fallback;
  const str = String(text).trim();
  if (!str) return fallback;
  // Replace non-printable ASCII or control characters
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
};

/**
 * Formats ISO date string to a human-readable format.
 */
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return sanitizeText(dateStr);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return 'N/A';
  }
};

/**
 * Generates and downloads a clean, professional PDF security findings report.
 *
 * @param {object} options
 * @param {Array} options.findings - Array of finding objects.
 * @param {object} [options.repository] - Associated repository document.
 * @param {object} [options.scan] - Associated scan document.
 * @param {string} [options.reportTitle] - Custom title override.
 * @param {string} [options.filterName] - Active filter description.
 * @param {string} [options.searchQuery] - Active search term.
 */
export const downloadSecurityReportPDF = ({
  findings = [],
  repository = null,
  scan = null,
  reportTitle = 'Git Repository Security Scan Dashboard',
  filterName = 'All Findings',
  searchQuery = '',
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const printableWidth = pageWidth - margin * 2;

  // Colors
  const colors = {
    primaryDark: [15, 23, 42],    // #0f172a
    primaryCyan: [6, 182, 212],    // #06b6d4
    textDark: [30, 41, 59],        // #1e293b
    textMuted: [100, 116, 139],    // #64748b
    cardBg: [248, 250, 252],       // #f8fafc
    cardBorder: [226, 232, 240],   // #e2e8f0
    critical: [239, 68, 68],       // #ef4444
    high: [249, 115, 22],          // #f97316
    medium: [234, 179, 8],         // #eab308
    low: [59, 130, 246],           // #3b82f6
    clean: [16, 185, 129],         // #10b981
  };

  // Determine repository & scan metadata
  const repoName = repository 
    ? (repository.owner ? `${repository.owner}/${repository.name}` : repository.name)
    : 'All Tracked Repositories';
  const repoUrl = repository?.url || 'Multiple Repositories';
  const repoBranch = repository?.branch || scan?.repositoryId?.branch || 'main';
  const scanDate = scan?.completedAt || scan?.createdAt || new Date().toISOString();
  const scanStatus = (scan?.status || (repository?.lastScannedAt ? 'COMPLETED' : 'STATUS OK')).toUpperCase();

  // Compute severity statistics
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let unknownCount = 0;

  for (const f of findings) {
    const sev = (f.severity || '').toUpperCase();
    if (sev === 'CRITICAL') criticalCount++;
    else if (sev === 'HIGH') highCount++;
    else if (sev === 'MEDIUM') mediumCount++;
    else if (sev === 'LOW') lowCount++;
    else unknownCount++;
  }

  // 1. Top Header Banner
  doc.setFillColor(...colors.primaryDark);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Accent Line under banner
  doc.setFillColor(...colors.primaryCyan);
  doc.rect(0, 28, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Git Repository Security Scan Dashboard', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...colors.primaryCyan);
  doc.text('Automated Vulnerability & Secret Leak Assessment Report', margin, 18);

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${formatDate(new Date())}`, pageWidth - margin, 18, { align: 'right' });

  let currentY = 36;

  // 2. Metadata Section Box
  doc.setFillColor(...colors.cardBg);
  doc.setDrawColor(...colors.cardBorder);
  doc.roundedRect(margin, currentY, printableWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...colors.primaryDark);
  doc.text('SCAN ASSESSMENT CONTEXT', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...colors.textMuted);

  // Column 1: Repository & URL
  doc.text('Repository:', margin + 4, currentY + 13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.textDark);
  doc.text(sanitizeText(repoName), margin + 26, currentY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.textMuted);
  doc.text('GitHub URL:', margin + 4, currentY + 20);
  doc.setTextColor(...colors.primaryCyan);
  doc.text(sanitizeText(repoUrl), margin + 26, currentY + 20);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.textMuted);
  doc.text('Branch:', margin + 4, currentY + 27);
  doc.setTextColor(...colors.textDark);
  doc.text(sanitizeText(repoBranch), margin + 26, currentY + 27);

  // Column 2: Date, Engines & Status
  const col2X = margin + (printableWidth / 2);
  doc.setTextColor(...colors.textMuted);
  doc.text('Scan Completed:', col2X, currentY + 13);
  doc.setTextColor(...colors.textDark);
  doc.text(formatDate(scanDate), col2X + 26, currentY + 13);

  doc.setTextColor(...colors.textMuted);
  doc.text('Scan Status:', col2X, currentY + 20);
  if (scanStatus === 'COMPLETED') {
    doc.setTextColor(...colors.clean);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPLETED', col2X + 26, currentY + 20);
  } else if (scanStatus === 'FAILED') {
    doc.setTextColor(...colors.critical);
    doc.setFont('helvetica', 'bold');
    doc.text('FAILED', col2X + 26, currentY + 20);
  } else {
    doc.setTextColor(...colors.textDark);
    doc.text(scanStatus, col2X + 26, currentY + 20);
  }

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.textMuted);
  doc.text('Security Engines:', col2X, currentY + 27);
  doc.setTextColor(...colors.textDark);
  doc.text('Gitleaks (Secrets) & Trivy (Vulnerabilities)', col2X + 26, currentY + 27);

  currentY += 40;

  // 3. Severity Executive Summary Badges
  const badgeWidth = (printableWidth - (4 * 3)) / 5;
  const badgeHeight = 16;
  const badges = [
    { label: 'TOTAL FINDINGS', count: findings.length, color: colors.primaryDark },
    { label: 'CRITICAL', count: criticalCount, color: colors.critical },
    { label: 'HIGH', count: highCount, color: colors.high },
    { label: 'MEDIUM', count: mediumCount, color: colors.medium },
    { label: 'LOW / INFO', count: lowCount + unknownCount, color: colors.low },
  ];

  badges.forEach((b, idx) => {
    const x = margin + idx * (badgeWidth + 3);
    doc.setFillColor(...colors.cardBg);
    doc.setDrawColor(...colors.cardBorder);
    doc.roundedRect(x, currentY, badgeWidth, badgeHeight, 1.5, 1.5, 'FD');

    // Accent line at top of badge
    doc.setFillColor(...b.color);
    doc.rect(x, currentY, badgeWidth, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...b.color);
    doc.text(String(b.count), x + badgeWidth / 2, currentY + 9, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...colors.textMuted);
    doc.text(b.label, x + badgeWidth / 2, currentY + 13.5, { align: 'center' });
  });

  currentY += badgeHeight + 8;

  // 4. Zero Findings Clean State vs Findings Table
  if (findings.length === 0) {
    // Render clean green banner
    doc.setFillColor(240, 253, 244); // bg-green-50
    doc.setDrawColor(187, 247, 208); // border-green-200
    doc.roundedRect(margin, currentY, printableWidth, 38, 2, 2, 'FD');

    doc.setFillColor(...colors.clean);
    doc.rect(margin, currentY, 3, 38, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(21, 128, 61); // green-700
    doc.text('No findings detected in this scan', margin + 8, currentY + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...colors.textDark);
    doc.text(
      'Automated Gitleaks secret pattern analysis and Trivy vulnerability auditing completed with 0 detected security issues.',
      margin + 8,
      currentY + 20
    );

    doc.setFontSize(8);
    doc.setTextColor(...colors.textMuted);
    doc.text(
      'No exposed credentials, leaked tokens, or vulnerable package dependencies were identified in the target codebase.',
      margin + 8,
      currentY + 26
    );

    doc.text(
      `Filter Scope: ${sanitizeText(filterName)}${searchQuery ? ` • Search Query: "${sanitizeText(searchQuery)}"` : ''}`,
      margin + 8,
      currentY + 32
    );
  } else {
    // Section Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...colors.primaryDark);
    doc.text(`SECURITY FINDINGS BREAKDOWN (${findings.length})`, margin, currentY);

    if (filterName !== 'All Findings' || searchQuery) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...colors.textMuted);
      doc.text(
        `Filter: ${sanitizeText(filterName)}${searchQuery ? ` • Search: "${sanitizeText(searchQuery)}"` : ''}`,
        pageWidth - margin,
        currentY,
        { align: 'right' }
      );
    }

    currentY += 4;

    // Prepare table rows with sanitized text and remediation advice
    const tableBody = findings.map((f, index) => {
      const isSecret = f.scanner === 'GITLEAKS' || (f.type && f.type.toLowerCase().includes('secret'));
      const scanner = f.scanner === 'GITLEAKS' ? 'Gitleaks (Secret)' : f.scanner === 'TRIVY' ? 'Trivy (Vuln)' : (f.scanner || 'Scanner');
      const title = sanitizeText(f.title || f.identifier || 'Security Finding');
      const severity = sanitizeText((f.severity || 'UNKNOWN').toUpperCase());
      const location = f.file 
        ? `${f.file}${f.line ? `:${f.line}` : ''}`
        : sanitizeText(f.identifier || 'Dependency Package');
      
      const description = sanitizeText(f.description || 'No detailed description available.');
      const status = sanitizeText(f.status || 'OPEN');
      const noteStr = f.remediationNote ? `\nStatus Note: ${sanitizeText(f.remediationNote)}` : '';
      const remediation = sanitizeText(
        f.remediation || 
        (isSecret
          ? 'Revoke & rotate credential immediately. Remove from Git history.'
          : 'Upgrade package to a non-vulnerable version or apply security patch.')
      );

      const detailsCell = `Status: [${status}]${noteStr}\n${description}\nRemediation: ${remediation}`;

      return [
        String(index + 1),
        severity,
        scanner,
        title,
        location,
        detailsCell,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin, bottom: 16 },
      head: [['#', 'Severity', 'Engine', 'Finding / Title', 'Target / File', 'Description & Remediation']],
      body: tableBody,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        overflow: 'linebreak',
        textColor: colors.textDark,
        lineColor: colors.cardBorder,
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: colors.primaryDark,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'left',
      },
      columnStyles: {
        0: { cellWidth: 7, halign: 'center' },
        1: { cellWidth: 18, fontStyle: 'bold' },
        2: { cellWidth: 24 },
        3: { cellWidth: 38 },
        4: { cellWidth: 38 },
        5: { cellWidth: 'auto' },
      },
      didParseCell: (data) => {
        // Color-code the Severity column cells
        if (data.section === 'body' && data.column.index === 1) {
          const sev = String(data.cell.raw).toUpperCase();
          if (sev === 'CRITICAL') {
            data.cell.styles.textColor = colors.critical;
          } else if (sev === 'HIGH') {
            data.cell.styles.textColor = colors.high;
          } else if (sev === 'MEDIUM') {
            data.cell.styles.textColor = colors.medium;
          } else if (sev === 'LOW') {
            data.cell.styles.textColor = colors.low;
          }
        }
      },
      didDrawPage: (data) => {
        // Running Header on subsequent pages
        if (data.pageNumber > 1) {
          doc.setFillColor(...colors.primaryDark);
          doc.rect(0, 0, pageWidth, 12, 'F');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);
          doc.text('Git Repository Security Scan Dashboard', margin, 7.5);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(...colors.primaryCyan);
          doc.text(`Repository: ${sanitizeText(repoName)}`, pageWidth - margin, 7.5, { align: 'right' });
        }
      },
    });
  }

  // 5. Running Page Footers (Page X of Y)
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...colors.cardBorder);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...colors.textMuted);
    doc.text('Git Repository Security Scan Dashboard • Gov Open-Source Integrity Audit', margin, pageHeight - 6);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  }

  // 6. Generate sanitized meaningful filename
  const cleanRepoSlug = sanitizeText(repoName, 'security-dashboard')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-');
  const dateStamp = new Date().toISOString().split('T')[0];
  const filename = `security-report-${cleanRepoSlug}-${dateStamp}.pdf`;

  // 7. Save and trigger browser download
  doc.save(filename);

  return filename;
};

/**
 * Generates and downloads an Executive Security Posture Summary PDF.
 */
export const downloadExecutiveDashboardPDF = ({ stats, repositoryRiskTable = [], recommendedActions = [] }) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const printableWidth = pageWidth - margin * 2;

  const colors = {
    primaryDark: [15, 23, 42],    // #0f172a
    primaryCyan: [6, 182, 212],    // #06b6d4
    textDark: [30, 41, 59],        // #1e293b
    textMuted: [100, 116, 139],    // #64748b
    cardBg: [248, 250, 252],       // #f8fafc
    cardBorder: [226, 232, 240],   // #e2e8f0
    critical: [239, 68, 68],       // #ef4444
    high: [249, 115, 22],          // #f97316
    medium: [234, 179, 8],         // #eab308
    low: [59, 130, 246],           // #3b82f6
    clean: [16, 185, 129],         // #10b981
  };

  let currentY = 16;

  // Header Banner
  doc.setFillColor(...colors.primaryDark);
  doc.roundedRect(margin, currentY, printableWidth, 24, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('DEVSECOPS EXECUTIVE SECURITY SUMMARY', margin + 8, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...colors.primaryCyan);
  doc.text('SIH-Aligned Distributed Git Repository Security Scan Dashboard', margin + 8, currentY + 17);

  doc.setFontSize(7.5);
  doc.setTextColor(200, 210, 225);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin - 8, currentY + 14, { align: 'right' });

  currentY += 30;

  // Posture Key Metrics Cards
  const colWidth = (printableWidth - 6) / 3;
  const cardHeight = 20;

  // Card 1: Health Score
  doc.setFillColor(...colors.cardBg);
  doc.setDrawColor(...colors.cardBorder);
  doc.roundedRect(margin, currentY, colWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...colors.textMuted);
  doc.text('HEALTH SCORE', margin + 4, currentY + 6);
  doc.setFontSize(13);
  doc.setTextColor(...colors.clean);
  doc.text(`${stats?.healthScore || '100%'} (Grade ${stats?.healthGrade || 'A'})`, margin + 4, currentY + 14);

  // Card 2: Open Critical Issues
  doc.setFillColor(...colors.cardBg);
  doc.roundedRect(margin + colWidth + 3, currentY, colWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...colors.textMuted);
  doc.text('OPEN CRITICAL FINDINGS', margin + colWidth + 7, currentY + 6);
  doc.setFontSize(13);
  doc.setTextColor(...colors.critical);
  doc.text(String(stats?.openCriticalFindings || 0), margin + colWidth + 7, currentY + 14);

  // Card 3: Tracked & Fresh Repositories
  doc.setFillColor(...colors.cardBg);
  doc.roundedRect(margin + (colWidth + 3) * 2, currentY, colWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...colors.textMuted);
  doc.text('TRACKED REPOSITORIES', margin + (colWidth + 3) * 2 + 4, currentY + 6);
  doc.setFontSize(13);
  doc.setTextColor(...colors.primaryDark);
  doc.text(`${stats?.totalRepositories || 0} (${stats?.freshness?.fresh || 0} Fresh)`, margin + (colWidth + 3) * 2 + 4, currentY + 14);

  currentY += 26;

  // Section: Repository Risk Matrix
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...colors.primaryDark);
  doc.text('Repository Security Posture Breakdown', margin, currentY);

  currentY += 4;

  const tableData = repositoryRiskTable.map((r, idx) => [
    String(idx + 1),
    r.fullName || r.name,
    r.branch || 'main',
    r.score !== null ? `${r.score}% (${r.grade})` : 'Pending/Failed',
    String(r.openCriticalCount || 0),
    String(r.openHighCount || 0),
    r.freshness === 'FRESH' ? 'Fresh' : r.freshness === 'STALE' ? 'Stale (>7d)' : 'Never Scanned',
    r.scanStatus || 'PENDING',
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 16 },
    head: [['#', 'Repository', 'Branch', 'Score', 'Crit', 'High', 'Hygiene', 'Status']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: colors.textDark,
      lineColor: colors.cardBorder,
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: colors.primaryDark,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 48 },
      2: { cellWidth: 20 },
      3: { cellWidth: 26, fontStyle: 'bold' },
      4: { cellWidth: 14, halign: 'center', textColor: colors.critical },
      5: { cellWidth: 14, halign: 'center', textColor: colors.high },
      6: { cellWidth: 25 },
      7: { cellWidth: 28, halign: 'center' },
    },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // Section: Recommended Actions
  if (recommendedActions.length > 0 && currentY < pageHeight - 40) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...colors.primaryDark);
    doc.text('Top Priority Action Items', margin, currentY);
    currentY += 5;

    recommendedActions.slice(0, 4).forEach((act) => {
      if (currentY > pageHeight - 20) return;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(act.priority === 'CRITICAL' ? colors.critical[0] : colors.primaryDark[0], act.priority === 'CRITICAL' ? colors.critical[1] : colors.primaryDark[1], act.priority === 'CRITICAL' ? colors.critical[2] : colors.primaryDark[2]);
      doc.text(`• [${act.priority}] ${act.title}`, margin + 2, currentY);
      currentY += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...colors.textMuted);
      doc.text(act.description, margin + 5, currentY);
      currentY += 5;
    });
  }

  // Running Page Footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...colors.cardBorder);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...colors.textMuted);
    doc.text('Git Repository Security Scan Dashboard • DevSecOps Command Center Executive Summary', margin, pageHeight - 6);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  }

  const dateStamp = new Date().toISOString().split('T')[0];
  const filename = `security-executive-summary-${dateStamp}.pdf`;
  doc.save(filename);
  return filename;
};
