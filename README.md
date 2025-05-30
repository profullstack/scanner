# 🛡️ @profullstack/scanner

A comprehensive CLI and Node.js module for web application security scanning with OWASP compliance, supporting multiple scanning tools and detailed vulnerability reporting.

[![npm version](https://badge.fury.io/js/%40profullstack%2Fscanner.svg)](https://badge.fury.io/js/%40profullstack%2Fscanner)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

## 🚀 Features

- **Multiple Security Tools Integration**: Nikto, httpx-toolkit, Wapiti, Nuclei, SQLMap
- **OWASP Top 10 Compliance**: Comprehensive coverage of OWASP vulnerabilities
- **Project Management**: Organize scans by project with comprehensive history tracking
- **Multiple Report Formats**: JSON, HTML, CSV, XML, Markdown, Text
- **Flexible Scanning Profiles**: Quick, Standard, Comprehensive, OWASP-focused
- **CLI and Programmatic API**: Use as command-line tool or Node.js library
- **Vulnerability Management**: Track, analyze, and export scan results
- **Configurable Tool Settings**: Customize timeouts, severity levels, and more
- **Cross-Platform Support**: Works on Linux, macOS, and Windows
- **Enhanced Arch Linux Support**: Proper Python environment handling with pipx

## 📦 Installation

Choose one of the following installation methods based on your needs:

## 🚀 Method 1: Docker Compose (Recommended)

The easiest way to get started is using Docker Compose, which provides a pre-configured environment with all security tools installed.

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) (version 20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (version 2.0+)

### Quick Start with Docker Compose

```bash
# Clone the repository
git clone https://github.com/profullstack/scanner.git
cd scanner

# Copy and customize environment variables (optional)
cp .env.example .env
# Edit .env file to customize configuration

# Start the development environment
docker-compose up -d scanner

# Run a scan
docker-compose exec scanner scanner scan https://example.com

# View scan results
docker-compose exec scanner scanner history
```

### Docker Compose Services

#### Development Environment
```bash
# Start interactive development environment
docker-compose up scanner

# Run scanner commands
docker-compose exec scanner scanner scan https://example.com
docker-compose exec scanner scanner tools --check
```

#### Production Environment
```bash
# Start production-optimized environment
docker-compose --profile production up -d scanner-prod

# Run scans in production mode
docker-compose exec scanner-prod scanner scan https://example.com --profile comprehensive
```

#### Testing Environment
```bash
# Run all tests
docker-compose --profile test up scanner-test

# Start vulnerable test applications for testing
docker-compose --profile test-targets up -d dvwa webgoat

# Test against vulnerable applications
docker-compose exec scanner scanner scan http://dvwa --tools nikto,nuclei
docker-compose exec scanner scanner scan http://webgoat:8080 --profile owasp
```


### Docker Compose Commands Reference

```bash
# View running services
docker-compose ps

# View logs
docker-compose logs scanner

# Stop all services
docker-compose down

# Remove all data (including scan history)
docker-compose down -v

# Update to latest version
docker-compose pull
docker-compose up -d --force-recreate
```

### Environment Configuration

The project includes a comprehensive `.env.example` file with all available configuration options. You can customize the scanner behavior by copying this file to `.env` and modifying the values:

```bash
# Copy the example environment file
cp .env.example .env

# Edit the configuration
nano .env  # or use your preferred editor
```

**Key Configuration Options:**

- **Scanner Settings**: Default timeout, output directory, scan profiles
- **Security Tools**: Enable/disable individual tools, configure timeouts
- **Docker Settings**: Port mappings, network configuration
- **Reporting**: Default formats, templates, output options
- **Logging**: Log levels, file paths, rotation settings

**Example .env customization:**
```bash
# Scanner configuration
SCANNER_DEFAULT_TIMEOUT=600
SCANNER_VERBOSE=true
SCANNER_DEFAULT_PROFILE=comprehensive

# Tool configuration
NIKTO_ENABLED=true
NUCLEI_SEVERITY=medium,high,critical
HTTPX_ENABLED=true

# Port configuration
DVWA_PORT=8081
WEBGOAT_PORT=8082
```

## 🖥️ Method 2: Host OS Installation

Install directly on your host operating system for maximum performance and integration.

### Step 1: Install Node.js Package

#### Global Installation (CLI)
```bash
npm install -g @profullstack/scanner
```

#### Local Installation (Library)
```bash
npm install @profullstack/scanner
```

### Step 2: Install Security Tools

#### Option A: Automated Installation Script (Recommended)

We provide a comprehensive installation script that automatically installs all security tools based on your operating system:

```bash
# Make the script executable
chmod +x ./bin/install-security-tools.sh

# Install all security tools
./bin/install-security-tools.sh --all

# Install specific tools only
./bin/install-security-tools.sh --nikto --nuclei

# Force reinstall all tools
./bin/install-security-tools.sh --force --all

# Show help
./bin/install-security-tools.sh --help
```

**Supported Platforms:**
- **Linux**: Ubuntu/Debian, CentOS/RHEL/Fedora, Arch Linux (with pipx support)
- **macOS**: via Homebrew
- **Windows**: via Chocolatey (WSL recommended)

**Arch Linux Note**: The script automatically handles Python environment restrictions by using `pipx` for Python packages, resolving the `externally-managed-environment` error.

#### Option B: Manual Installation

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install nikto wapiti sqlmap python3-pip golang-go
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest

# Install Python httpx in virtual environment
python3 -m venv myenv
source myenv/bin/activate
pip install httpx
deactivate
```

#### macOS
```bash
brew install nikto wapiti sqlmap python go
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest

# Install Python httpx in virtual environment
python3 -m venv myenv
source myenv/bin/activate
pip install httpx
deactivate
```

#### Windows
```bash
choco install nikto sqlmap python golang
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest

# Install Python httpx in virtual environment
python -m venv myenv
myenv\Scripts\activate.bat
pip install httpx
deactivate
```

### Step 3: Verify Installation
```bash
# Check if all tools are properly installed
scanner tools --check

# Test with a basic scan
scanner scan https://example.com --tools nikto
```

## 🔧 Installation Troubleshooting

### Common Issues

#### Permission Errors (Linux/macOS)
```bash
# If you get permission errors, try:
sudo npm install -g @profullstack/scanner

# Or use a Node version manager like nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install node
npm install -g @profullstack/scanner
```

#### Arch Linux Python Environment Issues
If you encounter `externally-managed-environment` errors on Arch Linux, the installation script automatically handles this by using `pipx`:

```bash
# The script automatically installs pipx and uses it for Python packages
./bin/install-security-tools.sh --all

# Manual pipx installation if needed
sudo pacman -S python-pipx
pipx install wapiti3

# Ensure pipx bin directory is in PATH
echo 'export PATH=$PATH:$HOME/.local/bin' >> ~/.bashrc
source ~/.bashrc

# Verify installation
scanner tools --check
```

**Troubleshooting Arch Linux installations:**
```bash
# Check current PATH
echo $PATH

# Manually add directories to PATH
export PATH=$PATH:$HOME/.local/bin:$HOME/go/bin

# Restart terminal or reload bashrc
source ~/.bashrc

# Check tool availability
which httpx-toolkit
which wapiti
which nuclei
```

#### Tool Installation Issues
```bash
# Check which tools are missing
scanner tools --check

# Install missing tools individually
./bin/install-security-tools.sh --nikto
./bin/install-security-tools.sh --nuclei

# Force reinstall if tools are not working
./bin/install-security-tools.sh --force --all

# View detailed installation commands
./bin/install-security-tools.sh --all  # Shows exact commands being run
```

#### Docker Issues
```bash
# If Docker services fail to start
docker-compose down
docker-compose pull
docker-compose up -d

# Check service logs
docker-compose logs scanner

# Reset all Docker data
docker-compose down -v
docker system prune -f
```

## 🎯 Quick Start

### CLI Usage

```bash
# Basic scan (target can be URL, domain, or IP)
scanner scan https://example.com
scanner scan example.com
scanner scan 192.168.1.1
scanner scan https://example.com/app

# Project-based scanning
scanner projects --add --name "My Website" --domain "example.com"
scanner scan https://example.com --project "My Website"

# Quick scan with specific tools
scanner scan https://example.com --tools nikto,nuclei

# Use predefined profile
scanner scan https://example.com --profile comprehensive

# Generate HTML report
scanner scan https://example.com --format html

# Verbose output
scanner scan https://example.com --verbose

# Authenticated scanning with basic auth
scanner scan https://example.com --auth-user admin --auth-pass password

# Form-based authentication
scanner scan https://example.com --auth-type form --login-url https://example.com/login --login-data "username=admin&password=secret"

# Using session cookie
scanner scan https://example.com --session-cookie "JSESSIONID=ABC123; auth_token=xyz789"

# Custom headers
scanner scan https://example.com --headers '{"Authorization": "Bearer token123", "X-API-Key": "key456"}'
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

# Target can be:
#   - Full URL: https://example.com
#   - Domain: example.com
#   - IP address: 192.168.1.1
#   - URL with path: https://example.com/app

# Options:
#   -t, --tools <tools>     Comma-separated list of tools
#   -o, --output <dir>      Output directory
#   -f, --format <format>   Report format (json,html,csv,xml,markdown,text)
#   -p, --profile <profile> Scan profile (quick,standard,comprehensive,owasp)
#   --project <project>     Project ID or name to associate scan with
#   --timeout <seconds>     Timeout per tool
#   --verbose               Verbose output
#   --no-report             Skip report generation
#   --ui-json               Generate UI-friendly JSON format
#   --multi-format          Generate multiple report formats
#   --open-html             Open HTML report in browser
#   --detailed              Generate detailed text reports
```

### Project Management
```bash
# Create a new project
scanner projects --add --name "My Website" --domain "example.com"
scanner projects --add --name "API Server" --url "https://api.example.com"

# List all projects
scanner projects --list

# Show project details
scanner projects --show "My Website"

# View project scan history
scanner projects --history "My Website"

# Show project statistics
scanner projects --stats "My Website"

# Show global statistics
scanner projects --stats

# Remove a project
scanner projects --remove "My Website"

# Clear project history
scanner projects --clear-history "My Website"
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

# Generate UI-friendly JSON report
scanner report <scanId> --format json --ui-json

# Generate multiple report formats
scanner report <scanId> --format json,html,text --multi-format

# Generate and open HTML report in browser
scanner report <scanId> --format html --open-html

# Generate detailed text report
scanner report <scanId> --format text --detailed

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

## 🔐 Authentication Support

The scanner supports multiple authentication methods for scanning protected web applications:

### Basic Authentication
```bash
# HTTP Basic Authentication
scanner scan https://example.com --auth-user username --auth-pass password --auth-type basic

# HTTP Digest Authentication
scanner scan https://example.com --auth-user username --auth-pass password --auth-type digest
```

### Form-Based Authentication
```bash
# Login form authentication
scanner scan https://example.com \
  --auth-type form \
  --login-url https://example.com/login \
  --login-data "username=admin&password=secret&csrf_token=abc123"
```

### Session Cookie Authentication
```bash
# Use existing session cookie
scanner scan https://example.com \
  --session-cookie "PHPSESSID=abc123; auth_token=xyz789"
```

### Custom Headers
```bash
# API token authentication
scanner scan https://api.example.com \
  --headers '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'

# Multiple custom headers
scanner scan https://example.com \
  --headers '{"X-API-Key": "key123", "X-Client-ID": "client456"}'
```

### Programmatic Authentication
```javascript
import { scanTarget } from '@profullstack/scanner';

// Basic authentication
const result = await scanTarget('https://example.com', {
  auth: {
    type: 'basic',
    username: 'admin',
    password: 'password'
  }
});

// Form-based authentication
const result2 = await scanTarget('https://example.com', {
  auth: {
    type: 'form',
    loginUrl: 'https://example.com/login',
    loginData: 'username=admin&password=secret'
  }
});

// Session cookie
const result3 = await scanTarget('https://example.com', {
  auth: {
    sessionCookie: 'JSESSIONID=ABC123'
  }
});

// Custom headers
const result4 = await scanTarget('https://example.com', {
  headers: {
    'Authorization': 'Bearer token123',
    'X-API-Key': 'key456'
  }
});
```

### Authentication Best Practices

- **Secure Credentials**: Never hardcode credentials in scripts. Use environment variables or secure credential stores
- **Session Management**: For long-running scans, ensure session cookies remain valid throughout the scan duration
- **Rate Limiting**: Authenticated scans may have different rate limits than anonymous scans
- **Scope Testing**: Verify that authenticated scans cover the intended scope and don't access unauthorized areas
- **Credential Rotation**: Use dedicated test credentials that can be rotated regularly

## 📁 Project Management

The scanner includes comprehensive project management features to organize and track your security scans across different applications and environments.

### Creating Projects

```bash
# Create project with domain
scanner projects --add --name "E-commerce Site" --domain "shop.example.com" --description "Main shopping website"

# Create project with URL
scanner projects --add --name "API Gateway" --url "https://api.example.com" --description "REST API endpoints"

# Create project with minimal info
scanner projects --add --name "Internal App" --domain "internal.company.com"
```

### Managing Projects

```bash
# List all projects
scanner projects --list

# Show detailed project information
scanner projects --show "E-commerce Site"

# Update project description
scanner projects --show "E-commerce Site"  # Get project ID
scanner projects --update <project-id> --description "Updated description"

# Remove a project (includes all scan history)
scanner projects --remove "E-commerce Site"
```

### Project-Based Scanning

```bash
# Associate scans with projects
scanner scan https://shop.example.com --project "E-commerce Site"
scanner scan https://shop.example.com/admin --project "E-commerce Site" --profile comprehensive

# Scans are automatically tracked in project history
scanner projects --history "E-commerce Site"
```

### Project Analytics

```bash
# View project-specific statistics
scanner projects --stats "E-commerce Site"

# View global statistics across all projects
scanner projects --stats

# Clear project scan history
scanner projects --clear-history "E-commerce Site"

# Clear all scan history
scanner projects --clear-history
```

### Project Data Storage

Projects and scan history are stored in your configuration directory:

- **Projects**: `~/.config/scanner/projects.json`
- **Scan History**: `~/.config/scanner/history.json`
- **Configuration**: `~/.config/scanner/config.json`

### Programmatic Project Management

```javascript
import {
  addProject, getProjects, getProject,
  addScanToHistory, getProjectHistory, getProjectStats
} from '@profullstack/scanner';

// Create a new project
const project = addProject({
  name: 'My Application',
  domain: 'app.example.com',
  description: 'Production web application'
});

// Get all projects
const projects = getProjects();

// Get project by name or ID
const myProject = getProject('My Application');

// Scan with project association
const scanResult = await scanTarget('https://app.example.com', {
  projectId: project.id,
  tools: ['nikto', 'nuclei']
});

// View project history
const history = getProjectHistory(project.id);

// Get project statistics
const stats = getProjectStats(project.id);
console.log(`Total scans: ${stats.totalScans}`);
console.log(`Total vulnerabilities: ${stats.totalVulnerabilities}`);
```

### Project Workflow Example

```bash
# 1. Set up projects for your applications
scanner projects --add --name "Frontend" --domain "app.example.com"
scanner projects --add --name "Backend API" --url "https://api.example.com"
scanner projects --add --name "Admin Panel" --url "https://admin.example.com"

# 2. Run regular scans associated with projects
scanner scan https://app.example.com --project "Frontend" --profile standard
scanner scan https://api.example.com --project "Backend API" --profile owasp
scanner scan https://admin.example.com --project "Admin Panel" --profile comprehensive

# 3. Monitor project security over time
scanner projects --stats "Frontend"
scanner projects --history "Backend API"

# 4. Generate project-specific reports
scanner projects --history "Admin Panel" | head -1 | cut -d' ' -f3  # Get latest scan ID
scanner report <scan-id> --format html
```

## 🎯 Scan Profiles

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
- **Tools**: httpx-toolkit, Nuclei, SQLMap
- **Focus**: OWASP Top 10 vulnerabilities
- **Duration**: ~10-20 minutes

## 📊 Report Formats

### JSON
```bash
# Standard JSON format
scanner scan https://example.com --format json

# UI-friendly JSON format with enhanced metadata
scanner scan https://example.com --format json --ui-json

# Generate both formats
scanner scan https://example.com --format json --ui-json --multi-format
```
Structured data for programmatic analysis. The UI-friendly format includes enhanced metadata, visualization data, and structured information optimized for user interfaces.

### HTML
```bash
# Generate HTML report
scanner scan https://example.com --format html

# Generate and automatically open in browser
scanner scan https://example.com --format html --open-html
```
Interactive web report with charts and detailed vulnerability information. Can be automatically opened in your default browser.

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
Scan a target URL, domain, or IP address.

```javascript
// Target can be URL, domain, or IP
const result = await scanTarget('https://example.com', {
  tools: ['nikto', 'nuclei'],           // Tools to use
  outputDir: './scan-results',          // Output directory
  timeout: 300,                         // Timeout per tool (seconds)
  verbose: false,                       // Verbose output
  projectId: 'project-uuid',            // Associate with project
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
  template: 'default',                  // Report template
  uiFormat: true,                       // Generate UI-friendly JSON
  detailed: true,                       // Generate detailed text report
  openHtml: true                        // Open HTML report in browser
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

### httpx-toolkit
Modern HTTP toolkit for service discovery and security testing. The scanner uses both:

1. Go-based httpx-toolkit for HTTP service discovery
2. Python-based httpx library for advanced HTTP requests

**Configuration:**
```javascript
{
  enabled: true,
  timeout: 300,
  techDetect: true
}
```

**Python Virtual Environment:**
The scanner creates a Python virtual environment (`myenv/`) with the httpx library installed:
```bash
# Activate the virtual environment
source myenv/bin/activate  # Linux/macOS
myenv\Scripts\activate.bat  # Windows

# Use Python httpx
python -c "import httpx; print(httpx.__version__)"

# Deactivate when done
deactivate
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

// Generate multiple report formats in one call
await exportReport(result, 'security-report', {
  format: ['html', 'json', 'csv', 'text'],
  multiFormat: true,
  uiFormat: true,
  detailed: true,
  openHtml: true
});

// Access the UI-friendly JSON data programmatically
const uiJsonReport = await generateReport(result, {
  format: 'json',
  uiFormat: true
});

const reportData = JSON.parse(uiJsonReport);
console.log(`Scan ID: ${reportData.metadata.scan_id}`);
console.log(`Total vulnerabilities: ${reportData.summary.total_vulnerabilities}`);
console.log(`Severity breakdown:`, reportData.summary.severity_counts);
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

## 🔄 Enhanced Output Features

### UI-Friendly JSON Format

The scanner now provides a UI-optimized JSON format that includes enhanced metadata, visualization data, and structured information designed for integration with user interfaces:

```javascript
{
  "schema_version": "2.0",
  "metadata": {
    "scan_id": "scan-123",
    "target": "https://example.com",
    "target_url": "https://example.com",
    "target_hostname": "example.com",
    "scan_start_time": "2024-01-01T10:00:00.000Z",
    "scan_end_time": "2024-01-01T10:05:00.000Z",
    "scan_duration_seconds": 300,
    "scan_duration_formatted": "5 minutes",
    "project_id": "project-123",
    "scan_profile": "comprehensive"
  },
  "summary": {
    "total_vulnerabilities": 5,
    "severity_counts": {
      "critical": 1,
      "high": 2,
      "medium": 1,
      "low": 1,
      "info": 0
    },
    "tools_count": 3,
    "tools_used": ["nikto", "nuclei", "wapiti"]
  },
  "vulnerabilities": [
    {
      "id": "vuln-001",
      "severity": "high",
      "severity_score": 8.5,
      "title": "SQL Injection",
      "description": "SQL injection vulnerability detected",
      "location": {
        "url": "https://example.com/search",
        "parameter": "q"
      },
      "scan_id": "scan-123",
      "source": "nuclei"
    }
  ],
  "ui": {
    "severity_colors": {
      "critical": "#ff0000",
      "high": "#ff6600",
      "medium": "#ffcc00",
      "low": "#ffff00",
      "info": "#0099ff"
    },
    "severity_icons": {
      "critical": "skull",
      "high": "exclamation-triangle",
      "medium": "exclamation-circle",
      "low": "info-circle",
      "info": "info"
    },
    "charts_data": {
      "severity_distribution": [
        { "severity": "critical", "count": 1 },
        { "severity": "high", "count": 2 },
        { "severity": "medium", "count": 1 },
        { "severity": "low", "count": 1 },
        { "severity": "info", "count": 0 }
      ]
    },
    "vulnerability_groups": [
      {
        "category": "Injection",
        "count": 2,
        "vulnerabilities": ["vuln-001", "vuln-002"]
      }
    ]
  }
}
```

### Multi-Format Output

Generate reports in multiple formats simultaneously:

```bash
# Generate reports in JSON, HTML, and text formats
scanner scan https://example.com --format json,html,text --multi-format

# Generate reports with UI-friendly JSON and open HTML in browser
scanner scan https://example.com --format json,html --ui-json --multi-format --open-html
```

### Browser Integration

HTML reports can be automatically opened in your default browser:

```bash
# Scan and open HTML report
scanner scan https://example.com --format html --open-html

# Generate report from existing scan and open in browser
scanner report <scan-id> --format html --open-html
```

### Detailed Text Reports

Generate comprehensive text reports with detailed vulnerability information:

```bash
# Generate detailed text report
scanner scan https://example.com --format text --detailed

# The detailed report includes:
# - Comprehensive vulnerability details
# - Tool-specific information
# - Formatted for better readability
# - Severity indicators
```

### Backward Compatibility

All enhanced features maintain backward compatibility with existing code and workflows. The standard JSON format is still available alongside the new UI-friendly format.

## � Security Considerations

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
- [httpx-toolkit](https://github.com/projectdiscovery/httpx) for HTTP service discovery
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