import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { 
  getConfig, 
  updateConfig, 
  resetConfig, 
  getEnabledTools, 
  setToolEnabled,
  getToolConfig,
  updateToolConfig,
  getScanProfiles,
  applyScanProfile,
  getOutputConfig,
  updateOutputConfig
} from '../lib/config.js';

describe('Configuration Management', () => {
  
  test('getConfig should return valid configuration object', () => {
    const config = getConfig();
    
    assert.equal(typeof config, 'object');
    assert.ok(config.tools);
    assert.ok(config.output);
    assert.ok(config.scanning);
    assert.ok(config.reporting);
    assert.ok(config.proxy);
    assert.ok(config.notifications);
  });

  test('resetConfig should restore default configuration', () => {
    // Modify config first
    updateConfig({ scanning: { defaultTimeout: 999 } });
    
    // Reset to defaults
    resetConfig();
    
    const config = getConfig();
    assert.equal(config.scanning.defaultTimeout, 300); // Default value
  });

  test('updateConfig should merge configuration correctly', () => {
    const originalConfig = getConfig();
    const originalTimeout = originalConfig.scanning.defaultTimeout;
    
    updateConfig({
      scanning: {
        defaultTimeout: 600,
        verbose: true
      }
    });
    
    const updatedConfig = getConfig();
    assert.equal(updatedConfig.scanning.defaultTimeout, 600);
    assert.equal(updatedConfig.scanning.verbose, true);
    
    // Other settings should remain unchanged
    assert.equal(updatedConfig.scanning.maxConcurrentScans, originalConfig.scanning.maxConcurrentScans);
    
    // Reset for other tests
    resetConfig();
  });

  test('getEnabledTools should return array of enabled tools', () => {
    const enabledTools = getEnabledTools();
    
    assert.equal(Array.isArray(enabledTools), true);
    
    enabledTools.forEach(tool => {
      assert.equal(typeof tool, 'string');
      const toolConfig = getToolConfig(tool);
      assert.equal(toolConfig.enabled, true);
    });
  });

  test('setToolEnabled should enable/disable tools correctly', () => {
    // Test enabling a tool
    setToolEnabled('nikto', true);
    let toolConfig = getToolConfig('nikto');
    assert.equal(toolConfig.enabled, true);
    
    // Test disabling a tool
    setToolEnabled('nikto', false);
    toolConfig = getToolConfig('nikto');
    assert.equal(toolConfig.enabled, false);
    
    // Reset for other tests
    resetConfig();
  });

  test('getToolConfig should return tool-specific configuration', () => {
    const niktoConfig = getToolConfig('nikto');
    
    assert.equal(typeof niktoConfig, 'object');
    assert.equal(typeof niktoConfig.enabled, 'boolean');
    assert.equal(typeof niktoConfig.timeout, 'number');
  });

  test('updateToolConfig should update tool settings', () => {
    updateToolConfig('nikto', {
      timeout: 500,
      format: 'json'
    });
    
    const toolConfig = getToolConfig('nikto');
    assert.equal(toolConfig.timeout, 500);
    assert.equal(toolConfig.format, 'json');
    
    // Reset for other tests
    resetConfig();
  });

  test('getScanProfiles should return available profiles', () => {
    const profiles = getScanProfiles();
    
    assert.equal(typeof profiles, 'object');
    
    // Check that standard profiles exist
    assert.ok(profiles.quick);
    assert.ok(profiles.standard);
    assert.ok(profiles.comprehensive);
    assert.ok(profiles.owasp);
    
    Object.values(profiles).forEach(profile => {
      assert.equal(typeof profile.name, 'string');
      assert.equal(typeof profile.description, 'string');
      assert.equal(Array.isArray(profile.tools), true);
      assert.ok(profile.tools.length > 0);
    });
  });

  test('applyScanProfile should return profile configuration', () => {
    const profileConfig = applyScanProfile('quick');
    
    assert.equal(typeof profileConfig, 'object');
    assert.equal(Array.isArray(profileConfig.tools), true);
    assert.ok(profileConfig.tools.length > 0);
    assert.equal(typeof profileConfig.toolOptions, 'object');
  });

  test('applyScanProfile should throw error for unknown profile', () => {
    try {
      applyScanProfile('unknown-profile');
      assert.fail('Should have thrown an error for unknown profile');
    } catch (error) {
      assert.ok(error.message.includes('Unknown scan profile'));
    }
  });

  test('getOutputConfig should return output configuration', () => {
    const outputConfig = getOutputConfig();
    
    assert.equal(typeof outputConfig, 'object');
    assert.equal(typeof outputConfig.defaultFormat, 'string');
    assert.equal(typeof outputConfig.includeRawOutput, 'boolean');
    assert.equal(typeof outputConfig.saveToFile, 'boolean');
    assert.equal(typeof outputConfig.outputDir, 'string');
  });

  test('updateOutputConfig should update output settings', () => {
    updateOutputConfig({
      defaultFormat: 'html',
      includeRawOutput: true
    });
    
    const outputConfig = getOutputConfig();
    assert.equal(outputConfig.defaultFormat, 'html');
    assert.equal(outputConfig.includeRawOutput, true);
    
    // Reset for other tests
    resetConfig();
  });

  test('configuration should persist tool states', () => {
    // Enable a tool
    setToolEnabled('sqlmap', true);
    
    // Check it's in enabled tools
    const enabledTools = getEnabledTools();
    assert.ok(enabledTools.includes('sqlmap'));
    
    // Disable it
    setToolEnabled('sqlmap', false);
    
    // Check it's no longer in enabled tools
    const updatedEnabledTools = getEnabledTools();
    assert.ok(!updatedEnabledTools.includes('sqlmap'));
    
    // Reset for other tests
    resetConfig();
  });

  test('default configuration should have reasonable values', () => {
    resetConfig();
    const config = getConfig();
    
    // Check scanning defaults
    assert.equal(config.scanning.defaultTimeout, 300);
    assert.equal(config.scanning.maxConcurrentScans, 1);
    assert.equal(config.scanning.retryAttempts, 3);
    assert.equal(config.scanning.verbose, false);
    
    // Check output defaults
    assert.equal(config.output.defaultFormat, 'json');
    assert.equal(config.output.includeRawOutput, false);
    assert.equal(config.output.saveToFile, true);
    
    // Check reporting defaults
    assert.equal(config.reporting.defaultTemplate, 'default');
    assert.equal(config.reporting.includeMetadata, true);
    assert.equal(config.reporting.generateHtml, true);
    assert.equal(config.reporting.generateJson, true);
  });

  test('tool configuration should have required fields', () => {
    const config = getConfig();
    
    Object.entries(config.tools).forEach(([toolName, toolConfig]) => {
      assert.equal(typeof toolConfig.enabled, 'boolean');
      assert.equal(typeof toolConfig.timeout, 'number');
      assert.ok(toolConfig.timeout > 0);
    });
  });

  test('scan profiles should have valid tool configurations', () => {
    const profiles = getScanProfiles();
    
    Object.entries(profiles).forEach(([profileName, profile]) => {
      // All tools in profile should be strings
      profile.tools.forEach(tool => {
        assert.equal(typeof tool, 'string');
        assert.ok(tool.length > 0);
      });
      
      // Tool options should be valid if present
      if (profile.toolOptions) {
        Object.entries(profile.toolOptions).forEach(([tool, options]) => {
          assert.equal(typeof options, 'object');
          if (options.timeout) {
            assert.equal(typeof options.timeout, 'number');
            assert.ok(options.timeout > 0);
          }
        });
      }
    });
  });

});