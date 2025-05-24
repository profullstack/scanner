#!/usr/bin/env node

import { Command } from 'commander';
import prompts from 'prompts';
import chalk from 'chalk';
import ora from 'ora';
import { scanTarget, getScanHistory, getAllScans, getScanStats, getScanById, deleteScan, clearScanHistory } from '../lib/scanner.js';
import { checkToolAvailability, getInstallationInstructions } from '../lib/tools.js';
import { generateReport, exportReport, getReportFormats } from '../lib/reports.js';
import { validateTarget, formatDuration, getSeverityEmoji, getSeverityColor } from '../lib/utils.js';
import { 
  getConfig, updateConfig, resetConfig, getEnabledTools, setToolEnabled,
  getScanProfiles, applyScanProfile, getConfigFilePath, exportConfig, importConfig
} from '../lib/config.js';

const program = new Command();

// Helper function to create spinner
function createSpinner(text) {
  return ora({
    text,
    spinner: 'dots',
    color: 'cyan'
  });
}

// Helper function to display vulnerability summary
function displayVulnerabilitySummary(summary) {
  console.log('\n📊 Vulnerability Summary:');
  console.log(`${getSeverityEmoji('critical')} Critical: ${chalk.red(summary.critical)}`);
  console.log(`${getSeverityEmoji('high')} High: ${chalk.redBright(summary.high)}`);
  console.log(`${getSeverityEmoji('medium')} Medium: ${chalk.yellow(summary.medium)}`);
  console.log(`${getSeverityEmoji('low')} Low: ${chalk.cyan(summary.low)}`);
  console.log(`${getSeverityEmoji('info')} Info: ${chalk.gray(summary.info)}`);
  console.log(`📈 Total: ${chalk.bold(summary.total)}`);
}

// Main scan command
program
  .command('scan <target>')
  .description('Scan a target URL or IP address for security vulnerabilities')
  .option('-t, --tools <tools>', 'Comma-separated list of tools to use (nikto,zap,wapiti,nuclei,sqlmap)', '')
  .option('-o, --output <dir>', 'Output directory for scan results')
  .option('-f, --format <format>', 'Report format (json,html,csv,xml,markdown,text)', 'json')
  .option('-p, --profile <profile>', 'Use predefined scan profile (quick,standard,comprehensive,owasp)')
  .option('--timeout <seconds>', 'Timeout for each tool in seconds', '300')
  .option('--verbose', 'Enable verbose output')
  .option('--no-report', 'Skip report generation')
  .option('--auth-user <username>', 'Username for HTTP authentication')
  .option('--auth-pass <password>', 'Password for HTTP authentication')
  .option('--auth-type <type>', 'Authentication type (basic,digest,form)', 'basic')
  .option('--login-url <url>', 'Login URL for form-based authentication')
  .option('--login-data <data>', 'Login form data (e.g., "username=admin&password=secret")')
  .option('--session-cookie <cookie>', 'Session cookie for authenticated scanning')
  .option('--headers <headers>', 'Custom HTTP headers (JSON format)')
  .action(async (target, options) => {
    try {
      // Validate target
      const validation = validateTarget(target);
      if (!validation.valid) {
        console.error(chalk.red(`❌ ${validation.error}`));
        process.exit(1);
      }

      console.log(chalk.blue('🛡️  Security Scanner'));
      console.log(chalk.gray(`Target: ${target}`));

      // Determine tools to use
      let tools = [];
      let toolOptions = {};

      if (options.profile) {
        try {
          const profileConfig = applyScanProfile(options.profile);
          tools = profileConfig.tools;
          toolOptions = profileConfig.toolOptions;
          console.log(chalk.cyan(`📋 Using profile: ${options.profile}`));
        } catch (error) {
          console.error(chalk.red(`❌ ${error.message}`));
          const profiles = Object.keys(getScanProfiles());
          console.log(chalk.yellow(`Available profiles: ${profiles.join(', ')}`));
          process.exit(1);
        }
      } else if (options.tools) {
        tools = options.tools.split(',').map(t => t.trim());
      } else {
        tools = getEnabledTools();
      }

      if (tools.length === 0) {
        console.error(chalk.red('❌ No tools specified or enabled'));
        console.log(chalk.yellow('💡 Use --tools to specify tools or --profile to use a predefined profile'));
        process.exit(1);
      }

      // Check tool availability
      const spinner = createSpinner('Checking tool availability...');
      spinner.start();

      const availability = await checkToolAvailability(tools);
      const availableTools = tools.filter(tool => availability[tool]);
      const missingTools = tools.filter(tool => !availability[tool]);

      spinner.stop();

      if (missingTools.length > 0) {
        console.log(chalk.yellow(`⚠️  Missing tools: ${missingTools.join(', ')}`));
        
        const instructions = getInstallationInstructions(missingTools);
        console.log(chalk.cyan('\n💡 Installation instructions:'));
        
        Object.entries(instructions).forEach(([tool, info]) => {
          console.log(chalk.white(`\n${tool.toUpperCase()}:`));
          console.log(chalk.gray(`  Description: ${info.description}`));
          console.log(chalk.gray(`  Ubuntu/Debian: ${info.ubuntu || 'N/A'}`));
          console.log(chalk.gray(`  CentOS/RHEL: ${info.centos || 'N/A'}`));
          console.log(chalk.gray(`  macOS: ${info.macos || 'N/A'}`));
          if (info.note) {
            console.log(chalk.yellow(`  Note: ${info.note}`));
          }
        });

        if (availableTools.length === 0) {
          console.error(chalk.red('\n❌ No tools are available. Please install at least one security tool.'));
          process.exit(1);
        }

        const { proceed } = await prompts({
          type: 'confirm',
          name: 'proceed',
          message: `Continue with available tools (${availableTools.join(', ')})?`,
          initial: true
        });

        if (!proceed) {
          console.log(chalk.yellow('Scan cancelled.'));
          process.exit(0);
        }
      }

      console.log(chalk.green(`✅ Using tools: ${availableTools.join(', ')}`));

      // Prepare authentication options
      const authOptions = {};
      if (options.authUser && options.authPass) {
        authOptions.type = options.authType || 'basic';
        authOptions.username = options.authUser;
        authOptions.password = options.authPass;
        
        if (options.authType === 'form') {
          authOptions.loginUrl = options.loginUrl;
          authOptions.loginData = options.loginData;
        }
        
        console.log(chalk.cyan(`🔐 Using ${authOptions.type} authentication for user: ${authOptions.username}`));
      }
      
      if (options.sessionCookie) {
        authOptions.sessionCookie = options.sessionCookie;
        console.log(chalk.cyan('🍪 Using session cookie for authentication'));
      }
      
      // Parse custom headers
      let customHeaders = {};
      if (options.headers) {
        try {
          customHeaders = JSON.parse(options.headers);
          console.log(chalk.cyan(`📋 Using custom headers: ${Object.keys(customHeaders).join(', ')}`));
        } catch (error) {
          console.error(chalk.red(`❌ Invalid headers JSON: ${error.message}`));
          process.exit(1);
        }
      }

      // Prepare scan options
      const scanOptions = {
        tools: availableTools,
        outputDir: options.output,
        timeout: parseInt(options.timeout),
        verbose: options.verbose,
        toolOptions: toolOptions,
        auth: Object.keys(authOptions).length > 0 ? authOptions : null,
        headers: customHeaders
      };

      // Start scan
      const scanSpinner = createSpinner(`Scanning ${target}...`);
      scanSpinner.start();

      const startTime = Date.now();
      const result = await scanTarget(target, scanOptions);
      const duration = Math.round((Date.now() - startTime) / 1000);

      scanSpinner.succeed(chalk.green(`Scan completed in ${formatDuration(duration)}`));

      // Display results
      displayVulnerabilitySummary(result.summary);

      if (result.vulnerabilities.length > 0) {
        console.log(chalk.red(`\n🚨 Found ${result.vulnerabilities.length} vulnerabilities:`));
        
        result.vulnerabilities.slice(0, 5).forEach((vuln, index) => {
          const emoji = getSeverityEmoji(vuln.severity);
          const color = vuln.severity === 'critical' ? 'red' : 
                       vuln.severity === 'high' ? 'redBright' :
                       vuln.severity === 'medium' ? 'yellow' :
                       vuln.severity === 'low' ? 'cyan' : 'gray';
          
          console.log(`${emoji} ${chalk[color](vuln.title || 'Unknown')} (${vuln.source})`);
          if (vuln.url) {
            console.log(chalk.gray(`   URL: ${vuln.url}`));
          }
        });

        if (result.vulnerabilities.length > 5) {
          console.log(chalk.gray(`   ... and ${result.vulnerabilities.length - 5} more`));
        }
      } else {
        console.log(chalk.green('\n✅ No vulnerabilities found!'));
      }

      // Generate report
      if (!options.noReport) {
        const reportSpinner = createSpinner('Generating report...');
        reportSpinner.start();

        try {
          const reportPath = `${result.outputDir}/report.${options.format}`;
          await exportReport(result, reportPath, { format: options.format });
          reportSpinner.succeed(chalk.green(`Report saved: ${reportPath}`));
        } catch (error) {
          reportSpinner.fail(chalk.red(`Report generation failed: ${error.message}`));
        }
      }

      console.log(chalk.cyan(`\n📁 Results saved to: ${result.outputDir}`));
      console.log(chalk.gray(`Scan ID: ${result.id}`));

    } catch (error) {
      console.error(chalk.red(`❌ Scan failed: ${error.message}`));
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// List scan history
program
  .command('history')
  .description('Show scan history')
  .option('-l, --limit <number>', 'Number of scans to show', '10')
  .option('--all', 'Show all scans')
  .action(async (options) => {
    try {
      const scans = options.all ? getAllScans() : getScanHistory(parseInt(options.limit));
      
      if (scans.length === 0) {
        console.log(chalk.yellow('No scan history found.'));
        return;
      }

      console.log(chalk.blue('📋 Scan History\n'));

      scans.forEach((scan, index) => {
        const status = scan.status === 'completed' ? chalk.green('✅') : 
                      scan.status === 'failed' ? chalk.red('❌') : 
                      chalk.yellow('⏳');
        
        console.log(`${status} ${chalk.bold(scan.target)}`);
        console.log(chalk.gray(`   ID: ${scan.id}`));
        console.log(chalk.gray(`   Date: ${new Date(scan.startTime).toLocaleString()}`));
        console.log(chalk.gray(`   Duration: ${formatDuration(scan.duration || 0)}`));
        console.log(chalk.gray(`   Tools: ${scan.tools.join(', ')}`));
        console.log(chalk.gray(`   Vulnerabilities: ${scan.summary?.total || 0}`));
        
        if (index < scans.length - 1) {
          console.log();
        }
      });

    } catch (error) {
      console.error(chalk.red(`❌ Error loading history: ${error.message}`));
      process.exit(1);
    }
  });

// Show scan statistics
program
  .command('stats')
  .description('Show scan statistics')
  .action(async () => {
    try {
      const stats = getScanStats();
      
      console.log(chalk.blue('📊 Scan Statistics\n'));
      
      console.log(chalk.bold('Overview:'));
      console.log(`Total Scans: ${chalk.cyan(stats.totalScans)}`);
      console.log(`Completed: ${chalk.green(stats.completedScans)}`);
      console.log(`Failed: ${chalk.red(stats.failedScans)}`);
      console.log(`Average Duration: ${chalk.yellow(formatDuration(stats.averageScanTime))}`);
      
      console.log(chalk.bold('\nVulnerabilities:'));
      console.log(`Total Found: ${chalk.cyan(stats.totalVulnerabilities)}`);
      displayVulnerabilitySummary(stats.severityBreakdown);
      
      if (stats.mostScannedTargets.length > 0) {
        console.log(chalk.bold('\nMost Scanned Targets:'));
        stats.mostScannedTargets.slice(0, 5).forEach(({ target, count }) => {
          console.log(`${chalk.cyan(target)}: ${count} scans`);
        });
      }
      
      if (Object.keys(stats.toolUsage).length > 0) {
        console.log(chalk.bold('\nTool Usage:'));
        Object.entries(stats.toolUsage)
          .sort(([,a], [,b]) => b - a)
          .forEach(([tool, count]) => {
            console.log(`${chalk.cyan(tool)}: ${count} times`);
          });
      }

    } catch (error) {
      console.error(chalk.red(`❌ Error loading statistics: ${error.message}`));
      process.exit(1);
    }
  });

// Show scan details
program
  .command('show <scanId>')
  .description('Show detailed scan results')
  .option('-f, --format <format>', 'Output format (json,text)', 'text')
  .action(async (scanId, options) => {
    try {
      const scan = getScanById(scanId);
      
      if (!scan) {
        console.error(chalk.red(`❌ Scan not found: ${scanId}`));
        process.exit(1);
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(scan, null, 2));
        return;
      }

      // Text format
      console.log(chalk.blue('🔍 Scan Details\n'));
      
      console.log(chalk.bold('Basic Information:'));
      console.log(`Target: ${chalk.cyan(scan.target)}`);
      console.log(`Scan ID: ${chalk.gray(scan.id)}`);
      console.log(`Status: ${scan.status === 'completed' ? chalk.green(scan.status) : chalk.red(scan.status)}`);
      console.log(`Start Time: ${chalk.gray(new Date(scan.startTime).toLocaleString())}`);
      console.log(`Duration: ${chalk.yellow(formatDuration(scan.duration || 0))}`);
      console.log(`Tools Used: ${chalk.cyan(scan.tools.join(', '))}`);
      
      displayVulnerabilitySummary(scan.summary);
      
      if (scan.vulnerabilities.length > 0) {
        console.log(chalk.bold('\n🚨 Vulnerabilities:'));
        
        scan.vulnerabilities.forEach((vuln, index) => {
          const emoji = getSeverityEmoji(vuln.severity);
          const color = vuln.severity === 'critical' ? 'red' : 
                       vuln.severity === 'high' ? 'redBright' :
                       vuln.severity === 'medium' ? 'yellow' :
                       vuln.severity === 'low' ? 'cyan' : 'gray';
          
          console.log(`\n${index + 1}. ${emoji} ${chalk[color](vuln.title || 'Unknown Vulnerability')}`);
          console.log(`   Severity: ${chalk[color](vuln.severity?.toUpperCase() || 'UNKNOWN')}`);
          console.log(`   Source: ${chalk.gray(vuln.source || 'Unknown')}`);
          console.log(`   Category: ${chalk.gray(vuln.category || 'N/A')}`);
          
          if (vuln.url) {
            console.log(`   URL: ${chalk.blue(vuln.url)}`);
          }
          
          if (vuln.method) {
            console.log(`   Method: ${chalk.gray(vuln.method)}`);
          }
          
          if (vuln.parameter || vuln.param) {
            console.log(`   Parameter: ${chalk.gray(vuln.parameter || vuln.param)}`);
          }
          
          if (vuln.description) {
            console.log(`   Description: ${chalk.gray(vuln.description)}`);
          }
        });
      }

    } catch (error) {
      console.error(chalk.red(`❌ Error showing scan: ${error.message}`));
      process.exit(1);
    }
  });

// Generate report from existing scan
program
  .command('report <scanId>')
  .description('Generate report from existing scan')
  .option('-f, --format <format>', 'Report format (json,html,csv,xml,markdown,text)', 'html')
  .option('-o, --output <file>', 'Output file path')
  .action(async (scanId, options) => {
    try {
      const scan = getScanById(scanId);
      
      if (!scan) {
        console.error(chalk.red(`❌ Scan not found: ${scanId}`));
        process.exit(1);
      }

      const spinner = createSpinner('Generating report...');
      spinner.start();

      const outputFile = options.output || `report-${scanId}.${options.format}`;
      await exportReport(scan, outputFile, { format: options.format });

      spinner.succeed(chalk.green(`Report generated: ${outputFile}`));

    } catch (error) {
      console.error(chalk.red(`❌ Report generation failed: ${error.message}`));
      process.exit(1);
    }
  });

// Tool management
program
  .command('tools')
  .description('Manage security tools')
  .option('--check', 'Check tool availability')
  .option('--enable <tool>', 'Enable a tool')
  .option('--disable <tool>', 'Disable a tool')
  .option('--list', 'List all tools and their status')
  .action(async (options) => {
    try {
      if (options.check) {
        const spinner = createSpinner('Checking tool availability...');
        spinner.start();

        const tools = ['nikto', 'zap-cli', 'wapiti', 'nuclei', 'sqlmap'];
        const availability = await checkToolAvailability(tools);

        spinner.stop();

        console.log(chalk.blue('🔧 Tool Availability\n'));

        tools.forEach(tool => {
          const status = availability[tool] ? chalk.green('✅ Available') : chalk.red('❌ Not found');
          console.log(`${tool.toUpperCase()}: ${status}`);
        });

        const missingTools = tools.filter(tool => !availability[tool]);
        if (missingTools.length > 0) {
          const instructions = getInstallationInstructions(missingTools);
          console.log(chalk.cyan('\n💡 Installation instructions for missing tools:'));
          
          Object.entries(instructions).forEach(([tool, info]) => {
            console.log(chalk.white(`\n${tool.toUpperCase()}:`));
            console.log(chalk.gray(`  ${info.description}`));
            console.log(chalk.gray(`  Ubuntu: ${info.ubuntu || 'N/A'}`));
            console.log(chalk.gray(`  macOS: ${info.macos || 'N/A'}`));
          });
        }

        return;
      }

      if (options.enable) {
        setToolEnabled(options.enable, true);
        console.log(chalk.green(`✅ Enabled tool: ${options.enable}`));
        return;
      }

      if (options.disable) {
        setToolEnabled(options.disable, false);
        console.log(chalk.yellow(`⚠️  Disabled tool: ${options.disable}`));
        return;
      }

      if (options.list) {
        const config = getConfig();
        console.log(chalk.blue('🔧 Tool Configuration\n'));

        Object.entries(config.tools).forEach(([tool, toolConfig]) => {
          const status = toolConfig.enabled ? chalk.green('✅ Enabled') : chalk.red('❌ Disabled');
          console.log(`${tool.toUpperCase()}: ${status}`);
          console.log(chalk.gray(`  Timeout: ${toolConfig.timeout}s`));
          
          if (tool === 'nuclei' && toolConfig.severity) {
            console.log(chalk.gray(`  Severity: ${toolConfig.severity}`));
          }
          
          if (tool === 'sqlmap' && toolConfig.crawl) {
            console.log(chalk.gray(`  Crawl depth: ${toolConfig.crawl}`));
          }
          
          console.log();
        });

        return;
      }

      // Default: show help
      console.log(chalk.blue('🔧 Tool Management\n'));
      console.log('Available commands:');
      console.log('  --check          Check tool availability');
      console.log('  --list           List all tools and their status');
      console.log('  --enable <tool>  Enable a specific tool');
      console.log('  --disable <tool> Disable a specific tool');

    } catch (error) {
      console.error(chalk.red(`❌ Tool management error: ${error.message}`));
      process.exit(1);
    }
  });

// Configuration management
program
  .command('config')
  .description('Manage scanner configuration')
  .option('--show', 'Show current configuration')
  .option('--reset', 'Reset configuration to defaults')
  .option('--export <file>', 'Export configuration to file')
  .option('--import <file>', 'Import configuration from file')
  .option('--profiles', 'Show available scan profiles')
  .action(async (options) => {
    try {
      if (options.show) {
        const config = getConfig();
        console.log(JSON.stringify(config, null, 2));
        return;
      }

      if (options.reset) {
        const { confirm } = await prompts({
          type: 'confirm',
          name: 'confirm',
          message: 'Reset configuration to defaults?',
          initial: false
        });

        if (confirm) {
          resetConfig();
          console.log(chalk.green('✅ Configuration reset to defaults'));
        } else {
          console.log(chalk.yellow('Reset cancelled'));
        }
        return;
      }

      if (options.export) {
        exportConfig(options.export);
        console.log(chalk.green(`✅ Configuration exported to: ${options.export}`));
        return;
      }

      if (options.import) {
        importConfig(options.import);
        console.log(chalk.green(`✅ Configuration imported from: ${options.import}`));
        return;
      }

      if (options.profiles) {
        const profiles = getScanProfiles();
        console.log(chalk.blue('📋 Available Scan Profiles\n'));

        Object.entries(profiles).forEach(([name, profile]) => {
          console.log(chalk.bold(name.toUpperCase()));
          console.log(chalk.gray(`  ${profile.description}`));
          console.log(chalk.cyan(`  Tools: ${profile.tools.join(', ')}`));
          console.log();
        });
        return;
      }

      // Default: show config file location
      console.log(chalk.blue('⚙️  Configuration\n'));
      console.log(`Config file: ${chalk.cyan(getConfigFilePath())}`);
      console.log('\nAvailable commands:');
      console.log('  --show           Show current configuration');
      console.log('  --reset          Reset to defaults');
      console.log('  --export <file>  Export configuration');
      console.log('  --import <file>  Import configuration');
      console.log('  --profiles       Show scan profiles');

    } catch (error) {
      console.error(chalk.red(`❌ Configuration error: ${error.message}`));
      process.exit(1);
    }
  });

// Clean data
program
  .command('clean')
  .description('Clean scan data and history')
  .option('--history', 'Clear scan history only')
  .option('--all', 'Clear all data including configuration')
  .action(async (options) => {
    try {
      if (options.history) {
        const { confirm } = await prompts({
          type: 'confirm',
          name: 'confirm',
          message: 'Clear all scan history?',
          initial: false
        });

        if (confirm) {
          clearScanHistory();
          console.log(chalk.green('✅ Scan history cleared'));
        } else {
          console.log(chalk.yellow('Clean cancelled'));
        }
        return;
      }

      if (options.all) {
        const { confirm } = await prompts({
          type: 'confirm',
          name: 'confirm',
          message: 'Clear ALL data including configuration? This cannot be undone.',
          initial: false
        });

        if (confirm) {
          clearScanHistory();
          resetConfig();
          console.log(chalk.green('✅ All data cleared'));
        } else {
          console.log(chalk.yellow('Clean cancelled'));
        }
        return;
      }

      // Default: show options
      console.log(chalk.blue('🧹 Clean Data\n'));
      console.log('Available options:');
      console.log('  --history  Clear scan history only');
      console.log('  --all      Clear all data including configuration');

    } catch (error) {
      console.error(chalk.red(`❌ Clean error: ${error.message}`));
      process.exit(1);
    }
  });

// Delete specific scan
program
  .command('delete <scanId>')
  .description('Delete a specific scan from history')
  .action(async (scanId) => {
    try {
      const scan = getScanById(scanId);
      
      if (!scan) {
        console.error(chalk.red(`❌ Scan not found: ${scanId}`));
        process.exit(1);
      }

      const { confirm } = await prompts({
        type: 'confirm',
        name: 'confirm',
        message: `Delete scan of ${scan.target}?`,
        initial: false
      });

      if (confirm) {
        const deleted = deleteScan(scanId);
        if (deleted) {
          console.log(chalk.green('✅ Scan deleted'));
        } else {
          console.error(chalk.red('❌ Failed to delete scan'));
        }
      } else {
        console.log(chalk.yellow('Delete cancelled'));
      }

    } catch (error) {
      console.error(chalk.red(`❌ Delete error: ${error.message}`));
      process.exit(1);
    }
  });

// Set program info
program
  .name('scanner')
  .description('Web application security scanner with OWASP compliance')
  .version('1.0.0');

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}