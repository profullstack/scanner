#!/usr/bin/env node

import { 
  scanTarget, 
  getScanHistory, 
  getScanStats,
  generateReport,
  exportReport,
  checkToolAvailability,
  validateTarget,
  getConfig,
  updateConfig,
  applyScanProfile
} from '../lib/index.js';

async function apiExample() {
  console.log('🔧 Advanced API Usage Example\n');

  try {
    // Example 1: Check tool availability before scanning
    console.log('1. Checking tool availability...');
    const tools = ['nikto', 'nuclei', 'wapiti'];
    const availability = await checkToolAvailability(tools);
    
    console.log('   Tool availability:');
    Object.entries(availability).forEach(([tool, available]) => {
      console.log(`   ${tool}: ${available ? '✅' : '❌'}`);
    });

    const availableTools = tools.filter(tool => availability[tool]);
    if (availableTools.length === 0) {
      console.log('❌ No tools available for scanning');
      return;
    }

    // Example 2: Validate target before scanning
    console.log('\n2. Validating target...');
    const target = 'http://testphp.vulnweb.com';
    const validation = validateTarget(target);
    
    if (!validation.valid) {
      console.log(`❌ Invalid target: ${validation.error}`);
      return;
    }
    
    console.log(`✅ Target is valid: ${target}`);

    // Example 3: Use scan profile
    console.log('\n3. Using scan profile...');
    const profileConfig = applyScanProfile('quick');
    console.log(`   Profile tools: ${profileConfig.tools.join(', ')}`);

    // Example 4: Configure scanner
    console.log('\n4. Configuring scanner...');
    const currentConfig = getConfig();
    console.log(`   Current timeout: ${currentConfig.scanning.defaultTimeout}s`);
    
    // Update configuration for this example
    updateConfig({
      scanning: {
        defaultTimeout: 60,
        verbose: true
      }
    });
    console.log('   Updated timeout to 60s for quick scan');

    // Example 5: Run scan with custom options
    console.log('\n5. Running scan with custom options...');
    const scanOptions = {
      tools: availableTools.slice(0, 2), // Use first 2 available tools
      timeout: 60,
      verbose: false,
      toolOptions: {
        nikto: { timeout: 60 },
        nuclei: { severity: 'high,critical' }
      }
    };

    const result = await scanTarget(target, scanOptions);
    
    console.log(`✅ Scan completed!`);
    console.log(`   Scan ID: ${result.id}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Duration: ${result.duration}s`);
    console.log(`   Tools used: ${result.tools.join(', ')}`);

    // Example 6: Analyze results
    console.log('\n6. Analyzing results...');
    console.log(`   Total vulnerabilities: ${result.summary.total}`);
    
    if (result.summary.total > 0) {
      console.log('   Severity breakdown:');
      ['critical', 'high', 'medium', 'low', 'info'].forEach(severity => {
        if (result.summary[severity] > 0) {
          console.log(`     ${severity}: ${result.summary[severity]}`);
        }
      });

      // Group vulnerabilities by source tool
      const vulnsByTool = {};
      result.vulnerabilities.forEach(vuln => {
        const tool = vuln.source || 'unknown';
        if (!vulnsByTool[tool]) vulnsByTool[tool] = [];
        vulnsByTool[tool].push(vuln);
      });

      console.log('   Vulnerabilities by tool:');
      Object.entries(vulnsByTool).forEach(([tool, vulns]) => {
        console.log(`     ${tool}: ${vulns.length} vulnerabilities`);
      });
    }

    // Example 7: Generate multiple report formats
    console.log('\n7. Generating reports...');
    
    const formats = ['json', 'html', 'csv'];
    for (const format of formats) {
      try {
        const reportPath = `./example-report.${format}`;
        await exportReport(result, reportPath, { format });
        console.log(`   ✅ ${format.toUpperCase()} report: ${reportPath}`);
      } catch (error) {
        console.log(`   ❌ Failed to generate ${format} report: ${error.message}`);
      }
    }

    // Example 8: Get scan statistics
    console.log('\n8. Scan statistics...');
    const stats = getScanStats();
    console.log(`   Total scans performed: ${stats.totalScans}`);
    console.log(`   Completed scans: ${stats.completedScans}`);
    console.log(`   Total vulnerabilities found: ${stats.totalVulnerabilities}`);
    
    if (stats.mostScannedTargets.length > 0) {
      console.log('   Most scanned targets:');
      stats.mostScannedTargets.slice(0, 3).forEach(({ target, count }) => {
        console.log(`     ${target}: ${count} scans`);
      });
    }

    // Example 9: Get recent scan history
    console.log('\n9. Recent scan history...');
    const history = getScanHistory(5);
    console.log(`   Found ${history.length} recent scans:`);
    
    history.forEach((scan, index) => {
      const date = new Date(scan.startTime).toLocaleDateString();
      console.log(`     ${index + 1}. ${scan.target} (${date}) - ${scan.summary?.total || 0} vulns`);
    });

    // Example 10: Custom vulnerability filtering
    console.log('\n10. Custom vulnerability analysis...');
    
    if (result.vulnerabilities.length > 0) {
      // Filter high severity vulnerabilities
      const highSeverity = result.vulnerabilities.filter(v => 
        ['critical', 'high'].includes(v.severity?.toLowerCase())
      );
      
      console.log(`    High/Critical vulnerabilities: ${highSeverity.length}`);
      
      // Group by category
      const categories = {};
      result.vulnerabilities.forEach(vuln => {
        const category = vuln.category || 'Unknown';
        categories[category] = (categories[category] || 0) + 1;
      });
      
      console.log('    Vulnerability categories:');
      Object.entries(categories).forEach(([category, count]) => {
        console.log(`      ${category}: ${count}`);
      });

      // Find unique URLs affected
      const uniqueUrls = [...new Set(result.vulnerabilities
        .map(v => v.url)
        .filter(url => url && url !== 'N/A')
      )];
      
      console.log(`    Unique URLs affected: ${uniqueUrls.length}`);
    }

    console.log('\n✅ API example completed successfully!');

  } catch (error) {
    console.error('❌ API example failed:', error.message);
    
    // Provide debugging information
    console.log('\n🔍 Debug information:');
    console.log(`   Error type: ${error.constructor.name}`);
    console.log(`   Stack trace: ${error.stack}`);
  }
}

// Helper function to demonstrate custom report generation
async function customReportExample(scanResult) {
  console.log('\n📊 Custom Report Generation Example');
  
  try {
    // Generate a custom summary report
    const customReport = {
      summary: {
        target: scanResult.target,
        scanDate: new Date(scanResult.startTime).toISOString(),
        totalVulnerabilities: scanResult.summary.total,
        riskLevel: getRiskLevel(scanResult.summary),
        toolsUsed: scanResult.tools
      },
      topVulnerabilities: scanResult.vulnerabilities
        .sort((a, b) => getSeverityScore(b.severity) - getSeverityScore(a.severity))
        .slice(0, 5)
        .map(v => ({
          title: v.title,
          severity: v.severity,
          source: v.source,
          url: v.url
        })),
      recommendations: generateRecommendations(scanResult)
    };

    console.log('Custom report generated:');
    console.log(JSON.stringify(customReport, null, 2));

  } catch (error) {
    console.error('Custom report generation failed:', error.message);
  }
}

// Helper functions
function getRiskLevel(summary) {
  if (summary.critical > 0) return 'CRITICAL';
  if (summary.high > 0) return 'HIGH';
  if (summary.medium > 0) return 'MEDIUM';
  if (summary.low > 0) return 'LOW';
  return 'MINIMAL';
}

function getSeverityScore(severity) {
  const scores = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
  return scores[severity?.toLowerCase()] || 0;
}

function generateRecommendations(scanResult) {
  const recommendations = [];
  
  if (scanResult.summary.critical > 0) {
    recommendations.push('Immediately address critical vulnerabilities');
  }
  
  if (scanResult.summary.high > 0) {
    recommendations.push('Prioritize fixing high severity issues');
  }
  
  if (scanResult.summary.total === 0) {
    recommendations.push('Great! No vulnerabilities found. Continue regular scanning.');
  }
  
  recommendations.push('Implement regular security scanning in your CI/CD pipeline');
  
  return recommendations;
}

// Run the example
apiExample();