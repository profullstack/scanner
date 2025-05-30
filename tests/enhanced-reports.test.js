import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { generateReport, exportReport } from '../lib/reports.js';
import { join } from 'path';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';

describe('Enhanced Report Generation', () => {
  
  // Mock scan result for testing
  const mockScanResult = {
    id: 'test-scan-123',
    target: 'http://example.com',
    parsedUrl: {
      href: 'http://example.com',
      hostname: 'example.com'
    },
    startTime: '2024-01-01T10:00:00.000Z',
    endTime: '2024-01-01T10:05:00.000Z',
    duration: 300,
    tools: ['nikto', 'nuclei'],
    status: 'completed',
    results: {
      nikto: { status: 'completed', vulnerabilities: [] },
      nuclei: { status: 'completed', vulnerabilities: [] }
    },
    vulnerabilities: [
      {
        id: 'vuln-001',
        severity: 'high',
        title: 'Test Vulnerability',
        description: 'Test description',
        url: 'http://example.com/test',
        method: 'GET',
        category: 'Web Application',
        source: 'nikto'
      },
      {
        id: 'vuln-002',
        severity: 'medium',
        title: 'Another Vulnerability',
        description: 'Another description',
        url: 'http://example.com/test2',
        method: 'POST',
        category: 'Security Misconfiguration',
        source: 'nuclei'
      }
    ],
    summary: {
      total: 2,
      critical: 0,
      high: 1,
      medium: 1,
      low: 0,
      info: 0
    },
    outputDir: '/tmp/test-scan',
    projectId: 'test-project-123',
    scanProfile: 'comprehensive'
  };

  // Create a temporary directory for test files
  let tempDir;
  
  test.before(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'scanner-test-'));
  });
  
  test.after(() => {
    // Clean up temporary directory
    rmSync(tempDir, { recursive: true, force: true });
  });

  test('UI-friendly JSON format should include enhanced metadata', async () => {
    const report = await generateReport(mockScanResult, { 
      format: 'json',
      uiFormat: true
    });
    
    const parsed = JSON.parse(report);
    
    // Check schema version
    assert.equal(parsed.schema_version, '2.0');
    
    // Check enhanced metadata
    assert.equal(parsed.metadata.scan_id, mockScanResult.id);
    assert.equal(parsed.metadata.target, mockScanResult.target);
    assert.equal(parsed.metadata.target_url, mockScanResult.parsedUrl.href);
    assert.equal(parsed.metadata.target_hostname, mockScanResult.parsedUrl.hostname);
    assert.equal(parsed.metadata.scan_duration_seconds, mockScanResult.duration);
    assert.ok(parsed.metadata.scan_duration_formatted);
    assert.equal(parsed.metadata.project_id, mockScanResult.projectId);
    assert.equal(parsed.metadata.scan_profile, mockScanResult.scanProfile);
    
    // Check summary
    assert.equal(parsed.summary.total_vulnerabilities, mockScanResult.summary.total);
    assert.equal(parsed.summary.severity_counts.high, mockScanResult.summary.high);
    assert.equal(parsed.summary.severity_counts.medium, mockScanResult.summary.medium);
    assert.equal(parsed.summary.tools_count, mockScanResult.tools.length);
    
    // Check vulnerabilities
    assert.equal(parsed.vulnerabilities.length, mockScanResult.vulnerabilities.length);
    parsed.vulnerabilities.forEach(vuln => {
      assert.ok(vuln.severity_score);
      assert.ok(vuln.scan_id);
      assert.ok(vuln.location);
    });
    
    // Check UI-specific properties
    assert.ok(parsed.ui);
    assert.ok(parsed.ui.severity_colors);
    assert.ok(parsed.ui.severity_icons);
    assert.ok(parsed.ui.charts_data);
    assert.ok(parsed.ui.vulnerability_groups);
  });

  test('Standard JSON format should maintain backward compatibility', async () => {
    const report = await generateReport(mockScanResult, { 
      format: 'json',
      uiFormat: false
    });
    
    const parsed = JSON.parse(report);
    
    // Check backward compatibility
    assert.equal(parsed.metadata.scanId, mockScanResult.id);
    assert.equal(parsed.metadata.target, mockScanResult.target);
    assert.equal(parsed.metadata.scanDuration, mockScanResult.duration);
    assert.equal(parsed.metadata.reportVersion, '1.0');
    
    // Check that enhanced data is also included
    assert.ok(parsed.enhanced);
    assert.equal(parsed.enhanced.schema_version, '2.0');
    assert.equal(parsed.enhanced.metadata.scan_id, mockScanResult.id);
  });

  test('exportReport should support multiple formats', async () => {
    const baseFilename = join(tempDir, 'multi-format-test');
    
    const results = await exportReport(mockScanResult, baseFilename, {
      format: ['json', 'html', 'text'],
      multiFormat: true,
      outputDir: tempDir
    });
    
    // Check that we got results for all formats
    assert.equal(results.length, 3);
    
    // Check that each file exists
    const formatFiles = {
      json: false,
      html: false,
      text: false
    };
    
    results.forEach(result => {
      assert.ok(existsSync(result.filePath));
      formatFiles[result.format] = true;
      
      // Check file content
      const content = readFileSync(result.filePath, 'utf8');
      assert.ok(content.length > 0);
      
      if (result.format === 'json') {
        const parsed = JSON.parse(content);
        assert.equal(parsed.metadata.scanId, mockScanResult.id);
      } else if (result.format === 'html') {
        assert.ok(content.includes('<!DOCTYPE html>'));
        assert.ok(content.includes(mockScanResult.target));
      } else if (result.format === 'text') {
        assert.ok(content.includes('SECURITY SCAN REPORT'));
        assert.ok(content.includes(mockScanResult.target));
      }
    });
    
    // Verify all formats were generated
    Object.values(formatFiles).forEach(exists => {
      assert.equal(exists, true);
    });
  });

  test('Text report should support detailed mode', async () => {
    const basicReport = await generateReport(mockScanResult, { 
      format: 'text',
      detailed: false
    });
    
    const detailedReport = await generateReport(mockScanResult, { 
      format: 'text',
      detailed: true
    });
    
    // Detailed report should be longer
    assert.ok(detailedReport.length > basicReport.length);
    
    // Check for detailed elements
    assert.ok(detailedReport.includes('VULNERABILITY SUMMARY'));
    assert.ok(detailedReport.includes('TOOLS SUMMARY'));
    assert.ok(detailedReport.includes('VULNERABILITIES DETAILS'));
  });
});