import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { generateReport, getReportFormats } from '../lib/reports.js';

describe('Report Generation', () => {
  
  // Mock scan result for testing
  const mockScanResult = {
    id: 'test-scan-123',
    target: 'http://example.com',
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
    outputDir: '/tmp/test-scan'
  };

  test('getReportFormats should return available formats', () => {
    const formats = getReportFormats();
    
    assert.equal(Array.isArray(formats), true);
    assert.ok(formats.length > 0);
    
    formats.forEach(format => {
      assert.equal(typeof format.format, 'string');
      assert.equal(typeof format.description, 'string');
      assert.equal(typeof format.extension, 'string');
      assert.ok(format.extension.startsWith('.'));
    });
  });

  test('generateReport should create JSON report', async () => {
    const report = await generateReport(mockScanResult, { format: 'json' });
    
    assert.equal(typeof report, 'string');
    
    const parsed = JSON.parse(report);
    assert.equal(typeof parsed, 'object');
    assert.ok(parsed.metadata);
    assert.ok(parsed.summary);
    assert.ok(parsed.vulnerabilities);
    assert.equal(Array.isArray(parsed.vulnerabilities), true);
  });

  test('generateReport should create HTML report', async () => {
    const report = await generateReport(mockScanResult, { format: 'html' });
    
    assert.equal(typeof report, 'string');
    assert.ok(report.includes('<!DOCTYPE html>'));
    assert.ok(report.includes('<html'));
    assert.ok(report.includes('</html>'));
    assert.ok(report.includes(mockScanResult.target));
  });

  test('generateReport should create CSV report', async () => {
    const report = await generateReport(mockScanResult, { format: 'csv' });
    
    assert.equal(typeof report, 'string');
    
    const lines = report.split('\n');
    assert.ok(lines.length > 1); // Should have header + data rows
    
    // Check header
    const header = lines[0];
    assert.ok(header.includes('Vulnerability ID'));
    assert.ok(header.includes('Title'));
    assert.ok(header.includes('Severity'));
  });

  test('generateReport should create XML report', async () => {
    const report = await generateReport(mockScanResult, { format: 'xml' });
    
    assert.equal(typeof report, 'string');
    assert.ok(report.includes('<?xml version="1.0"'));
    assert.ok(report.includes('<scanReport>'));
    assert.ok(report.includes('</scanReport>'));
    assert.ok(report.includes('<vulnerabilities>'));
  });

  test('generateReport should create Markdown report', async () => {
    const report = await generateReport(mockScanResult, { format: 'markdown' });
    
    assert.equal(typeof report, 'string');
    assert.ok(report.includes('# 🛡️ Security Scan Report'));
    assert.ok(report.includes('## 📊 Summary'));
    assert.ok(report.includes(mockScanResult.target));
  });

  test('generateReport should create text report', async () => {
    const report = await generateReport(mockScanResult, { format: 'text' });
    
    assert.equal(typeof report, 'string');
    assert.ok(report.includes('SECURITY SCAN REPORT'));
    assert.ok(report.includes('SUMMARY'));
    assert.ok(report.includes(mockScanResult.target));
  });

  test('generateReport should throw error for unsupported format', async () => {
    try {
      await generateReport(mockScanResult, { format: 'unsupported' });
      assert.fail('Should have thrown an error for unsupported format');
    } catch (error) {
      assert.ok(error.message.includes('Unsupported report format'));
    }
  });

  test('JSON report should have correct structure', async () => {
    const report = await generateReport(mockScanResult, { format: 'json' });
    const parsed = JSON.parse(report);
    
    // Check metadata
    assert.equal(typeof parsed.metadata, 'object');
    assert.equal(parsed.metadata.scanId, mockScanResult.id);
    assert.equal(parsed.metadata.target, mockScanResult.target);
    assert.equal(Array.isArray(parsed.metadata.toolsUsed), true);
    
    // Check summary
    assert.equal(typeof parsed.summary, 'object');
    assert.equal(parsed.summary.total, mockScanResult.summary.total);
    assert.equal(parsed.summary.status, mockScanResult.status);
    
    // Check vulnerabilities
    assert.equal(Array.isArray(parsed.vulnerabilities), true);
    assert.equal(parsed.vulnerabilities.length, mockScanResult.vulnerabilities.length);
    
    parsed.vulnerabilities.forEach(vuln => {
      assert.equal(typeof vuln.id, 'string');
      assert.equal(typeof vuln.severity, 'string');
      assert.equal(typeof vuln.title, 'string');
      assert.equal(vuln.scanId, mockScanResult.id);
    });
  });

  test('HTML report should include vulnerability details', async () => {
    const report = await generateReport(mockScanResult, { format: 'html' });
    
    mockScanResult.vulnerabilities.forEach(vuln => {
      assert.ok(report.includes(vuln.title));
      assert.ok(report.includes(vuln.severity.toUpperCase())); // HTML shows severity in uppercase
      assert.ok(report.includes(vuln.source));
    });
  });

  test('CSV report should have correct number of rows', async () => {
    const report = await generateReport(mockScanResult, { format: 'csv' });
    const lines = report.split('\n').filter(line => line.trim());
    
    // Should have header + one row per vulnerability
    assert.equal(lines.length, mockScanResult.vulnerabilities.length + 1);
  });

  test('report should handle empty vulnerabilities', async () => {
    const emptyScanResult = {
      ...mockScanResult,
      vulnerabilities: [],
      summary: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0
      }
    };

    const jsonReport = await generateReport(emptyScanResult, { format: 'json' });
    const parsed = JSON.parse(jsonReport);
    assert.equal(parsed.vulnerabilities.length, 0);
    assert.equal(parsed.summary.total, 0);

    const htmlReport = await generateReport(emptyScanResult, { format: 'html' });
    assert.ok(htmlReport.includes('No Vulnerabilities Found'));
  });

  test('report should include scan metadata', async () => {
    const report = await generateReport(mockScanResult, { format: 'json' });
    const parsed = JSON.parse(report);
    
    assert.equal(parsed.metadata.scanId, mockScanResult.id);
    assert.equal(parsed.metadata.target, mockScanResult.target);
    assert.equal(parsed.metadata.scanDuration, mockScanResult.duration);
    assert.equal(typeof parsed.metadata.reportGeneratedAt, 'string');
    assert.equal(parsed.metadata.reportVersion, '1.0');
  });

});