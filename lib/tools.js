import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parseString } from 'xml2js';
import { parseUrl } from './utils.js';

const execAsync = promisify(exec);
const parseXmlAsync = promisify(parseString);

/**
 * Check if security tools are available on the system
 * @param {Array} tools - Array of tool names to check
 * @returns {Promise<Object>} Object with tool availability status
 */
export async function checkToolAvailability(tools = ['nikto', 'zap-cli', 'wapiti', 'nuclei', 'sqlmap']) {
  const availability = {};
  
  for (const tool of tools) {
    try {
      let command;
      switch (tool) {
        case 'nikto':
          command = 'nikto -Version';
          break;
        case 'zap':
        case 'zap-cli':
          command = 'zap-cli --version';
          break;
        case 'wapiti':
          command = 'wapiti --version';
          break;
        case 'nuclei':
          command = 'nuclei -version';
          break;
        case 'sqlmap':
          command = 'sqlmap --version';
          break;
        default:
          command = `which ${tool}`;
      }
      
      await execAsync(command);
      availability[tool] = true;
    } catch (error) {
      availability[tool] = false;
    }
  }
  
  return availability;
}

/**
 * Run Nikto web server scanner
 * @param {string} target - Target URL
 * @param {Object} options - Scanning options
 * @returns {Promise<Object>} Scan results
 */
export async function runNikto(target, options = {}) {
  const { outputDir, timeout = 300, verbose = false, format = 'xml' } = options;
  const outputFile = join(outputDir, `nikto-${Date.now()}.xml`);
  
  try {
    const command = `nikto -host ${target} -Format ${format} -output ${outputFile} -timeout ${timeout}`;
    
    if (verbose) {
      console.log(`Running: ${command}`);
    }
    
    const { stdout, stderr } = await execAsync(command, { 
      timeout: timeout * 1000,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    // Parse results
    const vulnerabilities = await parseNiktoResults(outputFile);
    
    return {
      status: 'completed',
      tool: 'nikto',
      outputFile: outputFile,
      vulnerabilities: vulnerabilities,
      rawOutput: stdout,
      errors: stderr
    };
    
  } catch (error) {
    return {
      status: 'error',
      tool: 'nikto',
      error: error.message,
      vulnerabilities: []
    };
  }
}

/**
 * Parse Nikto XML results
 * @param {string} filePath - Path to Nikto XML output file
 * @returns {Promise<Array>} Array of vulnerabilities
 */
async function parseNiktoResults(filePath) {
  if (!existsSync(filePath)) {
    return [];
  }
  
  try {
    const xmlContent = readFileSync(filePath, 'utf8');
    const result = await parseXmlAsync(xmlContent);
    
    const vulnerabilities = [];
    
    if (result.niktoscan && result.niktoscan.scandetails) {
      const scanDetails = Array.isArray(result.niktoscan.scandetails) 
        ? result.niktoscan.scandetails 
        : [result.niktoscan.scandetails];
        
      scanDetails.forEach(scan => {
        if (scan.item) {
          const items = Array.isArray(scan.item) ? scan.item : [scan.item];
          items.forEach(item => {
            vulnerabilities.push({
              id: item.$.id || 'unknown',
              severity: mapNiktoSeverity(item.$.osvdbid),
              title: item.$.method || 'Unknown vulnerability',
              description: item.$.description || 'No description available',
              url: item.$.uri || '',
              method: item.$.method || 'GET',
              osvdbId: item.$.osvdbid || null,
              category: 'Web Server Vulnerability'
            });
          });
        }
      });
    }
    
    return vulnerabilities;
  } catch (error) {
    console.warn('Error parsing Nikto results:', error.message);
    return [];
  }
}

/**
 * Map Nikto OSVDB ID to severity level
 * @param {string} osvdbId - OSVDB ID
 * @returns {string} Severity level
 */
function mapNiktoSeverity(osvdbId) {
  // This is a simplified mapping - in practice you'd want a more comprehensive database
  if (!osvdbId) return 'info';
  
  const id = parseInt(osvdbId);
  if (id >= 10000) return 'high';
  if (id >= 5000) return 'medium';
  if (id >= 1000) return 'low';
  return 'info';
}

/**
 * Run OWASP ZAP scanner
 * @param {string} target - Target URL
 * @param {Object} options - Scanning options
 * @returns {Promise<Object>} Scan results
 */
export async function runZap(target, options = {}) {
  const { outputDir, timeout = 600, verbose = false, spider = true } = options;
  const outputFile = join(outputDir, `zap-${Date.now()}.json`);
  
  try {
    let command = `zap-cli quick-scan --self-contained`;
    
    if (spider) {
      command += ' --spider';
    }
    
    command += ` -o json ${target}`;
    
    if (verbose) {
      console.log(`Running: ${command}`);
    }
    
    const { stdout, stderr } = await execAsync(command, { 
      timeout: timeout * 1000,
      maxBuffer: 1024 * 1024 * 10
    });
    
    // Save raw output
    writeFileSync(outputFile, stdout);
    
    // Parse results
    const vulnerabilities = parseZapResults(stdout);
    
    return {
      status: 'completed',
      tool: 'zap',
      outputFile: outputFile,
      vulnerabilities: vulnerabilities,
      rawOutput: stdout,
      errors: stderr
    };
    
  } catch (error) {
    return {
      status: 'error',
      tool: 'zap',
      error: error.message,
      vulnerabilities: []
    };
  }
}

/**
 * Parse ZAP JSON results
 * @param {string} jsonOutput - ZAP JSON output
 * @returns {Array} Array of vulnerabilities
 */
function parseZapResults(jsonOutput) {
  try {
    const data = JSON.parse(jsonOutput);
    const vulnerabilities = [];
    
    if (data.site && data.site.alerts) {
      data.site.alerts.forEach(alert => {
        vulnerabilities.push({
          id: alert.pluginid || 'unknown',
          severity: mapZapSeverity(alert.riskdesc),
          title: alert.name || 'Unknown vulnerability',
          description: alert.desc || 'No description available',
          url: alert.url || '',
          method: alert.method || 'GET',
          param: alert.param || '',
          evidence: alert.evidence || '',
          solution: alert.solution || '',
          reference: alert.reference || '',
          category: 'Web Application Vulnerability',
          confidence: alert.confidence || 'Unknown'
        });
      });
    }
    
    return vulnerabilities;
  } catch (error) {
    console.warn('Error parsing ZAP results:', error.message);
    return [];
  }
}

/**
 * Map ZAP risk description to severity level
 * @param {string} riskDesc - ZAP risk description
 * @returns {string} Severity level
 */
function mapZapSeverity(riskDesc) {
  if (!riskDesc) return 'info';
  
  const risk = riskDesc.toLowerCase();
  if (risk.includes('high')) return 'high';
  if (risk.includes('medium')) return 'medium';
  if (risk.includes('low')) return 'low';
  return 'info';
}

/**
 * Run Wapiti web application vulnerability scanner
 * @param {string} target - Target URL
 * @param {Object} options - Scanning options
 * @returns {Promise<Object>} Scan results
 */
export async function runWapiti(target, options = {}) {
  const { outputDir, timeout = 300, verbose = false, modules = 'all' } = options;
  const outputFile = join(outputDir, `wapiti-${Date.now()}.json`);
  
  try {
    const command = `wapiti -u ${target} -f json -o ${outputFile} --timeout ${timeout} -m ${modules}`;
    
    if (verbose) {
      console.log(`Running: ${command}`);
    }
    
    const { stdout, stderr } = await execAsync(command, { 
      timeout: timeout * 1000,
      maxBuffer: 1024 * 1024 * 10
    });
    
    // Parse results
    const vulnerabilities = await parseWapitiResults(outputFile);
    
    return {
      status: 'completed',
      tool: 'wapiti',
      outputFile: outputFile,
      vulnerabilities: vulnerabilities,
      rawOutput: stdout,
      errors: stderr
    };
    
  } catch (error) {
    return {
      status: 'error',
      tool: 'wapiti',
      error: error.message,
      vulnerabilities: []
    };
  }
}

/**
 * Parse Wapiti JSON results
 * @param {string} filePath - Path to Wapiti JSON output file
 * @returns {Promise<Array>} Array of vulnerabilities
 */
async function parseWapitiResults(filePath) {
  if (!existsSync(filePath)) {
    return [];
  }
  
  try {
    const jsonContent = readFileSync(filePath, 'utf8');
    const data = JSON.parse(jsonContent);
    
    const vulnerabilities = [];
    
    if (data.vulnerabilities) {
      Object.keys(data.vulnerabilities).forEach(category => {
        data.vulnerabilities[category].forEach(vuln => {
          vulnerabilities.push({
            id: vuln.wstg || 'unknown',
            severity: mapWapitiSeverity(vuln.level),
            title: vuln.title || category,
            description: vuln.description || 'No description available',
            url: vuln.http_request?.url || '',
            method: vuln.http_request?.method || 'GET',
            parameter: vuln.parameter || '',
            category: category,
            level: vuln.level || 'Unknown'
          });
        });
      });
    }
    
    return vulnerabilities;
  } catch (error) {
    console.warn('Error parsing Wapiti results:', error.message);
    return [];
  }
}

/**
 * Map Wapiti level to severity
 * @param {number} level - Wapiti level
 * @returns {string} Severity level
 */
function mapWapitiSeverity(level) {
  switch (level) {
    case 3: return 'high';
    case 2: return 'medium';
    case 1: return 'low';
    default: return 'info';
  }
}

/**
 * Run Nuclei vulnerability scanner
 * @param {string} target - Target URL
 * @param {Object} options - Scanning options
 * @returns {Promise<Object>} Scan results
 */
export async function runNuclei(target, options = {}) {
  const { outputDir, timeout = 300, verbose = false, severity = 'high,critical', templates = '' } = options;
  const outputFile = join(outputDir, `nuclei-${Date.now()}.json`);
  
  try {
    let command = `nuclei -u ${target} -json -o ${outputFile} -timeout ${timeout}`;
    
    if (severity) {
      command += ` -severity ${severity}`;
    }
    
    if (templates) {
      command += ` -t ${templates}`;
    }
    
    if (verbose) {
      console.log(`Running: ${command}`);
    }
    
    const { stdout, stderr } = await execAsync(command, { 
      timeout: timeout * 1000,
      maxBuffer: 1024 * 1024 * 10
    });
    
    // Parse results
    const vulnerabilities = await parseNucleiResults(outputFile);
    
    return {
      status: 'completed',
      tool: 'nuclei',
      outputFile: outputFile,
      vulnerabilities: vulnerabilities,
      rawOutput: stdout,
      errors: stderr
    };
    
  } catch (error) {
    return {
      status: 'error',
      tool: 'nuclei',
      error: error.message,
      vulnerabilities: []
    };
  }
}

/**
 * Parse Nuclei JSON results
 * @param {string} filePath - Path to Nuclei JSON output file
 * @returns {Promise<Array>} Array of vulnerabilities
 */
async function parseNucleiResults(filePath) {
  if (!existsSync(filePath)) {
    return [];
  }
  
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    const vulnerabilities = [];
    
    lines.forEach(line => {
      try {
        const data = JSON.parse(line);
        vulnerabilities.push({
          id: data.templateID || 'unknown',
          severity: data.info?.severity || 'info',
          title: data.info?.name || 'Unknown vulnerability',
          description: data.info?.description || 'No description available',
          url: data.matched || data.host || '',
          method: data.type || 'Unknown',
          tags: data.info?.tags || [],
          reference: data.info?.reference || [],
          category: 'Template-based Vulnerability',
          template: data.templateID,
          matcher: data.matcher_name || ''
        });
      } catch (parseError) {
        console.warn('Error parsing Nuclei line:', parseError.message);
      }
    });
    
    return vulnerabilities;
  } catch (error) {
    console.warn('Error parsing Nuclei results:', error.message);
    return [];
  }
}

/**
 * Run SQLMap SQL injection scanner
 * @param {string} target - Target URL
 * @param {Object} options - Scanning options
 * @returns {Promise<Object>} Scan results
 */
export async function runSqlmap(target, options = {}) {
  const { outputDir, timeout = 300, verbose = false, crawl = 2, batch = true } = options;
  const outputFile = join(outputDir, `sqlmap-${Date.now()}`);
  
  try {
    let command = `sqlmap -u ${target} --output-dir=${outputFile} --timeout=${timeout}`;
    
    if (batch) {
      command += ' --batch';
    }
    
    if (crawl > 0) {
      command += ` --crawl=${crawl}`;
    }
    
    // Add common SQLMap options for better results
    command += ' --level=3 --risk=2 --random-agent --threads=5';
    
    if (verbose) {
      console.log(`Running: ${command}`);
    }
    
    const { stdout, stderr } = await execAsync(command, { 
      timeout: timeout * 1000,
      maxBuffer: 1024 * 1024 * 10
    });
    
    // Parse results
    const vulnerabilities = parseSqlmapResults(stdout, stderr);
    
    return {
      status: 'completed',
      tool: 'sqlmap',
      outputFile: outputFile,
      vulnerabilities: vulnerabilities,
      rawOutput: stdout,
      errors: stderr
    };
    
  } catch (error) {
    return {
      status: 'error',
      tool: 'sqlmap',
      error: error.message,
      vulnerabilities: []
    };
  }
}

/**
 * Parse SQLMap results from stdout/stderr
 * @param {string} stdout - SQLMap stdout
 * @param {string} stderr - SQLMap stderr
 * @returns {Array} Array of vulnerabilities
 */
function parseSqlmapResults(stdout, stderr) {
  const vulnerabilities = [];
  const output = stdout + stderr;
  
  // Look for SQL injection indicators
  const injectionPatterns = [
    /Parameter: (.+?) \((.+?)\)/g,
    /Type: (.+)/g,
    /Title: (.+)/g,
    /Payload: (.+)/g
  ];
  
  const lines = output.split('\n');
  let currentVuln = null;
  
  lines.forEach(line => {
    line = line.trim();
    
    if (line.includes('Parameter:')) {
      if (currentVuln) {
        vulnerabilities.push(currentVuln);
      }
      
      const match = line.match(/Parameter: (.+?) \((.+?)\)/);
      if (match) {
        currentVuln = {
          id: 'sql-injection',
          severity: 'high',
          title: 'SQL Injection',
          description: `SQL injection vulnerability found in parameter: ${match[1]}`,
          parameter: match[1],
          type: match[2],
          category: 'SQL Injection',
          method: 'Unknown'
        };
      }
    } else if (currentVuln && line.includes('Type:')) {
      const match = line.match(/Type: (.+)/);
      if (match) {
        currentVuln.injectionType = match[1];
      }
    } else if (currentVuln && line.includes('Title:')) {
      const match = line.match(/Title: (.+)/);
      if (match) {
        currentVuln.title = match[1];
      }
    } else if (currentVuln && line.includes('Payload:')) {
      const match = line.match(/Payload: (.+)/);
      if (match) {
        currentVuln.payload = match[1];
      }
    }
  });
  
  if (currentVuln) {
    vulnerabilities.push(currentVuln);
  }
  
  return vulnerabilities;
}

/**
 * Get installation instructions for missing tools
 * @param {Array} missingTools - Array of missing tool names
 * @returns {Object} Installation instructions
 */
export function getInstallationInstructions(missingTools) {
  const instructions = {
    nikto: {
      ubuntu: 'sudo apt-get install nikto',
      centos: 'sudo yum install nikto',
      macos: 'brew install nikto',
      description: 'Web server scanner'
    },
    'zap-cli': {
      ubuntu: 'pip install zapcli',
      centos: 'pip install zapcli',
      macos: 'pip install zapcli',
      description: 'OWASP ZAP command line interface',
      note: 'Requires OWASP ZAP to be installed separately'
    },
    wapiti: {
      ubuntu: 'sudo apt-get install wapiti',
      centos: 'sudo yum install wapiti',
      macos: 'brew install wapiti',
      description: 'Web application vulnerability scanner'
    },
    nuclei: {
      ubuntu: 'go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest',
      centos: 'go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest',
      macos: 'go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest',
      description: 'Fast vulnerability scanner',
      note: 'Requires Go to be installed'
    },
    sqlmap: {
      ubuntu: 'sudo apt-get install sqlmap',
      centos: 'sudo yum install sqlmap',
      macos: 'brew install sqlmap',
      description: 'SQL injection detection tool'
    }
  };
  
  return missingTools.reduce((result, tool) => {
    result[tool] = instructions[tool] || { description: 'Unknown tool' };
    return result;
  }, {});
}