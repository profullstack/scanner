#!/usr/bin/env node

import { scanTarget, getScanHistory } from '../lib/index.js';

async function basicExample() {
  console.log('🛡️  Basic Scanner Usage Example\n');

  try {
    // Example 1: Basic scan with default tools
    console.log('1. Running basic scan...');
    const result = await scanTarget('http://testphp.vulnweb.com', {
      tools: ['nikto', 'nuclei'],
      verbose: true,
      timeout: 120
    });

    console.log(`✅ Scan completed!`);
    console.log(`   Target: ${result.target}`);
    console.log(`   Duration: ${result.duration} seconds`);
    console.log(`   Vulnerabilities found: ${result.summary.total}`);
    console.log(`   Scan ID: ${result.id}`);

    // Example 2: Show vulnerability breakdown
    if (result.vulnerabilities.length > 0) {
      console.log('\n📊 Vulnerability Breakdown:');
      const severityCounts = {};
      result.vulnerabilities.forEach(vuln => {
        const severity = vuln.severity || 'unknown';
        severityCounts[severity] = (severityCounts[severity] || 0) + 1;
      });

      Object.entries(severityCounts).forEach(([severity, count]) => {
        console.log(`   ${severity}: ${count}`);
      });

      console.log('\n🚨 Sample vulnerabilities:');
      result.vulnerabilities.slice(0, 3).forEach((vuln, index) => {
        console.log(`   ${index + 1}. ${vuln.title} (${vuln.severity})`);
        console.log(`      Source: ${vuln.source}`);
        console.log(`      URL: ${vuln.url || 'N/A'}`);
      });
    }

    // Example 3: Show scan history
    console.log('\n📋 Recent scan history:');
    const history = getScanHistory(3);
    history.forEach((scan, index) => {
      console.log(`   ${index + 1}. ${scan.target} - ${scan.status} (${scan.summary?.total || 0} vulns)`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Show helpful information for common errors
    if (error.message.includes('Invalid target')) {
      console.log('\n💡 Make sure to provide a valid URL or IP address');
      console.log('   Examples: http://example.com, https://192.168.1.1');
    } else if (error.message.includes('Tool not available')) {
      console.log('\n💡 Install required security tools:');
      console.log('   Ubuntu: sudo apt-get install nikto');
      console.log('   macOS: brew install nikto');
      console.log('   Nuclei: go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest');
    }
  }
}

// Run the example
basicExample();