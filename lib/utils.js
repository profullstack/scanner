import { URL } from 'url';

/**
 * Validate a target URL or IP address
 * @param {string} target - Target to validate
 * @returns {Object} Validation result with valid boolean and error message
 */
export function validateTarget(target) {
  if (!target || typeof target !== 'string') {
    return {
      valid: false,
      error: 'Target must be a non-empty string'
    };
  }

  target = target.trim();

  // Check if it's an IP address
  if (isValidIP(target)) {
    return {
      valid: true,
      type: 'ip',
      target: target
    };
  }

  // Check if it's a URL
  if (isValidUrl(target)) {
    return {
      valid: true,
      type: 'url',
      target: target
    };
  }

  // If it already has a protocol but isn't HTTP/HTTPS, reject it
  if (target.includes('://') && !target.startsWith('http://') && !target.startsWith('https://')) {
    return {
      valid: false,
      error: 'Only HTTP and HTTPS protocols are supported'
    };
  }

  // Try to add protocol and validate
  const withProtocol = target.startsWith('http') ? target : `http://${target}`;
  if (isValidUrl(withProtocol)) {
    return {
      valid: true,
      type: 'url',
      target: withProtocol
    };
  }

  // Check if it looks like a domain name (has at least one dot and valid format)
  if (target.includes('.') && !target.includes(' ') && target.length > 3) {
    // Basic domain validation - should have valid characters and structure
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (domainRegex.test(target)) {
      const withHttp = `http://${target}`;
      if (isValidUrl(withHttp)) {
        return {
          valid: true,
          type: 'url',
          target: withHttp
        };
      }
    }
  }

  return {
    valid: false,
    error: 'Target must be a valid URL or IP address'
  };
}

/**
 * Check if a string is a valid URL
 * @param {string} urlString - URL string to validate
 * @returns {boolean} True if valid URL
 */
export function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a string is a valid IP address (IPv4 or IPv6)
 * @param {string} ip - IP address string to validate
 * @returns {boolean} True if valid IP address
 */
export function isValidIP(ip) {
  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 regex (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Parse a URL and extract components
 * @param {string} urlString - URL string to parse
 * @returns {Object} Parsed URL components
 */
export function parseUrl(urlString) {
  try {
    const url = new URL(urlString);
    return {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? '443' : '80'),
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      origin: url.origin,
      href: url.href
    };
  } catch (error) {
    return null;
  }
}

/**
 * Sanitize a string for use in file names
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeFilename(str) {
  return str
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}

/**
 * Format duration in seconds to human readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  let result = `${hours}h`;
  if (remainingMinutes > 0) {
    result += ` ${remainingMinutes}m`;
  }
  if (remainingSeconds > 0) {
    result += ` ${remainingSeconds}s`;
  }
  
  return result;
}

/**
 * Format file size in bytes to human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
export function formatFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)}${units[unitIndex]}`;
}

/**
 * Get severity color for console output
 * @param {string} severity - Severity level
 * @returns {string} ANSI color code
 */
export function getSeverityColor(severity) {
  const colors = {
    critical: '\x1b[41m\x1b[37m', // Red background, white text
    high: '\x1b[31m',             // Red text
    medium: '\x1b[33m',           // Yellow text
    low: '\x1b[36m',              // Cyan text
    info: '\x1b[37m',             // White text
    reset: '\x1b[0m'              // Reset
  };
  
  return colors[severity?.toLowerCase()] || colors.info;
}

/**
 * Get severity emoji
 * @param {string} severity - Severity level
 * @returns {string} Emoji representing severity
 */
export function getSeverityEmoji(severity) {
  const emojis = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🔵',
    info: '⚪'
  };
  
  return emojis[severity?.toLowerCase()] || emojis.info;
}

/**
 * Create a progress bar string
 * @param {number} current - Current progress
 * @param {number} total - Total items
 * @param {number} width - Width of progress bar
 * @returns {string} Progress bar string
 */
export function createProgressBar(current, total, width = 20) {
  const percentage = Math.min(current / total, 1);
  const filled = Math.floor(percentage * width);
  const empty = width - filled;
  
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percent = Math.floor(percentage * 100);
  
  return `[${bar}] ${percent}% (${current}/${total})`;
}

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
export function deepMerge(target, source) {
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
 * Generate a unique scan ID
 * @returns {string} Unique scan ID
 */
export function generateScanId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `scan-${timestamp}-${random}`;
}

/**
 * Check if a port is commonly used for web services
 * @param {number|string} port - Port number
 * @returns {boolean} True if it's a common web port
 */
export function isWebPort(port) {
  const webPorts = [80, 443, 8080, 8443, 3000, 5000, 8000, 8888, 9000];
  return webPorts.includes(parseInt(port));
}

/**
 * Extract domain from URL or hostname
 * @param {string} input - URL or hostname
 * @returns {string} Domain name
 */
export function extractDomain(input) {
  try {
    if (input.includes('://')) {
      const url = new URL(input);
      return url.hostname;
    } else {
      // Assume it's already a hostname
      return input.split(':')[0]; // Remove port if present
    }
  } catch (error) {
    return input;
  }
}

/**
 * Check if running with sufficient privileges for certain scans
 * @returns {boolean} True if running as root/admin
 */
export function hasElevatedPrivileges() {
  return process.getuid && process.getuid() === 0;
}

/**
 * Escape shell arguments to prevent injection
 * @param {string} arg - Argument to escape
 * @returns {string} Escaped argument
 */
export function escapeShellArg(arg) {
  return `'${arg.replace(/'/g, "'\"'\"'")}'`;
}

/**
 * Parse command line style arguments from a string
 * @param {string} str - String containing arguments
 * @returns {Array} Array of parsed arguments
 */
export function parseArgs(str) {
  const args = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = '';
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        args.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  
  if (current) {
    args.push(current);
  }
  
  return args;
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Promise that resolves with function result
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}