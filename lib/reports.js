import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { formatDuration, getSeverityEmoji, getSeverityColor } from './utils.js';

/**
 * Generate a comprehensive report from scan results
 * @param {Object} scanResult - Scan result object
 * @param {Object} options - Report generation options
 * @returns {Promise<string|Object>} Generated report
 */
export async function generateReport(scanResult, options = {}) {
  const { format = 'json', includeRawOutput = false, template = 'default' } = options;
  
  switch (format.toLowerCase()) {
    case 'json':
      return generateJsonReport(scanResult, { includeRawOutput });
    case 'html':
      return generateHtmlReport(scanResult, { template });
    case 'csv':
      return generateCsvReport(scanResult);
    case 'xml':
      return generateXmlReport(scanResult);
    case 'markdown':
      return generateMarkdownReport(scanResult);
    case 'txt':
    case 'text':
      return generateTextReport(scanResult);
    default:
      throw new Error(`Unsupported report format: ${format}`);
  }
}

/**
 * Export report to file
 * @param {Object} scanResult - Scan result object
 * @param {string} filePath - Output file path
 * @param {Object} options - Export options
 */
export async function exportReport(scanResult, filePath, options = {}) {
  const { format = 'json' } = options;
  
  const report = await generateReport(scanResult, options);
  writeFileSync(filePath, report);
  
  return {
    filePath,
    format,
    size: Buffer.byteLength(report, 'utf8')
  };
}

/**
 * Get available report formats
 * @returns {Array} Array of supported formats
 */
export function getReportFormats() {
  return [
    { format: 'json', description: 'JSON format for programmatic use', extension: '.json' },
    { format: 'html', description: 'HTML report for web viewing', extension: '.html' },
    { format: 'csv', description: 'CSV format for spreadsheet analysis', extension: '.csv' },
    { format: 'xml', description: 'XML format for structured data', extension: '.xml' },
    { format: 'markdown', description: 'Markdown format for documentation', extension: '.md' },
    { format: 'text', description: 'Plain text format for console output', extension: '.txt' }
  ];
}

/**
 * Generate JSON report
 * @param {Object} scanResult - Scan result object
 * @param {Object} options - Generation options
 * @returns {string} JSON report
 */
function generateJsonReport(scanResult, options = {}) {
  const { includeRawOutput = false } = options;
  
  const report = {
    metadata: {
      reportGeneratedAt: new Date().toISOString(),
      scanId: scanResult.id,
      target: scanResult.target,
      scanDuration: scanResult.duration,
      toolsUsed: scanResult.tools,
      reportVersion: '1.0'
    },
    summary: {
      ...scanResult.summary,
      status: scanResult.status,
      startTime: scanResult.startTime,
      endTime: scanResult.endTime
    },
    vulnerabilities: scanResult.vulnerabilities.map(vuln => ({
      ...vuln,
      discoveredAt: scanResult.startTime,
      scanId: scanResult.id
    })),
    toolResults: Object.keys(scanResult.results).map(tool => ({
      tool,
      status: scanResult.results[tool].status,
      vulnerabilityCount: scanResult.results[tool].vulnerabilities?.length || 0,
      ...(includeRawOutput && { rawOutput: scanResult.results[tool].rawOutput })
    }))
  };
  
  return JSON.stringify(report, null, 2);
}

/**
 * Generate HTML report
 * @param {Object} scanResult - Scan result object
 * @param {Object} options - Generation options
 * @returns {string} HTML report
 */
function generateHtmlReport(scanResult, options = {}) {
  const { template = 'default' } = options;
  
  const vulnerabilitiesByTool = {};
  scanResult.vulnerabilities.forEach(vuln => {
    if (!vulnerabilitiesByTool[vuln.source]) {
      vulnerabilitiesByTool[vuln.source] = [];
    }
    vulnerabilitiesByTool[vuln.source].push(vuln);
  });
  
  const severityColors = {
    critical: '#dc3545',
    high: '#fd7e14',
    medium: '#ffc107',
    low: '#17a2b8',
    info: '#6c757d'
  };
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Scan Report - ${scanResult.target}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
        .content {
            padding: 30px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border-left: 4px solid #007bff;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #495057;
        }
        .summary-card .value {
            font-size: 2em;
            font-weight: bold;
            color: #007bff;
        }
        .severity-breakdown {
            display: flex;
            gap: 15px;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        .severity-badge {
            padding: 8px 16px;
            border-radius: 20px;
            color: white;
            font-weight: bold;
            text-align: center;
            min-width: 60px;
        }
        .vulnerability-section {
            margin: 30px 0;
        }
        .vulnerability-section h2 {
            color: #495057;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 10px;
        }
        .vulnerability-card {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            margin: 15px 0;
            overflow: hidden;
        }
        .vulnerability-header {
            padding: 15px 20px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .vulnerability-title {
            font-weight: bold;
            color: #495057;
        }
        .vulnerability-body {
            padding: 20px;
        }
        .vulnerability-meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #e9ecef;
        }
        .meta-item {
            display: flex;
            flex-direction: column;
        }
        .meta-label {
            font-weight: bold;
            color: #6c757d;
            font-size: 0.9em;
            margin-bottom: 5px;
        }
        .meta-value {
            color: #495057;
            word-break: break-all;
        }
        .tool-section {
            margin: 30px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .tool-status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.9em;
            font-weight: bold;
        }
        .status-completed { background: #d4edda; color: #155724; }
        .status-error { background: #f8d7da; color: #721c24; }
        .status-skipped { background: #fff3cd; color: #856404; }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #6c757d;
            border-top: 1px solid #e9ecef;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ Security Scan Report</h1>
            <p>Target: <strong>${scanResult.target}</strong></p>
            <p>Scan completed on ${new Date(scanResult.endTime || scanResult.startTime).toLocaleString()}</p>
        </div>
        
        <div class="content">
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>Total Vulnerabilities</h3>
                    <div class="value">${scanResult.summary.total}</div>
                </div>
                <div class="summary-card">
                    <h3>Scan Duration</h3>
                    <div class="value">${formatDuration(scanResult.duration || 0)}</div>
                </div>
                <div class="summary-card">
                    <h3>Tools Used</h3>
                    <div class="value">${scanResult.tools.length}</div>
                </div>
                <div class="summary-card">
                    <h3>Status</h3>
                    <div class="value" style="color: ${scanResult.status === 'completed' ? '#28a745' : '#dc3545'}">${scanResult.status.toUpperCase()}</div>
                </div>
            </div>
            
            <div class="severity-breakdown">
                ${Object.entries(scanResult.summary)
                  .filter(([key]) => key !== 'total')
                  .map(([severity, count]) => 
                    `<div class="severity-badge" style="background-color: ${severityColors[severity] || '#6c757d'}">
                        ${severity.toUpperCase()}: ${count}
                    </div>`
                  ).join('')}
            </div>
            
            <div class="tool-section">
                <h2>🔧 Tool Results</h2>
                ${Object.entries(scanResult.results).map(([tool, result]) => `
                    <div style="margin: 10px 0; display: flex; justify-content: space-between; align-items: center;">
                        <strong>${tool.toUpperCase()}</strong>
                        <span class="tool-status status-${result.status}">${result.status}</span>
                    </div>
                `).join('')}
            </div>
            
            ${scanResult.vulnerabilities.length > 0 ? `
            <div class="vulnerability-section">
                <h2>🚨 Vulnerabilities Found</h2>
                ${scanResult.vulnerabilities.map(vuln => `
                    <div class="vulnerability-card">
                        <div class="vulnerability-header">
                            <div class="vulnerability-title">${vuln.title || 'Unknown Vulnerability'}</div>
                            <div class="severity-badge" style="background-color: ${severityColors[vuln.severity] || '#6c757d'}">
                                ${vuln.severity?.toUpperCase() || 'UNKNOWN'}
                            </div>
                        </div>
                        <div class="vulnerability-body">
                            <p>${vuln.description || 'No description available'}</p>
                            <div class="vulnerability-meta">
                                <div class="meta-item">
                                    <div class="meta-label">Source Tool</div>
                                    <div class="meta-value">${vuln.source || 'Unknown'}</div>
                                </div>
                                <div class="meta-item">
                                    <div class="meta-label">URL</div>
                                    <div class="meta-value">${vuln.url || 'N/A'}</div>
                                </div>
                                <div class="meta-item">
                                    <div class="meta-label">Method</div>
                                    <div class="meta-value">${vuln.method || 'N/A'}</div>
                                </div>
                                <div class="meta-item">
                                    <div class="meta-label">Category</div>
                                    <div class="meta-value">${vuln.category || 'N/A'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            ` : '<div class="vulnerability-section"><h2>✅ No Vulnerabilities Found</h2><p>Great! No security vulnerabilities were detected during this scan.</p></div>'}
        </div>
        
        <div class="footer">
            <p>Report generated by @profullstack/scanner on ${new Date().toLocaleString()}</p>
            <p>Scan ID: ${scanResult.id}</p>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Generate CSV report
 * @param {Object} scanResult - Scan result object
 * @returns {string} CSV report
 */
function generateCsvReport(scanResult) {
  const headers = [
    'Vulnerability ID',
    'Title',
    'Severity',
    'Description',
    'URL',
    'Method',
    'Parameter',
    'Category',
    'Source Tool',
    'Scan ID'
  ];
  
  const rows = scanResult.vulnerabilities.map(vuln => [
    vuln.id || '',
    vuln.title || '',
    vuln.severity || '',
    (vuln.description || '').replace(/"/g, '""'),
    vuln.url || '',
    vuln.method || '',
    vuln.parameter || vuln.param || '',
    vuln.category || '',
    vuln.source || '',
    scanResult.id
  ]);
  
  const csvContent = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
}

/**
 * Generate XML report
 * @param {Object} scanResult - Scan result object
 * @returns {string} XML report
 */
function generateXmlReport(scanResult) {
  const escapeXml = (str) => {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<scanReport>
    <metadata>
        <scanId>${escapeXml(scanResult.id)}</scanId>
        <target>${escapeXml(scanResult.target)}</target>
        <startTime>${escapeXml(scanResult.startTime)}</startTime>
        <endTime>${escapeXml(scanResult.endTime || '')}</endTime>
        <duration>${scanResult.duration || 0}</duration>
        <status>${escapeXml(scanResult.status)}</status>
        <reportGeneratedAt>${escapeXml(new Date().toISOString())}</reportGeneratedAt>
    </metadata>
    
    <summary>
        <totalVulnerabilities>${scanResult.summary.total}</totalVulnerabilities>
        <critical>${scanResult.summary.critical}</critical>
        <high>${scanResult.summary.high}</high>
        <medium>${scanResult.summary.medium}</medium>
        <low>${scanResult.summary.low}</low>
        <info>${scanResult.summary.info}</info>
    </summary>
    
    <tools>
        ${scanResult.tools.map(tool => `<tool>${escapeXml(tool)}</tool>`).join('\n        ')}
    </tools>
    
    <vulnerabilities>
        ${scanResult.vulnerabilities.map(vuln => `
        <vulnerability>
            <id>${escapeXml(vuln.id || '')}</id>
            <title>${escapeXml(vuln.title || '')}</title>
            <severity>${escapeXml(vuln.severity || '')}</severity>
            <description>${escapeXml(vuln.description || '')}</description>
            <url>${escapeXml(vuln.url || '')}</url>
            <method>${escapeXml(vuln.method || '')}</method>
            <parameter>${escapeXml(vuln.parameter || vuln.param || '')}</parameter>
            <category>${escapeXml(vuln.category || '')}</category>
            <source>${escapeXml(vuln.source || '')}</source>
        </vulnerability>`).join('\n        ')}
    </vulnerabilities>
</scanReport>`;
}

/**
 * Generate Markdown report
 * @param {Object} scanResult - Scan result object
 * @returns {string} Markdown report
 */
function generateMarkdownReport(scanResult) {
  const severityEmojis = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🔵',
    info: '⚪'
  };
  
  return `# 🛡️ Security Scan Report

**Target:** ${scanResult.target}  
**Scan ID:** ${scanResult.id}  
**Status:** ${scanResult.status}  
**Duration:** ${formatDuration(scanResult.duration || 0)}  
**Completed:** ${new Date(scanResult.endTime || scanResult.startTime).toLocaleString()}

## 📊 Summary

| Metric | Value |
|--------|-------|
| Total Vulnerabilities | ${scanResult.summary.total} |
| Critical | ${severityEmojis.critical} ${scanResult.summary.critical} |
| High | ${severityEmojis.high} ${scanResult.summary.high} |
| Medium | ${severityEmojis.medium} ${scanResult.summary.medium} |
| Low | ${severityEmojis.low} ${scanResult.summary.low} |
| Info | ${severityEmojis.info} ${scanResult.summary.info} |

## 🔧 Tools Used

${scanResult.tools.map(tool => `- **${tool.toUpperCase()}**: ${scanResult.results[tool]?.status || 'unknown'}`).join('\n')}

${scanResult.vulnerabilities.length > 0 ? `
## 🚨 Vulnerabilities

${scanResult.vulnerabilities.map((vuln, index) => `
### ${index + 1}. ${vuln.title || 'Unknown Vulnerability'} ${severityEmojis[vuln.severity] || '⚪'}

**Severity:** ${vuln.severity?.toUpperCase() || 'UNKNOWN'}  
**Source:** ${vuln.source || 'Unknown'}  
**Category:** ${vuln.category || 'N/A'}

**Description:**  
${vuln.description || 'No description available'}

**Details:**
- **URL:** ${vuln.url || 'N/A'}
- **Method:** ${vuln.method || 'N/A'}
- **Parameter:** ${vuln.parameter || vuln.param || 'N/A'}

---
`).join('\n')}
` : `
## ✅ No Vulnerabilities Found

Great! No security vulnerabilities were detected during this scan.
`}

---
*Report generated by @profullstack/scanner on ${new Date().toLocaleString()}*
`;
}

/**
 * Generate plain text report
 * @param {Object} scanResult - Scan result object
 * @returns {string} Text report
 */
function generateTextReport(scanResult) {
  const lines = [];
  
  lines.push('='.repeat(60));
  lines.push('SECURITY SCAN REPORT');
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`Target: ${scanResult.target}`);
  lines.push(`Scan ID: ${scanResult.id}`);
  lines.push(`Status: ${scanResult.status}`);
  lines.push(`Duration: ${formatDuration(scanResult.duration || 0)}`);
  lines.push(`Completed: ${new Date(scanResult.endTime || scanResult.startTime).toLocaleString()}`);
  lines.push('');
  
  lines.push('SUMMARY');
  lines.push('-'.repeat(20));
  lines.push(`Total Vulnerabilities: ${scanResult.summary.total}`);
  lines.push(`Critical: ${scanResult.summary.critical}`);
  lines.push(`High: ${scanResult.summary.high}`);
  lines.push(`Medium: ${scanResult.summary.medium}`);
  lines.push(`Low: ${scanResult.summary.low}`);
  lines.push(`Info: ${scanResult.summary.info}`);
  lines.push('');
  
  lines.push('TOOLS USED');
  lines.push('-'.repeat(20));
  scanResult.tools.forEach(tool => {
    const status = scanResult.results[tool]?.status || 'unknown';
    lines.push(`${tool.toUpperCase()}: ${status}`);
  });
  lines.push('');
  
  if (scanResult.vulnerabilities.length > 0) {
    lines.push('VULNERABILITIES');
    lines.push('-'.repeat(20));
    
    scanResult.vulnerabilities.forEach((vuln, index) => {
      lines.push(`${index + 1}. ${vuln.title || 'Unknown Vulnerability'}`);
      lines.push(`   Severity: ${vuln.severity?.toUpperCase() || 'UNKNOWN'}`);
      lines.push(`   Source: ${vuln.source || 'Unknown'}`);
      lines.push(`   Category: ${vuln.category || 'N/A'}`);
      lines.push(`   URL: ${vuln.url || 'N/A'}`);
      lines.push(`   Method: ${vuln.method || 'N/A'}`);
      if (vuln.parameter || vuln.param) {
        lines.push(`   Parameter: ${vuln.parameter || vuln.param}`);
      }
      lines.push(`   Description: ${vuln.description || 'No description available'}`);
      lines.push('');
    });
  } else {
    lines.push('NO VULNERABILITIES FOUND');
    lines.push('-'.repeat(20));
    lines.push('Great! No security vulnerabilities were detected during this scan.');
    lines.push('');
  }
  
  lines.push('='.repeat(60));
  lines.push(`Report generated by @profullstack/scanner on ${new Date().toLocaleString()}`);
  lines.push('='.repeat(60));
  
  return lines.join('\n');
}