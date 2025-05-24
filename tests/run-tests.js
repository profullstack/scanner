#!/usr/bin/env node

import { spawn } from 'child_process';
import { readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

async function runTest(testFile) {
  return new Promise((resolve) => {
    const testPath = join(__dirname, testFile);
    const child = spawn('node', ['--test', testPath], {
      stdio: 'pipe'
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        file: testFile,
        code,
        stdout,
        stderr,
        success: code === 0
      });
    });
  });
}

async function runAllTests() {
  console.log(colorize('🧪 Running Scanner Test Suite\n', 'cyan'));

  const testFiles = readdirSync(__dirname)
    .filter(file => file.endsWith('.test.js'))
    .sort();

  if (testFiles.length === 0) {
    console.log(colorize('No test files found!', 'yellow'));
    return;
  }

  const results = [];
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const testFile of testFiles) {
    console.log(colorize(`Running ${testFile}...`, 'blue'));
    
    const result = await runTest(testFile);
    results.push(result);

    // Parse test results from stdout
    const testMatches = result.stdout.match(/# tests (\d+)/);
    const passMatches = result.stdout.match(/# pass (\d+)/);
    const failMatches = result.stdout.match(/# fail (\d+)/);

    const tests = testMatches ? parseInt(testMatches[1]) : 0;
    const passed = passMatches ? parseInt(passMatches[1]) : 0;
    const failed = failMatches ? parseInt(failMatches[1]) : 0;

    totalTests += tests;
    passedTests += passed;
    failedTests += failed;

    if (result.success) {
      console.log(colorize(`  ✅ ${testFile} - ${passed} passed`, 'green'));
    } else {
      console.log(colorize(`  ❌ ${testFile} - ${failed} failed`, 'red'));
      if (result.stderr) {
        console.log(colorize(`     Error: ${result.stderr.trim()}`, 'red'));
      }
    }
  }

  // Summary
  console.log(colorize('\n📊 Test Summary', 'bright'));
  console.log(colorize('═'.repeat(50), 'cyan'));
  console.log(`Total Tests: ${colorize(totalTests.toString(), 'bright')}`);
  console.log(`Passed: ${colorize(passedTests.toString(), 'green')}`);
  console.log(`Failed: ${colorize(failedTests.toString(), failedTests > 0 ? 'red' : 'green')}`);
  console.log(`Success Rate: ${colorize(`${totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%`, passedTests === totalTests ? 'green' : 'yellow')}`);

  // Detailed failure information
  const failedResults = results.filter(r => !r.success);
  if (failedResults.length > 0) {
    console.log(colorize('\n❌ Failed Tests Details:', 'red'));
    failedResults.forEach(result => {
      console.log(colorize(`\n${result.file}:`, 'red'));
      if (result.stdout) {
        console.log(result.stdout);
      }
      if (result.stderr) {
        console.log(colorize(result.stderr, 'red'));
      }
    });
  }

  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.length > 0) {
  // Run specific test file
  const testFile = args[0];
  if (!testFile.endsWith('.test.js')) {
    console.error(colorize('Test file must end with .test.js', 'red'));
    process.exit(1);
  }
  
  console.log(colorize(`🧪 Running ${testFile}\n`, 'cyan'));
  runTest(testFile).then(result => {
    if (result.success) {
      console.log(colorize('✅ Test passed', 'green'));
      console.log(result.stdout);
    } else {
      console.log(colorize('❌ Test failed', 'red'));
      console.log(result.stdout);
      if (result.stderr) {
        console.error(result.stderr);
      }
      process.exit(1);
    }
  });
} else {
  // Run all tests
  runAllTests();
}