import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Get configuration directory
function getConfigDir() {
  const configDir = join(homedir(), '.config', 'scanner');
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  return configDir;
}

// Get configuration file path
function getConfigPath() {
  return join(getConfigDir(), 'config.json');
}

// Load configuration
function loadConfig() {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) {
    return getDefaultConfig();
  }
  
  try {
    const data = readFileSync(configPath, 'utf8');
    const config = JSON.parse(data);
    return { ...getDefaultConfig(), ...config };
  } catch (error) {
    console.warn('Warning: Could not load configuration, using defaults:', error.message);
    return getDefaultConfig();
  }
}

// Save configuration
function saveConfig(config) {
  const configPath = getConfigPath();
  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error saving configuration:', error.message);
  }
}

// Get default configuration
function getDefaultConfig() {
  return {
    tools: {
      nikto: {
        enabled: true,
        timeout: 300,
        format: 'xml'
      },
      zap: {
        enabled: true,
        timeout: 600,
        spider: true
      },
      wapiti: {
        enabled: true,
        timeout: 300,
        modules: 'all'
      },
      nuclei: {
        enabled: true,
        timeout: 300,
        severity: 'high,critical',
        templates: ''
      },
      sqlmap: {
        enabled: false, // Disabled by default as it's more aggressive
        timeout: 300,
        crawl: 2,
        batch: true
      }
    },
    output: {
      defaultFormat: 'json',
      includeRawOutput: false,
      saveToFile: true,
      outputDir: join(getConfigDir(), 'scans')
    },
    scanning: {
      defaultTimeout: 300,
      maxConcurrentScans: 1,
      retryAttempts: 3,
      verbose: false
    },
    reporting: {
      defaultTemplate: 'default',
      includeMetadata: true,
      generateHtml: true,
      generateJson: true
    },
    proxy: {
      enabled: false,
      host: '',
      port: '',
      username: '',
      password: ''
    },
    notifications: {
      enabled: false,
      webhook: '',
      email: ''
    }
  };
}

/**
 * Get current configuration
 * @returns {Object} Current configuration
 */
export function getConfig() {
  return loadConfig();
}

/**
 * Update configuration
 * @param {Object} updates - Configuration updates
 */
export function updateConfig(updates) {
  const config = loadConfig();
  const newConfig = deepMerge(config, updates);
  saveConfig(newConfig);
}

/**
 * Reset configuration to defaults
 */
export function resetConfig() {
  saveConfig(getDefaultConfig());
}

/**
 * Get tool configuration
 * @param {string} toolName - Name of the tool
 * @returns {Object} Tool configuration
 */
export function getToolConfig(toolName) {
  const config = loadConfig();
  return config.tools[toolName] || {};
}

/**
 * Update tool configuration
 * @param {string} toolName - Name of the tool
 * @param {Object} toolConfig - Tool configuration updates
 */
export function updateToolConfig(toolName, toolConfig) {
  const config = loadConfig();
  if (!config.tools[toolName]) {
    config.tools[toolName] = {};
  }
  config.tools[toolName] = { ...config.tools[toolName], ...toolConfig };
  saveConfig(config);
}

/**
 * Enable or disable a tool
 * @param {string} toolName - Name of the tool
 * @param {boolean} enabled - Whether to enable the tool
 */
export function setToolEnabled(toolName, enabled) {
  updateToolConfig(toolName, { enabled });
}

/**
 * Get enabled tools
 * @returns {Array} Array of enabled tool names
 */
export function getEnabledTools() {
  const config = loadConfig();
  return Object.keys(config.tools).filter(tool => config.tools[tool].enabled);
}

/**
 * Get output configuration
 * @returns {Object} Output configuration
 */
export function getOutputConfig() {
  const config = loadConfig();
  return config.output;
}

/**
 * Update output configuration
 * @param {Object} outputConfig - Output configuration updates
 */
export function updateOutputConfig(outputConfig) {
  updateConfig({ output: outputConfig });
}

/**
 * Get scanning configuration
 * @returns {Object} Scanning configuration
 */
export function getScanningConfig() {
  const config = loadConfig();
  return config.scanning;
}

/**
 * Update scanning configuration
 * @param {Object} scanningConfig - Scanning configuration updates
 */
export function updateScanningConfig(scanningConfig) {
  updateConfig({ scanning: scanningConfig });
}

/**
 * Get reporting configuration
 * @returns {Object} Reporting configuration
 */
export function getReportingConfig() {
  const config = loadConfig();
  return config.reporting;
}

/**
 * Update reporting configuration
 * @param {Object} reportingConfig - Reporting configuration updates
 */
export function updateReportingConfig(reportingConfig) {
  updateConfig({ reporting: reportingConfig });
}

/**
 * Get proxy configuration
 * @returns {Object} Proxy configuration
 */
export function getProxyConfig() {
  const config = loadConfig();
  return config.proxy;
}

/**
 * Update proxy configuration
 * @param {Object} proxyConfig - Proxy configuration updates
 */
export function updateProxyConfig(proxyConfig) {
  updateConfig({ proxy: proxyConfig });
}

/**
 * Set proxy settings
 * @param {string} host - Proxy host
 * @param {string} port - Proxy port
 * @param {string} username - Proxy username (optional)
 * @param {string} password - Proxy password (optional)
 */
export function setProxy(host, port, username = '', password = '') {
  updateProxyConfig({
    enabled: true,
    host,
    port,
    username,
    password
  });
}

/**
 * Disable proxy
 */
export function disableProxy() {
  updateProxyConfig({ enabled: false });
}

/**
 * Get notification configuration
 * @returns {Object} Notification configuration
 */
export function getNotificationConfig() {
  const config = loadConfig();
  return config.notifications;
}

/**
 * Update notification configuration
 * @param {Object} notificationConfig - Notification configuration updates
 */
export function updateNotificationConfig(notificationConfig) {
  updateConfig({ notifications: notificationConfig });
}

/**
 * Set webhook URL for notifications
 * @param {string} webhookUrl - Webhook URL
 */
export function setWebhook(webhookUrl) {
  updateNotificationConfig({
    enabled: true,
    webhook: webhookUrl
  });
}

/**
 * Set email for notifications
 * @param {string} email - Email address
 */
export function setNotificationEmail(email) {
  updateNotificationConfig({
    enabled: true,
    email: email
  });
}

/**
 * Disable notifications
 */
export function disableNotifications() {
  updateNotificationConfig({ enabled: false });
}

/**
 * Get configuration file path
 * @returns {string} Configuration file path
 */
export function getConfigFilePath() {
  return getConfigPath();
}

/**
 * Get configuration directory path
 * @returns {string} Configuration directory path
 */
export function getConfigDirectory() {
  return getConfigDir();
}

/**
 * Export configuration to file
 * @param {string} filePath - Export file path
 */
export function exportConfig(filePath) {
  const config = loadConfig();
  writeFileSync(filePath, JSON.stringify(config, null, 2));
}

/**
 * Import configuration from file
 * @param {string} filePath - Import file path
 */
export function importConfig(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Configuration file not found: ${filePath}`);
  }
  
  try {
    const data = readFileSync(filePath, 'utf8');
    const importedConfig = JSON.parse(data);
    
    // Validate imported configuration
    const defaultConfig = getDefaultConfig();
    const validatedConfig = validateConfig(importedConfig, defaultConfig);
    
    saveConfig(validatedConfig);
  } catch (error) {
    throw new Error(`Error importing configuration: ${error.message}`);
  }
}

/**
 * Validate configuration against default structure
 * @param {Object} config - Configuration to validate
 * @param {Object} defaultConfig - Default configuration structure
 * @returns {Object} Validated configuration
 */
function validateConfig(config, defaultConfig) {
  const validated = { ...defaultConfig };
  
  // Recursively validate and merge configuration
  function mergeValidated(target, source, defaults) {
    for (const key in defaults) {
      if (source && source.hasOwnProperty(key)) {
        if (typeof defaults[key] === 'object' && defaults[key] !== null && !Array.isArray(defaults[key])) {
          target[key] = mergeValidated({}, source[key], defaults[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
    return target;
  }
  
  return mergeValidated(validated, config, defaultConfig);
}

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
}

/**
 * Get scan profiles (predefined configurations)
 * @returns {Object} Available scan profiles
 */
export function getScanProfiles() {
  return {
    quick: {
      name: 'Quick Scan',
      description: 'Fast scan with basic vulnerability detection',
      tools: ['nikto', 'nuclei'],
      toolOptions: {
        nikto: { timeout: 120 },
        nuclei: { timeout: 120, severity: 'high,critical' }
      }
    },
    standard: {
      name: 'Standard Scan',
      description: 'Comprehensive scan with multiple tools',
      tools: ['nikto', 'wapiti', 'nuclei'],
      toolOptions: {
        nikto: { timeout: 300 },
        wapiti: { timeout: 300 },
        nuclei: { timeout: 300, severity: 'medium,high,critical' }
      }
    },
    comprehensive: {
      name: 'Comprehensive Scan',
      description: 'Thorough scan with all available tools',
      tools: ['nikto', 'zap', 'wapiti', 'nuclei', 'sqlmap'],
      toolOptions: {
        nikto: { timeout: 600 },
        zap: { timeout: 900 },
        wapiti: { timeout: 600 },
        nuclei: { timeout: 600, severity: 'low,medium,high,critical' },
        sqlmap: { timeout: 600, crawl: 3 }
      }
    },
    owasp: {
      name: 'OWASP Top 10 Scan',
      description: 'Focused scan for OWASP Top 10 vulnerabilities',
      tools: ['zap', 'nuclei', 'sqlmap'],
      toolOptions: {
        zap: { timeout: 600 },
        nuclei: { timeout: 300, templates: 'owasp' },
        sqlmap: { timeout: 300, crawl: 2 }
      }
    }
  };
}

/**
 * Apply a scan profile
 * @param {string} profileName - Name of the profile to apply
 * @returns {Object} Profile configuration
 */
export function applyScanProfile(profileName) {
  const profiles = getScanProfiles();
  const profile = profiles[profileName];
  
  if (!profile) {
    throw new Error(`Unknown scan profile: ${profileName}`);
  }
  
  return {
    tools: profile.tools,
    toolOptions: profile.toolOptions || {}
  };
}

/**
 * Clean configuration data
 * @param {boolean} keepUserSettings - Whether to keep user settings
 */
export function cleanConfig(keepUserSettings = true) {
  if (keepUserSettings) {
    // Reset to defaults but keep user-specific settings
    const config = loadConfig();
    const defaultConfig = getDefaultConfig();
    
    // Keep proxy and notification settings
    defaultConfig.proxy = config.proxy;
    defaultConfig.notifications = config.notifications;
    
    saveConfig(defaultConfig);
  } else {
    // Complete reset
    resetConfig();
  }
}