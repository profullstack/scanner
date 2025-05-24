# 🛡️ @profullstack/scanner

A comprehensive CLI and Node.js module for web application security scanning with OWASP compliance, supporting multiple scanning tools and detailed vulnerability reporting.

[![npm version](https://badge.fury.io/js/%40profullstack%2Fscanner.svg)](https://badge.fury.io/js/%40profullstack%2Fscanner)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

## 🚀 Features

- **Multiple Security Tools Integration**: Nikto, OWASP ZAP, Wapiti, Nuclei, SQLMap
- **OWASP Top 10 Compliance**: Comprehensive coverage of OWASP vulnerabilities
- **Multiple Report Formats**: JSON, HTML, CSV, XML, Markdown, Text
- **Flexible Scanning Profiles**: Quick, Standard, Comprehensive, OWASP-focused
- **CLI and Programmatic API**: Use as command-line tool or Node.js library
- **Vulnerability Management**: Track, analyze, and export scan results
- **Configurable Tool Settings**: Customize timeouts, severity levels, and more
- **Cross-Platform Support**: Works on Linux, macOS, and Windows

## 📦 Installation

### Global Installation (CLI)

```bash
npm install -g @profullstack/scanner
```

### Local Installation (Library)

```bash
npm install @profullstack/scanner
```

## 🔧 Prerequisites

The scanner integrates with popular security tools. Install the ones you want to use:

### Ubuntu/Debian
```bash
# Basic tools
sudo apt-get update
sudo apt-get install nikto wapiti sqlmap

# Nuclei (requires Go)
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# OWASP ZAP CLI
pip install zapcli
```

### macOS
```bash
# Using Homebrew
brew install nikto wapiti sqlmap

# Nuclei
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# OWASP ZAP CLI
pip install zapcli
```

### Check Tool Availability
```bash
scanner tools --check
```

## 🎯 Quick Start

### CLI Usage

```bash
# Basic scan
scanner scan https://example.com

# Quick scan with specific tools
scanner scan https://example.com --tools nikto,nuclei

# Use predefined profile
scanner scan https://example.com --profile comprehensive

# Generate HTML report
scanner scan https://example.com --format html

# Verbose output
scanner scan https://example.com --verbose
```

### Programmatic Usage

```javascript
import { scanTarget, generateReport } from '@profullstack/scanner';

// Basic scan
const result = await scanTarget('https://example.com', {
  tools: ['nikto', 'nuclei'],
  timeout: 300,
  verbose: true
});

console.log(`Found ${result.summary.total} vulnerabilities`);

// Generate HTML report
const htmlReport = await generateReport(result, { format: 'html' });
```

## 📋 CLI Commands

### Scanning
```bash
# Scan a target
scanner scan <target> [options]

# Options:
#   -t, --tools <tools>     Comma-separated list of tools
#   -o, --output <dir>      Output directory
#   -f, --format <format>   Report format (json,html,csv,xml,markdown,text)
#   -p, --profile <profile> Scan profile (quick,standard,comprehensive,owasp)
#   --timeout <seconds>     Timeout per tool
#   --verbose               Verbose output
#   --no-report            Skip report generation
```

### History & Results
```bash
# View scan history
scanner history

# Show scan statistics
scanner stats

# View detailed scan results
scanner show <scanId>

# Generate report from existing scan
scanner report <scanId> --format html

# Delete specific scan
scanner delete <scanId>
```

### Tool Management
```bash
# Check tool availability
scanner tools --check

# List tool configuration
scanner tools --list

# Enable/disable tools
scanner tools --enable nikto
scanner tools --disable sqlmap
```

### Configuration
```bash
# Show current configuration
scanner config --show

# Show available scan profiles
scanner config --profiles

# Reset to defaults
scanner config --reset

# Export/import configuration
scanner config --export config.json
scanner config --import config.json
```

### Data Management
```bash
# Clear scan history
scanner clean --history

# Clear all data
scanner clean --all
```

## 🔍 Scan Profiles

### Quick Scan
- **Tools**: Nikto, Nuclei
- **Focus**: Fast vulnerability detection
- **Duration**: ~2-5 minutes

### Standard Scan
- **Tools**: Nikto, Wapiti, Nuclei
- **Focus**: Comprehensive vulnerability assessment
- **Duration**: ~5-15 minutes

### Comprehensive Scan
- **Tools**: All available tools
- **Focus**: Thorough security analysis
- **Duration**: ~15-30 minutes

### OWASP Scan
- **Tools**: ZAP, Nuclei, SQLMap
- **Focus**: OWASP Top 10 vulnerabilities
- **Duration**: ~10-20 minutes

## 📊 Report Formats

### JSON
```bash
scanner scan https://example.com --format json
```
Structured data for programmatic analysis.

### HTML
```bash
scanner scan https://example.com --format html
```
Interactive web report with charts and detailed vulnerability information.

### CSV
```bash
scanner scan https://example.com --format csv
```
Spreadsheet-compatible format for data analysis.

### XML
```bash
scanner scan https://example.com --format xml
```
Structured markup for integration with other tools.

### Markdown
```bash
scanner scan https://example.com --format markdown
```
Documentation-friendly format.

### Text
```bash
scanner scan https://example.com --format text
```
Plain text format for console output.

## 🔧 API Reference

### Core Functions

#### `scanTarget(target, options)`
Scan a target URL or IP address.

```javascript
const result = await scanTarget('https://example.com', {
  tools: ['nikto', 'nuclei'],           // Tools to use
  outputDir: './scan-results',          // Output directory
  timeout: 300,                         // Timeout per tool (seconds)
  verbose: false,                       // Verbose output
  toolOptions: {                        // Tool-specific options
    nikto: { timeout: 120 },
    nuclei: { severity: 'high,critical' }
  }
});
```

#### `generateReport(scanResult, options)`
Generate a report from scan results.

```javascript
const report = await generateReport(scanResult, {
  format: 'html',                       // Report format
  includeRawOutput: false,              // Include raw tool output
  template: 'default'                   // Report template
});
```

#### `getScanHistory(limit)`
Get scan history.

```javascript
const history = getScanHistory(10);    // Get last 10 scans
```

#### `getScanStats()`
Get scan statistics.

```javascript
const stats = getScanStats();
console.log(`Total scans: ${stats.totalScans}`);
console.log(`Total vulnerabilities: ${stats.totalVulnerabilities}`);
```

### Utility Functions

#### `validateTarget(target)`
Validate a target URL or IP.

```javascript
const validation = validateTarget('https://example.com');
if (validation.valid) {
  console.log('Target is valid');
} else {
  console.error(validation.error);
}
```

#### `checkToolAvailability(tools)`
Check if security tools are available.

```javascript
const availability = await checkToolAvailability(['nikto', 'nuclei']);
console.log('Nikto available:', availability.nikto);
```

### Configuration Functions

#### `getConfig()`
Get current configuration.

```javascript
const config = getConfig();
console.log('Default timeout:', config.scanning.defaultTimeout);
```

#### `updateConfig(updates)`
Update configuration.

```javascript
updateConfig({
  scanning: {
    defaultTimeout: 600,
    verbose: true
  }
});
```

#### `applyScanProfile(profileName)`
Apply a scan profile.

```javascript
const profileConfig = applyScanProfile('comprehensive');
console.log('Profile tools:', profileConfig.tools);
```

## 🛠️ Tool Integration

### Nikto
Web server scanner for common vulnerabilities and misconfigurations.

**Configuration:**
```javascript
{
  enabled: true,
  timeout: 300,
  format: 'xml'
}
```

### OWASP ZAP
Comprehensive web application security scanner.

**Configuration:**
```javascript
{
  enabled: true,
  timeout: 600,
  spider: true
}
```

### Wapiti
Web application vulnerability scanner.

**Configuration:**
```javascript
{
  enabled: true,
  timeout: 300,
  modules: 'all'
}
```

### Nuclei
Fast vulnerability scanner with template-based detection.

**Configuration:**
```javascript
{
  enabled: true,
  timeout: 300,
  severity: 'high,critical',
  templates: ''
}
```

### SQLMap
SQL injection detection and exploitation tool.

**Configuration:**
```javascript
{
  enabled: false,  // Disabled by default
  timeout: 300,
  crawl: 2,
  batch: true
}
```

## 📈 Examples

### Basic Vulnerability Scan
```javascript
import { scanTarget } from '@profullstack/scanner';

const result = await scanTarget('https://testphp.vulnweb.com', {
  tools: ['nikto', 'nuclei'],
  verbose: true
});

console.log(`Scan completed in ${result.duration} seconds`);
console.log(`Found ${result.summary.total} vulnerabilities`);

// Show high-severity vulnerabilities
const highSeverity = result.vulnerabilities.filter(v => 
  ['critical', 'high'].includes(v.severity)
);

highSeverity.forEach(vuln => {
  console.log(`${vuln.severity.toUpperCase()}: ${vuln.title}`);
  console.log(`  URL: ${vuln.url}`);
  console.log(`  Source: ${vuln.source}`);
});
```

### Custom Report Generation
```javascript
import { scanTarget, generateReport, exportReport } from '@profullstack/scanner';

const result = await scanTarget('https://example.com');

// Generate multiple report formats
const formats = ['html', 'json', 'csv'];
for (const format of formats) {
  await exportReport(result, `report.${format}`, { format });
  console.log(`Generated ${format} report`);
}
```

### Automated Security Pipeline
```javascript
import { scanTarget, getScanStats } from '@profullstack/scanner';

async function securityPipeline(targets) {
  const results = [];
  
  for (const target of targets) {
    console.log(`Scanning ${target}...`);
    
    const result = await scanTarget(target, {
      profile: 'standard',
      timeout: 300
    });
    
    results.push(result);
    
    // Fail pipeline if critical vulnerabilities found
    if (result.summary.critical > 0) {
      throw new Error(`Critical vulnerabilities found in ${target}`);
    }
  }
  
  // Generate summary report
  const stats = getScanStats();
  console.log(`Pipeline completed. Total vulnerabilities: ${stats.totalVulnerabilities}`);
  
  return results;
}

// Usage
const targets = ['https://app1.example.com', 'https://app2.example.com'];
await securityPipeline(targets);
```

## 🔒 Security Considerations

- **Authorized Testing Only**: Only scan systems you own or have explicit permission to test
- **Rate Limiting**: Tools may be aggressive; consider rate limiting for production systems
- **Network Impact**: Scans can generate significant network traffic
- **False Positives**: Always verify findings manually before taking action
- **Tool Updates**: Keep security tools updated for latest vulnerability signatures

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and add tests
4. Run tests: `npm test`
5. Commit your changes: `git commit -am 'Add new feature'`
6. Push to the branch: `git push origin feature/new-feature`
7. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OWASP](https://owasp.org/) for security standards and guidelines
- [Nikto](https://github.com/sullo/nikto) for web server scanning
- [OWASP ZAP](https://www.zaproxy.org/) for web application security testing
- [Wapiti](https://github.com/wapiti-scanner/wapiti) for vulnerability scanning
- [Nuclei](https://github.com/projectdiscovery/nuclei) for fast vulnerability detection
- [SQLMap](https://github.com/sqlmapproject/sqlmap) for SQL injection testing

## 📞 Support

- 📧 Email: support@profullstack.com
- 🐛 Issues: [GitHub Issues](https://github.com/profullstack/scanner/issues)
- 📖 Documentation: [https://profullstack.com/scanner](https://profullstack.com/scanner)
- 💬 Community: [Discord](https://discord.gg/profullstack)

---

**⚠️ Disclaimer**: This tool is for authorized security testing only. Users are responsible for complying with applicable laws and regulations. The authors are not responsible for any misuse or damage caused by this tool.