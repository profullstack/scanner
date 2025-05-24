import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { randomUUID } from 'crypto';

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

// Project management functions

/**
 * Get projects file path
 * @returns {string} Projects file path
 */
function getProjectsPath() {
  return join(getConfigDir(), 'projects.json');
}

/**
 * Get history file path
 * @returns {string} History file path
 */
function getHistoryPath() {
  return join(getConfigDir(), 'history.json');
}

/**
 * Load projects
 * @returns {Array} Array of projects
 */
function loadProjects() {
  const projectsPath = getProjectsPath();
  if (!existsSync(projectsPath)) {
    return [];
  }
  
  try {
    const data = readFileSync(projectsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Warning: Could not load projects, returning empty array:', error.message);
    return [];
  }
}

/**
 * Save projects
 * @param {Array} projects - Array of projects
 */
function saveProjects(projects) {
  const projectsPath = getProjectsPath();
  try {
    writeFileSync(projectsPath, JSON.stringify(projects, null, 2));
  } catch (error) {
    console.error('Error saving projects:', error.message);
  }
}

/**
 * Load scan history
 * @returns {Array} Array of scan history entries
 */
function loadHistory() {
  const historyPath = getHistoryPath();
  if (!existsSync(historyPath)) {
    return [];
  }
  
  try {
    const data = readFileSync(historyPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Warning: Could not load history, returning empty array:', error.message);
    return [];
  }
}

/**
 * Save scan history
 * @param {Array} history - Array of history entries
 */
function saveHistory(history) {
  const historyPath = getHistoryPath();
  try {
    writeFileSync(historyPath, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error('Error saving history:', error.message);
  }
}

/**
 * Add a new project
 * @param {Object} projectData - Project data
 * @param {string} projectData.name - Project name
 * @param {string} [projectData.domain] - Project domain
 * @param {string} [projectData.url] - Project URL
 * @param {string} [projectData.description] - Project description
 * @returns {Object} Created project
 */
export function addProject(projectData) {
  const { name, domain, url, description } = projectData;
  
  if (!name) {
    throw new Error('Project name is required');
  }
  
  if (!domain && !url) {
    throw new Error('Either domain or URL is required');
  }
  
  const projects = loadProjects();
  
  // Check if project with same name already exists
  const existingProject = projects.find(p => p.name === name);
  if (existingProject) {
    throw new Error(`Project with name "${name}" already exists`);
  }
  
  const project = {
    id: randomUUID(),
    name,
    domain: domain || null,
    url: url || null,
    description: description || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scanCount: 0,
    lastScanAt: null
  };
  
  projects.push(project);
  saveProjects(projects);
  
  return project;
}

/**
 * Remove a project
 * @param {string} projectId - Project ID or name
 * @returns {boolean} True if project was removed
 */
export function removeProject(projectId) {
  const projects = loadProjects();
  const initialLength = projects.length;
  
  // Filter out project by ID or name
  const filteredProjects = projects.filter(p =>
    p.id !== projectId && p.name !== projectId
  );
  
  if (filteredProjects.length === initialLength) {
    return false; // No project was removed
  }
  
  saveProjects(filteredProjects);
  
  // Also remove related history entries
  const history = loadHistory();
  const filteredHistory = history.filter(h => h.projectId !== projectId);
  saveHistory(filteredHistory);
  
  return true;
}

/**
 * Get all projects
 * @returns {Array} Array of projects
 */
export function getProjects() {
  return loadProjects();
}

/**
 * Get project by ID or name
 * @param {string} identifier - Project ID or name
 * @returns {Object|null} Project or null if not found
 */
export function getProject(identifier) {
  const projects = loadProjects();
  return projects.find(p => p.id === identifier || p.name === identifier) || null;
}

/**
 * Update project
 * @param {string} projectId - Project ID or name
 * @param {Object} updates - Updates to apply
 * @returns {Object|null} Updated project or null if not found
 */
export function updateProject(projectId, updates) {
  const projects = loadProjects();
  const projectIndex = projects.findIndex(p => p.id === projectId || p.name === projectId);
  
  if (projectIndex === -1) {
    return null;
  }
  
  // Validate updates
  if (updates.name && updates.name !== projects[projectIndex].name) {
    const existingProject = projects.find(p => p.name === updates.name);
    if (existingProject) {
      throw new Error(`Project with name "${updates.name}" already exists`);
    }
  }
  
  projects[projectIndex] = {
    ...projects[projectIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  saveProjects(projects);
  return projects[projectIndex];
}

/**
 * Add scan to project history
 * @param {string} projectId - Project ID
 * @param {Object} scanData - Scan data
 * @returns {Object} History entry
 */
export function addScanToHistory(projectId, scanData) {
  const project = getProject(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  
  const history = loadHistory();
  const historyEntry = {
    id: randomUUID(),
    projectId: project.id,
    projectName: project.name,
    scanId: scanData.id,
    target: scanData.target,
    tools: scanData.tools || [],
    status: scanData.status || 'completed',
    startTime: scanData.startTime || new Date().toISOString(),
    endTime: scanData.endTime || new Date().toISOString(),
    duration: scanData.duration || 0,
    vulnerabilities: scanData.vulnerabilities || [],
    summary: scanData.summary || {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    },
    outputDir: scanData.outputDir || null,
    metadata: {
      userAgent: scanData.userAgent || null,
      scanProfile: scanData.scanProfile || null,
      toolOptions: scanData.toolOptions || {},
      ...scanData.metadata
    }
  };
  
  history.push(historyEntry);
  saveHistory(history);
  
  // Update project scan count and last scan time
  updateProject(project.id, {
    scanCount: project.scanCount + 1,
    lastScanAt: historyEntry.startTime
  });
  
  return historyEntry;
}

/**
 * Get project scan history
 * @param {string} projectId - Project ID or name
 * @param {number} [limit] - Maximum number of entries to return
 * @returns {Array} Array of history entries
 */
export function getProjectHistory(projectId, limit = null) {
  const project = getProject(projectId);
  if (!project) {
    return [];
  }
  
  const history = loadHistory();
  const projectHistory = history
    .filter(h => h.projectId === project.id)
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  
  return limit ? projectHistory.slice(0, limit) : projectHistory;
}

/**
 * Get all scan history
 * @param {number} [limit] - Maximum number of entries to return
 * @returns {Array} Array of history entries
 */
export function getAllHistory(limit = null) {
  const history = loadHistory();
  const sortedHistory = history.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  
  return limit ? sortedHistory.slice(0, limit) : sortedHistory;
}

/**
 * Get history entry by scan ID
 * @param {string} scanId - Scan ID
 * @returns {Object|null} History entry or null if not found
 */
export function getHistoryByScanId(scanId) {
  const history = loadHistory();
  return history.find(h => h.scanId === scanId) || null;
}

/**
 * Clear project history
 * @param {string} [projectId] - Project ID (if not provided, clears all history)
 */
export function clearProjectHistory(projectId = null) {
  if (projectId) {
    const project = getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    
    const history = loadHistory();
    const filteredHistory = history.filter(h => h.projectId !== project.id);
    saveHistory(filteredHistory);
    
    // Reset project scan count
    updateProject(project.id, {
      scanCount: 0,
      lastScanAt: null
    });
  } else {
    // Clear all history
    saveHistory([]);
    
    // Reset all project scan counts
    const projects = loadProjects();
    projects.forEach(project => {
      updateProject(project.id, {
        scanCount: 0,
        lastScanAt: null
      });
    });
  }
}

/**
 * Get project statistics
 * @param {string} [projectId] - Project ID (if not provided, returns global stats)
 * @returns {Object} Statistics
 */
export function getProjectStats(projectId = null) {
  const history = projectId ? getProjectHistory(projectId) : getAllHistory();
  
  const stats = {
    totalScans: history.length,
    completedScans: history.filter(h => h.status === 'completed').length,
    failedScans: history.filter(h => h.status === 'failed').length,
    totalVulnerabilities: history.reduce((sum, h) => sum + (h.summary?.total || 0), 0),
    severityBreakdown: {
      critical: history.reduce((sum, h) => sum + (h.summary?.critical || 0), 0),
      high: history.reduce((sum, h) => sum + (h.summary?.high || 0), 0),
      medium: history.reduce((sum, h) => sum + (h.summary?.medium || 0), 0),
      low: history.reduce((sum, h) => sum + (h.summary?.low || 0), 0),
      info: history.reduce((sum, h) => sum + (h.summary?.info || 0), 0)
    },
    averageScanTime: history.length > 0 ?
      Math.round(history.reduce((sum, h) => sum + (h.duration || 0), 0) / history.length) : 0,
    toolUsage: {},
    scansByMonth: {}
  };
  
  // Calculate tool usage
  history.forEach(h => {
    (h.tools || []).forEach(tool => {
      stats.toolUsage[tool] = (stats.toolUsage[tool] || 0) + 1;
    });
  });
  
  // Calculate scans by month
  history.forEach(h => {
    const month = new Date(h.startTime).toISOString().slice(0, 7); // YYYY-MM
    stats.scansByMonth[month] = (stats.scansByMonth[month] || 0) + 1;
  });
  
  return stats;
}