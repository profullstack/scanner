import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parseString } from 'xml2js';
import { parseUrl } from './utils.js';

const execAsync = promisify(exec);
const parseXmlAsync = promisify(parseString);

/**
 * Execute command with real-time output logging
 * @param {string} command - Command to execute
 * @param {Object} options - Execution options
 * @param {boolean} verbose - Whether to show verbose output
 * @returns {Promise<Object>} Execution result
 */
function execWithLogging(command, options = {}, verbose = false) {
  return new Promise((resolve, reject) => {
    if (verbose) {
      console.log(`\n🔧 Executing: ${command}\n`);
    }

    const child = spawn('sh', ['-c', command], {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false, // Keep attached to parent for proper signal handling
      ...options
    });

    let stdout = '';
    let stderr = '';
    let lastOutputTime = Date.now();
    let isKilled = false;

    // Proper signal handling for Ctrl+C
    const signalHandler = (signal) => {
      if (!isKilled && child && !child.killed) {
        isKilled = true;
        if (verbose) {
          console.log(`\n🛑 Received ${signal}, terminating process...`);
        }
        
        // Try graceful termination first
        child.kill('SIGTERM');
        
        // Force kill after 3 seconds if still running
        setTimeout(() => {
          if (!child.killed) {
            if (verbose) {
              console.log(`💀 Force killing process...`);
            }
            child.kill('SIGKILL');
          }
        }, 3000);
      }
    };

    // Register signal handlers
    process.on('SIGINT', signalHandler);
    process.on('SIGTERM', signalHandler);

    if (child.stdout) {
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (data) => {
        stdout += data;
        lastOutputTime = Date.now();
        if (verbose) {
          // Write output immediately to console
          process.stdout.write(data);
        }
      });
    }

    if (child.stderr) {
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (data) => {
        stderr += data;
        lastOutputTime = Date.now();
        if (verbose) {
          // Write error output immediately to console
          process.stderr.write(data);
        }
      });
    }

    const timeout = options.timeout || 300000; // 5 minutes default
    const timer = setTimeout(() => {
      if (!isKilled) {
        if (verbose) {
          console.log(`\n⏰ Timeout reached (${timeout}ms), killing process...`);
        }
        isKilled = true;
        child.kill('SIGKILL');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }
    }, timeout);

    // Add progress indicator for long-running processes
    let progressInterval;
    if (verbose) {
      const startTime = Date.now();
      progressInterval = setInterval(() => {
        if (!isKilled) {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          const timeSinceOutput = Math.round((Date.now() - lastOutputTime) / 1000);
          process.stdout.write(`\r⏱️  Running for ${elapsed}s (${timeSinceOutput}s since last output)... [Ctrl+C to cancel]`);
        }
      }, 10000); // Update every 10 seconds
    }

    child.on('close', (code) => {
      clearTimeout(timer);
      if (progressInterval) {
        clearInterval(progressInterval);
        process.stdout.write('\r'); // Clear the progress line
      }
      
      // Clean up signal handlers
      process.removeListener('SIGINT', signalHandler);
      process.removeListener('SIGTERM', signalHandler);
      
      if (isKilled) {
        if (verbose) {
          console.log(`\n🛑 Process was terminated by user`);
        }
        reject(new Error('Process was terminated by user'));
        return;
      }
      
      if (verbose) {
        console.log(`\n✅ Process finished with exit code: ${code}`);
      }
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${stderr}`));
      }
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      // Clean up signal handlers
      process.removeListener('SIGINT', signalHandler);
      process.removeListener('SIGTERM', signalHandler);
      
      if (verbose) {
        console.log(`\n❌ Process error: ${error.message}`);
      }
      reject(error);
    });

    // Add process start confirmation
    if (verbose) {
      console.log(`📡 Process started with PID: ${child.pid}`);
      console.log(`⏳ Note: Nikto may appear to hang while scanning - this is normal behavior`);
      console.log(`🛑 Press Ctrl+C to cancel the scan at any time`);
    }
  });
}

/**
 * Check if security tools are available on the system
 * @param {Array} tools - Array of tool names to check
 * @returns {Promise<Object>} Object with tool availability status
 */
export async function checkToolAvailability(tools = ['nikto', 'wapiti', 'nuclei', 'sqlmap', 'httpx-toolkit']) {
  const availability = {};
  
  for (const tool of tools) {
    try {
      let command;
      switch (tool) {
        case 'nikto':
          command = 'nikto -Version';
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
        case 'httpx-toolkit':
          command = 'httpx-toolkit -version';
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
  const { outputDir, timeout = 300, verbose = false, format = 'xml', auth = null, headers = {} } = options;
  const outputFile = join(outputDir, `nikto-${Date.now()}.xml`);
  
  try {
    // Use a much more aggressive timeout for Nikto (max 2 minutes per host)
    const niktoTimeout = Math.min(timeout, 120);
    let command = `nikto -host ${target} -Format ${format} -output ${outputFile} -timeout ${niktoTimeout}`;
    
    // Add Nikto-specific options to make it much faster
    command += ' -maxtime 120'; // Maximum scan time in seconds (2 minutes)
    command += ' -Tuning 1,2,3'; // Only basic vulnerabilities (much faster)
    command += ' -nointeractive'; // Don't prompt for user input
    command += ' -ask no'; // Don't ask questions
    command += ' -Display 1'; // Minimal output
    
    // Add authentication options
    if (auth) {
      if (auth.type === 'basic' && auth.username && auth.password) {
        command += ` -id ${auth.username}:${auth.password}`;
      }
      if (auth.sessionCookie) {
        command += ` -cookie "${auth.sessionCookie}"`;
      }
    }
    
    // Add custom headers
    if (Object.keys(headers).length > 0) {
      const headerString = Object.entries(headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ');
      command += ` -useragent "${headerString}"`;
    }
    
    if (verbose) {
      console.log(`\n🔍 Starting Nikto scan...`);
    }
    
    // Use a much more aggressive timeout
    const processTimeout = Math.min(timeout * 1000, 150000); // Max 2.5 minutes
    const { stdout, stderr } = await execWithLogging(command, {
      timeout: processTimeout
    }, verbose);
    
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
 * Run httpx-toolkit for HTTP probe and discovery
 * @param {string} target - Target URL
 * @param {Object} options - Scanning options
 * @returns {Promise<Object>} Scan results
 */
export async function runHttpx(target, options = {}) {
  const { outputDir, timeout = 300, verbose = false, techDetect = true, auth = null, headers = {} } = options;
  const outputFile = join(outputDir, `httpx-${Date.now()}.json`);
  
  try {
    // First use Go-based httpx-toolkit for service discovery
    let command = `httpx-toolkit -u ${target} -json -o ${outputFile}`;
    
    if (techDetect) {
      command += ' -tech-detect';
    }
    
    // Add custom headers
    if (Object.keys(headers).length > 0) {
      const headerArgs = Object.entries(headers)
        .map(([key, value]) => `-H "${key}: ${value}"`)
        .join(' ');
      command += ` ${headerArgs}`;
    }
    
    if (verbose) {
      console.log(`\n🔍 Starting httpx-toolkit scan...`);
    }
    
    const { stdout, stderr } = await execWithLogging(command, {
      timeout: timeout * 1000
    }, verbose);
    
    // Then use Python-based httpx for additional testing
    if (verbose) {
      console.log(`\n🐍 Running Python httpx tests...`);
    }
    
    // Create a Python script to run httpx
    const pythonScript = join(outputDir, `httpx-python-${Date.now()}.py`);
    const pythonCode = `
import httpx
import json
import sys

try:
    # Make request to target
    with httpx.Client(timeout=${timeout}, follow_redirects=True) as client:
        response = client.get("${target}", headers=${JSON.stringify(headers)})
        
        # Save results
        result = {
            "url": "${target}",
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "cookies": dict(response.cookies),
            "response_time": response.elapsed.total_seconds(),
            "content_type": response.headers.get("content-type", ""),
            "server": response.headers.get("server", ""),
            "content_length": len(response.content)
        }
        
        with open("${outputFile.replace('.json', '-python.json')}", "w") as f:
            json.dump(result, f, indent=2)
        
        print(json.dumps(result))
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;
    
    writeFileSync(pythonScript, pythonCode);
    
    // Execute Python script using the virtual environment
    const pythonCommand = `source myenv/bin/activate && python ${pythonScript} && deactivate`;
    
    try {
      const { stdout: pythonStdout } = await execAsync(pythonCommand);
      if (verbose) {
        console.log(`Python httpx results: ${pythonStdout}`);
      }
    } catch (pythonError) {
      if (verbose) {
        console.error(`Python httpx error: ${pythonError.message}`);
      }
    }
    
    // Parse results
    const vulnerabilities = await parseHttpxResults(outputFile);
    
    return {
      status: 'completed',
      tool: 'httpx',
      outputFile: outputFile,
      vulnerabilities: vulnerabilities,
      rawOutput: stdout,
      errors: stderr
    };
    
  } catch (error) {
    return {
      status: 'error',
      tool: 'httpx',
      error: error.message,
      vulnerabilities: []
    };
  }
}

/**
 * Parse httpx-toolkit JSON results
 * @param {string} filePath - Path to httpx JSON output file
 * @returns {Promise<Array>} Array of findings
 */
async function parseHttpxResults(filePath) {
  if (!existsSync(filePath)) {
    return [];
  }
  
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    const findings = [];
    
    lines.forEach(line => {
      try {
        const data = JSON.parse(line);
        findings.push({
          id: 'httpx-finding',
          severity: 'info',
          title: `HTTP Service: ${data.url || 'Unknown'}`,
          description: `HTTP service details for ${data.url || 'Unknown'}`,
          url: data.url || '',
          method: 'GET',
          category: 'HTTP Service Discovery',
          technologies: data.technologies || [],
          statusCode: data.status_code,
          contentType: data.content_type,
          webServer: data.webserver,
          responseTime: data.response_time
        });
      } catch (parseError) {
        console.warn('Error parsing httpx line:', parseError.message);
      }
    });
    
    return findings;
  } catch (error) {
    console.warn('Error parsing httpx results:', error.message);
    return [];
  }
}

/**
 * Run Wapiti web application vulnerability scanner
 * @param {string} target - Target URL
 * @param {Object} options - Scanning options
 * @returns {Promise<Object>} Scan results
 */
export async function runWapiti(target, options = {}) {
  const { outputDir, timeout = 300, verbose = false, modules = 'all', auth = null, headers = {} } = options;
  const outputFile = join(outputDir, `wapiti-${Date.now()}.json`);
  
  try {
    let command = `wapiti -u ${target} -f json -o ${outputFile} --timeout ${timeout} -m ${modules}`;
    
    // Add authentication options
    if (auth) {
      if (auth.type === 'basic' && auth.username && auth.password) {
        command += ` --auth-user ${auth.username} --auth-password ${auth.password}`;
      }
      if (auth.type === 'form' && auth.loginUrl && auth.loginData) {
        command += ` --auth-url "${auth.loginUrl}" --auth-data "${auth.loginData}"`;
      }
      if (auth.sessionCookie) {
        command += ` --cookie "${auth.sessionCookie}"`;
      }
    }
    
    // Add custom headers
    if (Object.keys(headers).length > 0) {
      Object.entries(headers).forEach(([key, value]) => {
        command += ` --header "${key}: ${value}"`;
      });
    }
    
    if (verbose) {
      console.log(`\n🌐 Starting Wapiti scan...`);
    }
    
    const { stdout, stderr } = await execWithLogging(command, {
      timeout: timeout * 1000
    }, verbose);
    
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
  const { outputDir, timeout = 300, verbose = false, severity = 'high,critical', templates = '', auth = null, headers = {} } = options;
  const outputFile = join(outputDir, `nuclei-${Date.now()}.json`);
  
  try {
    let command = `nuclei -u ${target} -json -o ${outputFile} -timeout ${timeout}`;
    
    if (severity) {
      command += ` -severity ${severity}`;
    }
    
    if (templates) {
      command += ` -t ${templates}`;
    }
    
    // Add authentication options
    if (auth) {
      if (auth.type === 'basic' && auth.username && auth.password) {
        command += ` -auth-user ${auth.username} -auth-pass ${auth.password}`;
      }
      if (auth.sessionCookie) {
        command += ` -cookie "${auth.sessionCookie}"`;
      }
    }
    
    // Add custom headers
    if (Object.keys(headers).length > 0) {
      Object.entries(headers).forEach(([key, value]) => {
        command += ` -H "${key}: ${value}"`;
      });
    }
    
    if (verbose) {
      console.log(`\n⚡ Starting Nuclei scan...`);
    }
    
    const { stdout, stderr } = await execWithLogging(command, {
      timeout: timeout * 1000
    }, verbose);
    
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
  const { outputDir, timeout = 300, verbose = false, crawl = 2, batch = true, auth = null, headers = {} } = options;
  const outputFile = join(outputDir, `sqlmap-${Date.now()}`);
  
  try {
    let command = `sqlmap -u ${target} --output-dir=${outputFile} --timeout=${timeout}`;
    
    if (batch) {
      command += ' --batch';
    }
    
    if (crawl > 0) {
      command += ` --crawl=${crawl}`;
    }
    
    // Add authentication options
    if (auth) {
      if (auth.type === 'basic' && auth.username && auth.password) {
        command += ` --auth-type=basic --auth-cred="${auth.username}:${auth.password}"`;
      }
      if (auth.type === 'digest' && auth.username && auth.password) {
        command += ` --auth-type=digest --auth-cred="${auth.username}:${auth.password}"`;
      }
      if (auth.type === 'form' && auth.loginUrl && auth.loginData) {
        command += ` --forms --data="${auth.loginData}"`;
      }
      if (auth.sessionCookie) {
        command += ` --cookie="${auth.sessionCookie}"`;
      }
    }
    
    // Add custom headers
    if (Object.keys(headers).length > 0) {
      const headerString = Object.entries(headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\\n');
      command += ` --headers="${headerString}"`;
    }
    
    // Add common SQLMap options for better results
    command += ' --level=3 --risk=2 --random-agent --threads=5';
    
    if (verbose) {
      console.log(`\n💉 Starting SQLMap scan...`);
    }
    
    const { stdout, stderr } = await execWithLogging(command, {
      timeout: timeout * 1000
    }, verbose);
    
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
    'httpx-toolkit': {
      ubuntu: 'go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest',
      centos: 'go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest',
      macos: 'brew install httpx',
      description: 'Modern HTTP toolkit for service discovery and security testing',
      note: 'Requires Go to be installed'
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