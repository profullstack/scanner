import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { validateTarget, parseUrl } from './utils.js';
import { runNikto, runHttpx, runWapiti, runNuclei, runSqlmap, checkToolAvailability } from './tools.js';
import { generateReport } from './reports.js';
import { addScanToHistory, getProject } from './config.js';

const execAsync = promisify(exec);

// Get data directory
function getDataDir() {
  const dataDir = join(homedir(), '.config', 'scanner');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

// Get scans file path
function getScansFile() {
  return join(getDataDir(), 'scans.json');
}

// Load scan history
function loadScans() {
  const scansFile = getScansFile();
  if (!existsSync(scansFile)) {
    return [];
  }
  
  try {
    const data = readFileSync(scansFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Warning: Could not load scan history:', error.message);
    return [];
  }
}

// Save scan history
function saveScans(scans) {
  const scansFile = getScansFile();
  try {
    writeFileSync(scansFile, JSON.stringify(scans, null, 2));
  } catch (error) {
    console.error('Error saving scan history:', error.message);
  }
}

// Save individual scan result
function saveScan(scanResult) {
  const scans = loadScans();
  scans.push(scanResult);
  saveScans(scans);
}

/**
 * Main scanning function that orchestrates multiple security tools
 * @param {string} target - Target URL or IP address
 * @param {Object} options - Scanning options
 * @param {Array} options.tools - Array of tools to use ['nikto', 'httpx', 'wapiti', 'nuclei', 'sqlmap']
 * @param {string} options.outputDir - Directory to save results
 * @param {boolean} options.verbose - Enable verbose output
 * @param {number} options.timeout - Timeout in seconds for each tool
 * @param {Object} options.toolOptions - Specific options for each tool
 * @param {string} options.projectId - Project ID to associate scan with
 * @param {string} options.scanProfile - Scan profile used
 * @returns {Promise<Object>} Scan results
 */
export async function scanTarget(target, options = {}) {
  const {
    tools = ['nikto', 'wapiti', 'nuclei'],
    outputDir = join(getDataDir(), 'scans', `scan-${Date.now()}`),
    verbose = false,
    timeout = 300,
    toolOptions = {},
    auth = null,
    headers = {},
    projectId = null,
    scanProfile = null
  } = options;

  // Validate target
  const validation = validateTarget(target);
  if (!validation.valid) {
    throw new Error(`Invalid target: ${validation.error}`);
  }

  const parsedUrl = parseUrl(target);
  const scanId = `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const scanResult = {
    id: scanId,
    target: target,
    parsedUrl: parsedUrl,
    startTime: new Date().toISOString(),
    endTime: null,
    duration: null,
    tools: tools,
    status: 'running',
    results: {},
    vulnerabilities: [],
    summary: {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    },
    outputDir: outputDir,
    projectId: projectId,
    scanProfile: scanProfile,
    metadata: {
      userAgent: null,
      scanProfile: scanProfile,
      toolOptions: toolOptions,
      auth: auth ? { type: auth.type, username: auth.username } : null,
      customHeaders: Object.keys(headers).length > 0 ? Object.keys(headers) : null
    }
  };

  try {
    // Create output directory
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    if (verbose) {
      console.log(`\n🎯 Starting scan of ${target}`);
      console.log(`📋 Scan ID: ${scanId}`);
      console.log(`🔧 Tools: ${tools.join(', ')}`);
      console.log(`📁 Output directory: ${outputDir}`);
      console.log(`⏱️  Timeout per tool: ${timeout}s\n`);
    }

    // Check tool availability
    const availableTools = await checkToolAvailability(tools);
    const unavailableTools = tools.filter(tool => !availableTools[tool]);
    
    if (unavailableTools.length > 0) {
      console.warn(`Warning: The following tools are not available: ${unavailableTools.join(', ')}`);
    }

    // Run each tool
    for (const tool of tools) {
      if (!availableTools[tool]) {
        scanResult.results[tool] = {
          status: 'skipped',
          reason: 'Tool not available',
          vulnerabilities: []
        };
        continue;
      }

      try {
        if (verbose) {
          console.log(`\n🚀 Starting ${tool.toUpperCase()} scan...`);
        }

        let toolResult;
        const toolOpts = {
          outputDir,
          timeout,
          verbose,
          auth,
          headers,
          ...toolOptions[tool]
        };

        switch (tool) {
          case 'nikto':
            toolResult = await runNikto(target, toolOpts);
            break;
          case 'httpx':
            toolResult = await runHttpx(target, toolOpts);
            break;
          case 'wapiti':
            toolResult = await runWapiti(target, toolOpts);
            break;
          case 'nuclei':
            toolResult = await runNuclei(target, toolOpts);
            break;
          case 'sqlmap':
            toolResult = await runSqlmap(target, toolOpts);
            break;
          default:
            throw new Error(`Unknown tool: ${tool}`);
        }

        scanResult.results[tool] = toolResult;
        
        // Aggregate vulnerabilities
        if (toolResult.vulnerabilities) {
          scanResult.vulnerabilities.push(...toolResult.vulnerabilities.map(vuln => ({
            ...vuln,
            source: tool,
            scanId: scanId
          })));
        }

        if (verbose) {
          console.log(`${tool} completed: ${toolResult.vulnerabilities?.length || 0} vulnerabilities found`);
        }

      } catch (error) {
        console.error(`Error running ${tool}:`, error.message);
        scanResult.results[tool] = {
          status: 'error',
          error: error.message,
          vulnerabilities: []
        };
      }
    }

    // Calculate summary
    scanResult.vulnerabilities.forEach(vuln => {
      scanResult.summary.total++;
      const severity = vuln.severity?.toLowerCase() || 'info';
      if (scanResult.summary[severity] !== undefined) {
        scanResult.summary[severity]++;
      } else {
        scanResult.summary.info++;
      }
    });

    // Mark scan as completed
    scanResult.endTime = new Date().toISOString();
    scanResult.duration = Math.round((new Date(scanResult.endTime) - new Date(scanResult.startTime)) / 1000);
    scanResult.status = 'completed';

    // Generate consolidated report
    try {
      const report = await generateReport(scanResult, { format: 'json' });
      writeFileSync(join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
      
      const htmlReport = await generateReport(scanResult, { format: 'html' });
      writeFileSync(join(outputDir, 'report.html'), htmlReport);
    } catch (reportError) {
      console.warn('Warning: Could not generate report:', reportError.message);
    }

    // Save scan to history
    saveScan(scanResult);
    
    // Save to project history if projectId is provided
    if (projectId) {
      try {
        addScanToHistory(projectId, scanResult);
        if (verbose) {
          const project = getProject(projectId);
          console.log(`Scan added to project: ${project?.name || projectId}`);
        }
      } catch (error) {
        console.warn(`Warning: Could not add scan to project history: ${error.message}`);
      }
    }

    if (verbose) {
      console.log(`Scan completed in ${scanResult.duration} seconds`);
      console.log(`Total vulnerabilities: ${scanResult.summary.total}`);
      console.log(`Results saved to: ${outputDir}`);
    }

    return scanResult;

  } catch (error) {
    scanResult.status = 'failed';
    scanResult.error = error.message;
    scanResult.endTime = new Date().toISOString();
    scanResult.duration = Math.round((new Date(scanResult.endTime) - new Date(scanResult.startTime)) / 1000);
    
    saveScan(scanResult);
    
    // Save failed scan to project history if projectId is provided
    if (projectId) {
      try {
        addScanToHistory(projectId, scanResult);
      } catch (error) {
        console.warn(`Warning: Could not add failed scan to project history: ${error.message}`);
      }
    }
    
    throw error;
  }
}

/**
 * Get scan history
 * @param {number} limit - Maximum number of scans to return
 * @returns {Array} Array of scan results
 */
export function getScanHistory(limit = 10) {
  const scans = loadScans();
  return scans
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
    .slice(0, limit);
}

/**
 * Get all scans
 * @returns {Array} Array of all scan results
 */
export function getAllScans() {
  return loadScans();
}

/**
 * Get scan statistics
 * @returns {Object} Scan statistics
 */
export function getScanStats() {
  const scans = loadScans();
  
  const stats = {
    totalScans: scans.length,
    completedScans: scans.filter(s => s.status === 'completed').length,
    failedScans: scans.filter(s => s.status === 'failed').length,
    totalVulnerabilities: 0,
    severityBreakdown: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    },
    mostScannedTargets: {},
    averageScanTime: 0,
    toolUsage: {}
  };

  let totalDuration = 0;
  let completedWithDuration = 0;

  scans.forEach(scan => {
    // Count vulnerabilities
    stats.totalVulnerabilities += scan.summary?.total || 0;
    
    // Severity breakdown
    if (scan.summary) {
      Object.keys(stats.severityBreakdown).forEach(severity => {
        stats.severityBreakdown[severity] += scan.summary[severity] || 0;
      });
    }

    // Target frequency
    const target = scan.parsedUrl?.hostname || scan.target;
    stats.mostScannedTargets[target] = (stats.mostScannedTargets[target] || 0) + 1;

    // Average scan time
    if (scan.duration) {
      totalDuration += scan.duration;
      completedWithDuration++;
    }

    // Tool usage
    if (scan.tools) {
      scan.tools.forEach(tool => {
        stats.toolUsage[tool] = (stats.toolUsage[tool] || 0) + 1;
      });
    }
  });

  if (completedWithDuration > 0) {
    stats.averageScanTime = Math.round(totalDuration / completedWithDuration);
  }

  // Convert mostScannedTargets to sorted array
  stats.mostScannedTargets = Object.entries(stats.mostScannedTargets)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([target, count]) => ({ target, count }));

  return stats;
}

/**
 * Get scan by ID
 * @param {string} scanId - Scan ID
 * @returns {Object|null} Scan result or null if not found
 */
export function getScanById(scanId) {
  const scans = loadScans();
  return scans.find(scan => scan.id === scanId) || null;
}

/**
 * Delete scan by ID
 * @param {string} scanId - Scan ID
 * @returns {boolean} True if deleted, false if not found
 */
export function deleteScan(scanId) {
  const scans = loadScans();
  const index = scans.findIndex(scan => scan.id === scanId);
  
  if (index === -1) {
    return false;
  }

  scans.splice(index, 1);
  saveScans(scans);
  return true;
}

/**
 * Clear all scan history
 */
export function clearScanHistory() {
  saveScans([]);
}