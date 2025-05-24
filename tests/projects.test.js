import { strict as assert } from 'assert';
import { 
  addProject, removeProject, getProjects, getProject, updateProject,
  addScanToHistory, getProjectHistory, getAllHistory, clearProjectHistory, getProjectStats
} from '../lib/config.js';

// Test data
const testProject = {
  name: 'Test Project',
  domain: 'example.com',
  description: 'A test project for unit testing'
};

const testScan = {
  id: 'test-scan-123',
  target: 'https://example.com',
  tools: ['nikto', 'nuclei'],
  status: 'completed',
  startTime: new Date().toISOString(),
  endTime: new Date().toISOString(),
  duration: 120,
  vulnerabilities: [
    { severity: 'high', title: 'Test Vulnerability 1' },
    { severity: 'medium', title: 'Test Vulnerability 2' },
    { severity: 'low', title: 'Test Vulnerability 3' }
  ],
  summary: {
    total: 3,
    critical: 0,
    high: 1,
    medium: 1,
    low: 1,
    info: 0
  },
  outputDir: '/tmp/test-scan'
};

function runProjectTests() {
  console.log('🧪 Running Project Management Tests...');
  
  // Clean up any existing test data
  try {
    clearProjectHistory();
    const projects = getProjects();
    projects.forEach(p => {
      if (p.name.includes('Test')) {
        removeProject(p.id);
      }
    });
  } catch (e) {
    // Ignore cleanup errors
  }

  let testsPassed = 0;
  let testsTotal = 0;

  function test(name, fn) {
    testsTotal++;
    try {
      fn();
      console.log(`  ✅ ${name}`);
      testsPassed++;
    } catch (error) {
      console.log(`  ❌ ${name}: ${error.message}`);
    }
  }

  // Test project creation
  test('Add project', () => {
    const project = addProject(testProject);
    assert(project.id, 'Project should have an ID');
    assert.equal(project.name, testProject.name);
    assert.equal(project.domain, testProject.domain);
    assert.equal(project.description, testProject.description);
    assert.equal(project.scanCount, 0);
    assert(project.createdAt, 'Project should have createdAt timestamp');
  });

  // Test project retrieval
  test('Get project by name', () => {
    const project = getProject(testProject.name);
    assert(project, 'Project should be found');
    assert.equal(project.name, testProject.name);
  });

  // Test project listing
  test('List projects', () => {
    const projects = getProjects();
    assert(projects.length > 0, 'Should have at least one project');
    const testProj = projects.find(p => p.name === testProject.name);
    assert(testProj, 'Test project should be in the list');
  });

  // Test project update
  test('Update project', () => {
    const project = getProject(testProject.name);
    const originalUpdatedAt = project.updatedAt;
    
    // Add a small delay to ensure timestamp difference
    const updatedProject = updateProject(project.id, {
      description: 'Updated description'
    });
    assert.equal(updatedProject.description, 'Updated description');
    assert(new Date(updatedProject.updatedAt) >= new Date(originalUpdatedAt));
  });

  // Test adding scan to project history
  test('Add scan to project history', () => {
    const project = getProject(testProject.name);
    const historyEntry = addScanToHistory(project.id, testScan);
    
    assert(historyEntry.id, 'History entry should have an ID');
    assert.equal(historyEntry.projectId, project.id);
    assert.equal(historyEntry.scanId, testScan.id);
    assert.equal(historyEntry.target, testScan.target);
    assert.deepEqual(historyEntry.tools, testScan.tools);
    assert.equal(historyEntry.summary.total, 3);
  });

  // Test project scan count update
  test('Project scan count updated', () => {
    const project = getProject(testProject.name);
    assert.equal(project.scanCount, 1, 'Project should have 1 scan');
    assert(project.lastScanAt, 'Project should have lastScanAt timestamp');
  });

  // Test project history retrieval
  test('Get project history', () => {
    const project = getProject(testProject.name);
    const history = getProjectHistory(project.id);
    
    assert.equal(history.length, 1, 'Should have 1 history entry');
    assert.equal(history[0].scanId, testScan.id);
  });

  // Test global history
  test('Get all history', () => {
    const allHistory = getAllHistory();
    assert(allHistory.length >= 1, 'Should have at least 1 history entry');
    const testEntry = allHistory.find(h => h.scanId === testScan.id);
    assert(testEntry, 'Test scan should be in global history');
  });

  // Test project statistics
  test('Get project statistics', () => {
    const project = getProject(testProject.name);
    const stats = getProjectStats(project.id);
    
    assert.equal(stats.totalScans, 1);
    assert.equal(stats.completedScans, 1);
    assert.equal(stats.failedScans, 0);
    assert.equal(stats.totalVulnerabilities, 3);
    assert.equal(stats.severityBreakdown.high, 1);
    assert.equal(stats.severityBreakdown.medium, 1);
    assert.equal(stats.severityBreakdown.low, 1);
    assert.equal(stats.toolUsage.nikto, 1);
    assert.equal(stats.toolUsage.nuclei, 1);
  });

  // Test global statistics
  test('Get global statistics', () => {
    const stats = getProjectStats();
    assert(stats.totalScans >= 1);
    assert(stats.totalVulnerabilities >= 3);
  });

  // Test duplicate project name prevention
  test('Prevent duplicate project names', () => {
    try {
      addProject(testProject);
      assert.fail('Should not allow duplicate project names');
    } catch (error) {
      assert(error.message.includes('already exists'));
    }
  });

  // Test project with URL instead of domain
  test('Add project with URL', () => {
    const urlProject = {
      name: 'URL Test Project',
      url: 'https://api.example.com',
      description: 'Project with URL'
    };
    
    const project = addProject(urlProject);
    assert.equal(project.url, urlProject.url);
    assert.equal(project.domain, null);
  });

  // Test project validation
  test('Project validation - missing name', () => {
    try {
      addProject({ domain: 'test.com' });
      assert.fail('Should require project name');
    } catch (error) {
      assert(error.message.includes('name is required'));
    }
  });

  test('Project validation - missing domain and URL', () => {
    try {
      addProject({ name: 'Invalid Project' });
      assert.fail('Should require domain or URL');
    } catch (error) {
      assert(error.message.includes('Either domain or URL is required'));
    }
  });

  // Test clear project history
  test('Clear project history', () => {
    const project = getProject(testProject.name);
    clearProjectHistory(project.id);
    
    const history = getProjectHistory(project.id);
    assert.equal(history.length, 0, 'Project history should be empty');
    
    const updatedProject = getProject(testProject.name);
    assert.equal(updatedProject.scanCount, 0, 'Scan count should be reset');
    assert.equal(updatedProject.lastScanAt, null, 'Last scan time should be reset');
  });

  // Test project removal
  test('Remove project', () => {
    const project = getProject(testProject.name);
    const removed = removeProject(project.id);
    assert(removed, 'Project should be removed');
    
    const notFound = getProject(testProject.name);
    assert.equal(notFound, null, 'Project should not be found after removal');
  });

  // Clean up URL test project
  test('Clean up test data', () => {
    const urlProject = getProject('URL Test Project');
    if (urlProject) {
      removeProject(urlProject.id);
    }
    
    // Verify cleanup
    const projects = getProjects();
    const testProjects = projects.filter(p => p.name.includes('Test'));
    assert.equal(testProjects.length, 0, 'All test projects should be removed');
  });

  console.log(`\n📊 Project Tests Summary: ${testsPassed}/${testsTotal} passed`);
  return testsPassed === testsTotal;
}

export { runProjectTests };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const success = runProjectTests();
  process.exit(success ? 0 : 1);
}