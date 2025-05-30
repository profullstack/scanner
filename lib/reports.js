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
  const {
    format = 'json',
    includeRawOutput = false,
    template = 'default',
    uiFormat = false,
    multiFormat = false
  } = options;
  
  // If multiFormat is true, generate reports in multiple formats
  if (multiFormat) {
    const formats = Array.isArray(format) ? format : [format];
    const reports = {};
    
    for (const fmt of formats) {
      reports[fmt] = await generateSingleReport(scanResult, {
        ...options,
        format: fmt,
        multiFormat: false
      });
    }
    
    return reports;
  }
  
  return generateSingleReport(scanResult, options);
}

/**
 * Generate a single format report
 * @param {Object} scanResult - Scan result object
 * @param {Object} options - Report generation options
 * @returns {Promise<string|Object>} Generated report
 */
async function generateSingleReport(scanResult, options = {}) {
  const {
    format = 'json',
    includeRawOutput = false,
    template = 'default',
    uiFormat = false
  } = options;
  
  switch (format.toLowerCase()) {
    case 'json':
      return generateJsonReport(scanResult, { includeRawOutput, uiFormat });
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
      return generateTextReport(scanResult, { detailed: options.detailed });
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
  const {
    format = 'json',
    multiFormat = false,
    outputDir = null
  } = options;
  
  // If multiFormat is true, export reports in multiple formats
  if (multiFormat) {
    const formats = Array.isArray(format) ? format : [format];
    const results = [];
    
    for (const fmt of formats) {
      const fileExt = getFileExtension(fmt);
      const outputPath = outputDir
        ? join(outputDir, `report.${fileExt}`)
        : filePath.replace(/\.[^/.]+$/, `.${fileExt}`);
      
      const result = await exportSingleReport(scanResult, outputPath, {
        ...options,
        format: fmt,
        multiFormat: false
      });
      
      results.push(result);
    }
    
    return results;
  }
  
  return exportSingleReport(scanResult, filePath, options);
}

/**
 * Export a single format report to file
 * @param {Object} scanResult - Scan result object
 * @param {string} filePath - Output file path
 * @param {Object} options - Export options
 * @returns {Object} Export result
 */
async function exportSingleReport(scanResult, filePath, options = {}) {
  const { format = 'json' } = options;
  
  const report = await generateReport(scanResult, options);
  
  // Handle JSON format specially if it's an object (multiFormat case)
  const content = typeof report === 'object' ? JSON.stringify(report, null, 2) : report;
  writeFileSync(filePath, content);
  
  return {
    filePath,
    format,
    size: Buffer.byteLength(content, 'utf8')
  };
}

/**
 * Get file extension for a format
 * @param {string} format - Report format
 * @returns {string} File extension
 */
function getFileExtension(format) {
  const formats = getReportFormats();
  const formatInfo = formats.find(f => f.format === format);
  return formatInfo ? formatInfo.extension.replace('.', '') : format;
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
  const { includeRawOutput = false, uiFormat = false } = options;
  
  // Enhanced report structure for better UI integration
  const report = {
    schema_version: "2.0",
    metadata: {
      report_generated_at: new Date().toISOString(),
      scan_id: scanResult.id,
      target: scanResult.target,
      target_url: scanResult.parsedUrl?.href || scanResult.target,
      target_hostname: scanResult.parsedUrl?.hostname || null,
      scan_duration_seconds: scanResult.duration,
      scan_duration_formatted: formatDuration(scanResult.duration || 0),
      tools_used: scanResult.tools,
      report_version: '2.0',
      status: scanResult.status,
      start_time: scanResult.startTime,
      end_time: scanResult.endTime || null,
      project_id: scanResult.projectId || null,
      scan_profile: scanResult.scanProfile || null
    },
    summary: {
      total_vulnerabilities: scanResult.summary.total,
      severity_counts: {
        critical: scanResult.summary.critical,
        high: scanResult.summary.high,
        medium: scanResult.summary.medium,
        low: scanResult.summary.low,
        info: scanResult.summary.info
      },
      tools_count: scanResult.tools.length,
      successful_tools: Object.values(scanResult.results).filter(r => r.status === 'completed').length,
      failed_tools: Object.values(scanResult.results).filter(r => r.status === 'error').length,
      skipped_tools: Object.values(scanResult.results).filter(r => r.status === 'skipped').length
    },
    vulnerabilities: scanResult.vulnerabilities.map(vuln => ({
      id: vuln.id || `vuln-${Math.random().toString(36).substring(2, 11)}`,
      title: vuln.title || 'Unknown Vulnerability',
      severity: vuln.severity || 'info',
      severity_score: getSeverityScore(vuln.severity),
      description: vuln.description || 'No description available',
      url: vuln.url || null,
      method: vuln.method || null,
      parameter: vuln.parameter || vuln.param || null,
      category: vuln.category || 'General',
      source_tool: vuln.source || 'unknown',
      discovered_at: scanResult.startTime,
      scan_id: scanResult.id,
      evidence: vuln.evidence || null,
      solution: vuln.solution || null,
      references: vuln.reference || vuln.references || [],
      cwe_id: vuln.cwe || null,
      cvss_score: vuln.cvss || null,
      tags: vuln.tags || [],
      location: {
        url: vuln.url || null,
        path: vuln.path || null,
        line: vuln.line || null,
        parameter: vuln.parameter || vuln.param || null
      }
    })),
    tool_results: Object.keys(scanResult.results).map(tool => ({
      tool_name: tool,
      status: scanResult.results[tool].status,
      vulnerability_count: scanResult.results[tool].vulnerabilities?.length || 0,
      error_message: scanResult.results[tool].error || null,
      output_file: scanResult.results[tool].outputFile || null,
      ...(includeRawOutput && { raw_output: scanResult.results[tool].rawOutput })
    })),
    output_location: scanResult.outputDir || null
  };
  
  // If not UI format, convert to camelCase for backward compatibility
  if (!uiFormat) {
    return JSON.stringify(report, null, 2);
  }
  
  // For UI format, add additional UI-friendly properties
  const uiReport = {
    ...report,
    ui: {
      severity_colors: {
        critical: '#dc3545',
        high: '#fd7e14',
        medium: '#ffc107',
        low: '#17a2b8',
        info: '#6c757d'
      },
      severity_icons: {
        critical: 'critical-icon',
        high: 'high-icon',
        medium: 'medium-icon',
        low: 'low-icon',
        info: 'info-icon'
      },
      vulnerability_groups: groupVulnerabilitiesByCategory(scanResult.vulnerabilities),
      tool_status_summary: summarizeToolStatus(scanResult.results),
      charts_data: generateChartsData(scanResult)
    }
  };
  
  return JSON.stringify(uiReport, null, 2);
}

/**
 * Get numeric score for severity level (for sorting)
 * @param {string} severity - Severity level
 * @returns {number} Severity score
 */
function getSeverityScore(severity) {
  const scores = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    info: 1
  };
  return scores[severity?.toLowerCase()] || 0;
}

/**
 * Group vulnerabilities by category for UI display
 * @param {Array} vulnerabilities - Array of vulnerabilities
 * @returns {Object} Grouped vulnerabilities
 */
function groupVulnerabilitiesByCategory(vulnerabilities) {
  const groups = {};
  
  vulnerabilities.forEach(vuln => {
    const category = vuln.category || 'Other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(vuln.id);
  });
  
  return groups;
}

/**
 * Summarize tool status for UI display
 * @param {Object} results - Tool results
 * @returns {Object} Status summary
 */
function summarizeToolStatus(results) {
  return Object.keys(results).map(tool => ({
    name: tool,
    status: results[tool].status,
    vulnerability_count: results[tool].vulnerabilities?.length || 0
  }));
}

/**
 * Generate data for UI charts
 * @param {Object} scanResult - Scan result
 * @returns {Object} Chart data
 */
function generateChartsData(scanResult) {
  // Severity distribution
  const severityData = Object.entries(scanResult.summary)
    .filter(([key]) => key !== 'total')
    .map(([severity, count]) => ({
      severity,
      count
    }));
  
  // Vulnerabilities by tool
  const toolData = {};
  scanResult.vulnerabilities.forEach(vuln => {
    const tool = vuln.source || 'unknown';
    toolData[tool] = (toolData[tool] || 0) + 1;
  });
  
  return {
    severity_distribution: severityData,
    vulnerabilities_by_tool: Object.entries(toolData).map(([tool, count]) => ({ tool, count }))
  };
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
function generateTextReport(scanResult, options = {}) {
  const { detailed = false, colorOutput = true } = options;
  const lines = [];
  
  // Helper function to add color to text if colorOutput is enabled
  const colorize = (text, severity) => {
    if (!colorOutput) return text;
    
    const colors = {
      critical: '\x1b[41m\x1b[37m', // Red background, white text
      high: '\x1b[31m',             // Red text
      medium: '\x1b[33m',           // Yellow text
      low: '\x1b[36m',              // Cyan text
      info: '\x1b[37m',             // White text
      success: '\x1b[32m',          // Green text
      warning: '\x1b[33m',          // Yellow text
      error: '\x1b[31m',            // Red text
      bold: '\x1b[1m',              // Bold text
      reset: '\x1b[0m'              // Reset
    };
    
    return `${colors[severity] || ''}${text}${colors.reset}`;
  };
  
  // Helper function to create a section header
  const sectionHeader = (title) => {
    lines.push(colorize(title.toUpperCase(), 'bold'));
    lines.push(colorize('-'.repeat(title.length), 'bold'));
  };
  
  // Report header
  lines.push(colorize('='.repeat(80), 'bold'));
  lines.push(colorize('SECURITY SCAN REPORT', 'bold'));
  lines.push(colorize('='.repeat(80), 'bold'));
  lines.push('');
  
  // Basic information
  lines.push(colorize('SCAN INFORMATION', 'bold'));
  lines.push('-'.repeat(30));
  lines.push(`Target: ${colorize(scanResult.target, 'bold')}`);
  if (scanResult.parsedUrl) {
    lines.push(`URL: ${scanResult.parsedUrl.href}`);
    lines.push(`Hostname: ${scanResult.parsedUrl.hostname}`);
  }
  lines.push(`Scan ID: ${scanResult.id}`);
  lines.push(`Status: ${colorize(scanResult.status.toUpperCase(), scanResult.status === 'completed' ? 'success' : 'error')}`);
  lines.push(`Duration: ${colorize(formatDuration(scanResult.duration || 0), 'bold')}`);
  lines.push(`Started: ${new Date(scanResult.startTime).toLocaleString()}`);
  lines.push(`Completed: ${new Date(scanResult.endTime || scanResult.startTime).toLocaleString()}`);
  if (scanResult.projectId) {
    lines.push(`Project ID: ${scanResult.projectId}`);
  }
  if (scanResult.scanProfile) {
    lines.push(`Scan Profile: ${scanResult.scanProfile}`);
  }
  lines.push(`Output Directory: ${scanResult.outputDir || 'N/A'}`);
  lines.push('');
  
  // Vulnerability summary
  sectionHeader('VULNERABILITY SUMMARY');
  
  // Create a visual representation of vulnerability counts
  const createBar = (count, total, width = 40) => {
    if (total === 0) return '[' + ' '.repeat(width) + '] 0%';
    const percentage = Math.min(count / total, 1);
    const filled = Math.floor(percentage * width);
    const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
    const percent = Math.floor(percentage * 100);
    return `[${bar}] ${percent}%`;
  };
  
  const total = scanResult.summary.total;
  
  lines.push(`Total Vulnerabilities: ${colorize(total.toString(), total > 0 ? 'warning' : 'success')}`);
  lines.push('');
  
  if (total > 0) {
    lines.push(`Critical: ${colorize(scanResult.summary.critical.toString().padStart(3), 'critical')} ${createBar(scanResult.summary.critical, total)}`);
    lines.push(`High:     ${colorize(scanResult.summary.high.toString().padStart(3), 'high')} ${createBar(scanResult.summary.high, total)}`);
    lines.push(`Medium:   ${colorize(scanResult.summary.medium.toString().padStart(3), 'medium')} ${createBar(scanResult.summary.medium, total)}`);
    lines.push(`Low:      ${colorize(scanResult.summary.low.toString().padStart(3), 'low')} ${createBar(scanResult.summary.low, total)}`);
    lines.push(`Info:     ${colorize(scanResult.summary.info.toString().padStart(3), 'info')} ${createBar(scanResult.summary.info, total)}`);
  } else {
    lines.push(colorize('No vulnerabilities found! Your application appears to be secure.', 'success'));
  }
  lines.push('');
  
  // Tools summary
  sectionHeader('TOOLS SUMMARY');
  
  // Calculate column widths for better formatting
  const toolNameWidth = Math.max(...scanResult.tools.map(t => t.length), 10);
  const statusWidth = 10;
  const countWidth = 12;
  
  // Table header
  lines.push(`${'TOOL'.padEnd(toolNameWidth)} | ${'STATUS'.padEnd(statusWidth)} | ${'VULNS FOUND'.padEnd(countWidth)}`);
  lines.push(`${'-'.repeat(toolNameWidth)}-+-${'-'.repeat(statusWidth)}-+-${'-'.repeat(countWidth)}`);
  
  // Table rows
  scanResult.tools.forEach(tool => {
    const result = scanResult.results[tool] || {};
    const status = result.status || 'unknown';
    const vulnCount = result.vulnerabilities?.length || 0;
    
    const statusColor = status === 'completed' ? 'success' :
                        status === 'error' ? 'error' : 'warning';
    
    lines.push(
      `${tool.toUpperCase().padEnd(toolNameWidth)} | ` +
      `${colorize(status.padEnd(statusWidth), statusColor)} | ` +
      `${vulnCount.toString().padEnd(countWidth)}`
    );
    
    // Add error message if available
    if (status === 'error' && result.error && detailed) {
      lines.push(`  ${colorize('Error: ' + result.error, 'error')}`);
    }
  });
  lines.push('');
  
  // Vulnerabilities details
  if (scanResult.vulnerabilities.length > 0) {
    sectionHeader('VULNERABILITIES DETAILS');
    
    // Sort vulnerabilities by severity
    const sortedVulns = [...scanResult.vulnerabilities].sort((a, b) => {
      const severityOrder = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
      return (severityOrder[b.severity?.toLowerCase()] || 0) - (severityOrder[a.severity?.toLowerCase()] || 0);
    });
    
    sortedVulns.forEach((vuln, index) => {
      const severity = vuln.severity?.toLowerCase() || 'info';
      
      lines.push(colorize(`[${severity.toUpperCase()}] ${index + 1}. ${vuln.title || 'Unknown Vulnerability'}`, severity));
      lines.push('-'.repeat(80));
      
      // Basic info
      lines.push(`Source Tool: ${vuln.source || 'Unknown'}`);
      lines.push(`Category: ${vuln.category || 'N/A'}`);
      
      // Location info
      if (vuln.url) {
        lines.push(`URL: ${vuln.url}`);
      }
      if (vuln.method) {
        lines.push(`Method: ${vuln.method}`);
      }
      if (vuln.parameter || vuln.param) {
        lines.push(`Parameter: ${vuln.parameter || vuln.param}`);
      }
      
      // Description
      lines.push('');
      lines.push('Description:');
      lines.push(vuln.description || 'No description available');
      
      // Additional details for detailed mode
      if (detailed) {
        lines.push('');
        if (vuln.evidence) {
          lines.push('Evidence:');
          lines.push(vuln.evidence);
          lines.push('');
        }
        
        if (vuln.solution) {
          lines.push('Solution:');
          lines.push(vuln.solution);
          lines.push('');
        }
        
        if (vuln.reference || vuln.references) {
          const refs = Array.isArray(vuln.references) ? vuln.references :
                      Array.isArray(vuln.reference) ? vuln.reference :
                      vuln.reference ? [vuln.reference] : [];
          
          if (refs.length > 0) {
            lines.push('References:');
            refs.forEach(ref => lines.push(`- ${ref}`));
            lines.push('');
          }
        }
        
        if (vuln.cwe) {
          lines.push(`CWE: ${vuln.cwe}`);
        }
        
        if (vuln.cvss) {
          lines.push(`CVSS Score: ${vuln.cvss}`);
        }
      }
      
      lines.push('');
    });
  } else {
    lines.push('NO VULNERABILITIES FOUND');
    lines.push('-'.repeat(30));
    lines.push(colorize('Great! No security vulnerabilities were detected during this scan.', 'success'));
    lines.push('');
  }
  
  // Footer
  lines.push(colorize('='.repeat(80), 'bold'));
  lines.push(`Report generated by @profullstack/scanner v2.0 on ${new Date().toLocaleString()}`);
  lines.push(colorize('='.repeat(80), 'bold'));
  
  return lines.join('\n');
}