import { scanTarget, getScanHistory, getAllScans, getScanStats } from './scanner.js';
import { runNikto, runZap, runWapiti, runNuclei, runSqlmap } from './tools.js';
import { generateReport, exportReport, getReportFormats } from './reports.js';
import { validateTarget, parseUrl, isValidUrl } from './utils.js';

export {
  // Core scanning functions
  scanTarget,
  getScanHistory,
  getAllScans,
  getScanStats,
  
  // Individual tool functions
  runNikto,
  runZap,
  runWapiti,
  runNuclei,
  runSqlmap,
  
  // Report generation
  generateReport,
  exportReport,
  getReportFormats,
  
  // Utility functions
  validateTarget,
  parseUrl,
  isValidUrl
};