#!/usr/bin/env node

/**
 * Example: Project Management Usage
 * 
 * This example demonstrates how to use the project management features
 * of the security scanner, including creating projects, running scans
 * associated with projects, and viewing project history.
 */

import { 
  addProject, getProjects, getProject, updateProject, removeProject,
  getProjectHistory, getProjectStats, clearProjectHistory
} from '../lib/config.js';
import { scanTarget } from '../lib/scanner.js';

async function demonstrateProjectManagement() {
  console.log('🚀 Project Management Demo\n');

  try {
    // 1. Create a new project
    console.log('📁 Creating a new project...');
    const project = addProject({
      name: 'Example Website',
      domain: 'example.com',
      description: 'Demo project for testing security scanner'
    });
    
    console.log(`✅ Project created: ${project.name}`);
    console.log(`   ID: ${project.id}`);
    console.log(`   Domain: ${project.domain}`);
    console.log(`   Description: ${project.description}\n`);

    // 2. Create another project with URL
    console.log('📁 Creating another project with URL...');
    const apiProject = addProject({
      name: 'API Server',
      url: 'https://api.example.com',
      description: 'REST API security testing'
    });
    
    console.log(`✅ Project created: ${apiProject.name}`);
    console.log(`   ID: ${apiProject.id}`);
    console.log(`   URL: ${apiProject.url}\n`);

    // 3. List all projects
    console.log('📋 Listing all projects...');
    const projects = getProjects();
    projects.forEach(p => {
      console.log(`- ${p.name} (${p.domain || p.url}) - ${p.scanCount} scans`);
    });
    console.log();

    // 4. Update a project
    console.log('✏️  Updating project...');
    const updatedProject = updateProject(project.id, {
      description: 'Updated: Demo project for comprehensive security testing'
    });
    console.log(`✅ Updated description: ${updatedProject.description}\n`);

    // 5. Simulate adding scan results to project history
    console.log('🔍 Simulating scan results...');
    
    // Mock scan data (in real usage, this would come from actual scans)
    const mockScanData = {
      id: `scan-${Date.now()}`,
      target: 'https://example.com',
      tools: ['nikto', 'nuclei'],
      status: 'completed',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      duration: 120,
      vulnerabilities: [
        { severity: 'high', title: 'SQL Injection', url: 'https://example.com/login' },
        { severity: 'medium', title: 'XSS Vulnerability', url: 'https://example.com/search' },
        { severity: 'low', title: 'Information Disclosure', url: 'https://example.com/info' }
      ],
      summary: {
        total: 3,
        critical: 0,
        high: 1,
        medium: 1,
        low: 1,
        info: 0
      },
      outputDir: '/tmp/example-scan'
    };

    // Add scan to project history (this would normally be done automatically by scanTarget)
    const { addScanToHistory } = await import('../lib/config.js');
    const historyEntry = addScanToHistory(project.id, mockScanData);
    console.log(`✅ Scan added to project history: ${historyEntry.id}\n`);

    // 6. View project details
    console.log('📊 Project details after scan...');
    const projectAfterScan = getProject(project.id);
    console.log(`Project: ${projectAfterScan.name}`);
    console.log(`Scan Count: ${projectAfterScan.scanCount}`);
    console.log(`Last Scan: ${new Date(projectAfterScan.lastScanAt).toLocaleString()}\n`);

    // 7. View project scan history
    console.log('📋 Project scan history...');
    const history = getProjectHistory(project.id);
    history.forEach(scan => {
      console.log(`- ${scan.target} (${new Date(scan.startTime).toLocaleString()})`);
      console.log(`  Tools: ${scan.tools.join(', ')}`);
      console.log(`  Vulnerabilities: ${scan.summary.total} (${scan.summary.high} high, ${scan.summary.medium} medium, ${scan.summary.low} low)`);
    });
    console.log();

    // 8. View project statistics
    console.log('📈 Project statistics...');
    const stats = getProjectStats(project.id);
    console.log(`Total Scans: ${stats.totalScans}`);
    console.log(`Completed Scans: ${stats.completedScans}`);
    console.log(`Total Vulnerabilities: ${stats.totalVulnerabilities}`);
    console.log(`Severity Breakdown:`);
    console.log(`  Critical: ${stats.severityBreakdown.critical}`);
    console.log(`  High: ${stats.severityBreakdown.high}`);
    console.log(`  Medium: ${stats.severityBreakdown.medium}`);
    console.log(`  Low: ${stats.severityBreakdown.low}`);
    console.log(`Tool Usage:`);
    Object.entries(stats.toolUsage).forEach(([tool, count]) => {
      console.log(`  ${tool}: ${count} times`);
    });
    console.log();

    // 9. Global statistics
    console.log('🌍 Global statistics...');
    const globalStats = getProjectStats();
    console.log(`Total Scans Across All Projects: ${globalStats.totalScans}`);
    console.log(`Total Vulnerabilities Found: ${globalStats.totalVulnerabilities}\n`);

    // 10. Clean up demo data
    console.log('🧹 Cleaning up demo data...');
    clearProjectHistory(project.id);
    removeProject(project.id);
    removeProject(apiProject.id);
    console.log('✅ Demo data cleaned up\n');

    console.log('🎉 Project management demo completed successfully!');
    console.log('\n💡 CLI Usage Examples:');
    console.log('   scanner projects --add --name "My Website" --domain "example.com"');
    console.log('   scanner projects --list');
    console.log('   scanner scan https://example.com --project "My Website"');
    console.log('   scanner projects --history "My Website"');
    console.log('   scanner projects --stats "My Website"');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

// CLI Usage Examples
function showCLIExamples() {
  console.log('\n📚 CLI Command Examples:\n');
  
  console.log('🔧 Project Management:');
  console.log('  # Create a new project');
  console.log('  scanner projects --add --name "My Website" --domain "example.com" --description "Main company website"');
  console.log('  scanner projects --add --name "API Server" --url "https://api.example.com"');
  console.log('');
  console.log('  # List all projects');
  console.log('  scanner projects --list');
  console.log('');
  console.log('  # Show project details');
  console.log('  scanner projects --show "My Website"');
  console.log('');
  console.log('  # Remove a project');
  console.log('  scanner projects --remove "My Website"');
  console.log('');

  console.log('🔍 Scanning with Projects:');
  console.log('  # Run scan and associate with project');
  console.log('  scanner scan https://example.com --project "My Website"');
  console.log('  scanner scan https://example.com --project "My Website" --profile comprehensive');
  console.log('  scanner scan https://api.example.com --project "API Server" --tools nikto,nuclei');
  console.log('');

  console.log('📊 Project History and Statistics:');
  console.log('  # View project scan history');
  console.log('  scanner projects --history "My Website"');
  console.log('');
  console.log('  # View project statistics');
  console.log('  scanner projects --stats "My Website"');
  console.log('');
  console.log('  # View global statistics');
  console.log('  scanner projects --stats');
  console.log('');
  console.log('  # Clear project history');
  console.log('  scanner projects --clear-history "My Website"');
  console.log('');

  console.log('🔄 Workflow Example:');
  console.log('  1. scanner projects --add --name "E-commerce Site" --domain "shop.example.com"');
  console.log('  2. scanner scan https://shop.example.com --project "E-commerce Site" --profile owasp');
  console.log('  3. scanner projects --history "E-commerce Site"');
  console.log('  4. scanner projects --stats "E-commerce Site"');
  console.log('  5. scanner report <scan-id> --format html');
}

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--examples')) {
    showCLIExamples();
  } else {
    demonstrateProjectManagement();
  }
}

export { demonstrateProjectManagement, showCLIExamples };