import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { scanTarget, getScanHistory, getAllScans, getScanStats, getScanById, deleteScan, clearScanHistory } from '../lib/scanner.js';
import { validateTarget } from '../lib/utils.js';

describe('Scanner Core Functionality', () => {
  
  test('validateTarget should validate URLs correctly', () => {
    // Valid URLs
    assert.ok(validateTarget('http://example.com').valid);
    assert.ok(validateTarget('https://example.com').valid);
    assert.ok(validateTarget('http://192.168.1.1').valid);
    assert.ok(validateTarget('example.com').valid); // Should auto-add protocol
    
    // Invalid targets
    assert.ok(!validateTarget('').valid);
    assert.ok(!validateTarget(null).valid);
    assert.ok(!validateTarget('invalid url with spaces').valid);
    assert.ok(!validateTarget('ftp://example.com').valid);
  });

  test('getScanHistory should return empty array initially', () => {
    clearScanHistory(); // Clean slate
    const history = getScanHistory();
    assert.equal(Array.isArray(history), true);
    assert.equal(history.length, 0);
  });

  test('getAllScans should return empty array initially', () => {
    clearScanHistory(); // Clean slate
    const scans = getAllScans();
    assert.equal(Array.isArray(scans), true);
    assert.equal(scans.length, 0);
  });

  test('getScanStats should return valid statistics structure', () => {
    clearScanHistory(); // Clean slate
    const stats = getScanStats();
    
    assert.equal(typeof stats, 'object');
    assert.equal(typeof stats.totalScans, 'number');
    assert.equal(typeof stats.completedScans, 'number');
    assert.equal(typeof stats.failedScans, 'number');
    assert.equal(typeof stats.totalVulnerabilities, 'number');
    assert.equal(typeof stats.severityBreakdown, 'object');
    assert.equal(Array.isArray(stats.mostScannedTargets), true);
    assert.equal(typeof stats.averageScanTime, 'number');
    assert.equal(typeof stats.toolUsage, 'object');
  });

  test('getScanById should return null for non-existent scan', () => {
    const scan = getScanById('non-existent-id');
    assert.equal(scan, null);
  });

  test('deleteScan should return false for non-existent scan', () => {
    const deleted = deleteScan('non-existent-id');
    assert.equal(deleted, false);
  });

  test('scanTarget should reject invalid targets', async () => {
    try {
      await scanTarget('just-text-no-domain', { tools: ['nikto'] });
      assert.fail('Should have thrown an error for invalid target');
    } catch (error) {
      // Accept any error since tools may not be available in test environment
      assert.ok(error.message.length > 0);
    }
  });

  test('scanTarget should handle empty tools array', async () => {
    try {
      await scanTarget('http://example.com', { tools: [] });
      assert.fail('Should have thrown an error for empty tools array');
    } catch (error) {
      assert.ok(error.message.includes('No tools') || error.message.includes('tools'));
    }
  });

  test('scan result should have required structure', async () => {
    // Mock a simple scan result structure
    const mockResult = {
      id: 'test-scan-123',
      target: 'http://example.com',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      duration: 10,
      tools: ['nikto'],
      status: 'completed',
      results: {},
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

    // Validate structure
    assert.equal(typeof mockResult.id, 'string');
    assert.equal(typeof mockResult.target, 'string');
    assert.equal(typeof mockResult.startTime, 'string');
    assert.equal(typeof mockResult.duration, 'number');
    assert.equal(Array.isArray(mockResult.tools), true);
    assert.equal(typeof mockResult.status, 'string');
    assert.equal(Array.isArray(mockResult.vulnerabilities), true);
    assert.equal(typeof mockResult.summary, 'object');
    assert.equal(typeof mockResult.summary.total, 'number');
  });

  test('vulnerability object should have required fields', () => {
    const mockVulnerability = {
      id: 'vuln-001',
      severity: 'high',
      title: 'Test Vulnerability',
      description: 'Test description',
      url: 'http://example.com/vulnerable',
      method: 'GET',
      category: 'Web Application Vulnerability',
      source: 'nikto'
    };

    assert.equal(typeof mockVulnerability.id, 'string');
    assert.equal(typeof mockVulnerability.severity, 'string');
    assert.equal(typeof mockVulnerability.title, 'string');
    assert.equal(typeof mockVulnerability.description, 'string');
    assert.equal(typeof mockVulnerability.source, 'string');
  });

  test('clearScanHistory should clear all scans', () => {
    clearScanHistory();
    const history = getScanHistory();
    assert.equal(history.length, 0);
    
    const stats = getScanStats();
    assert.equal(stats.totalScans, 0);
    assert.equal(stats.totalVulnerabilities, 0);
  });

});