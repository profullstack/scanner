import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { checkToolAvailability, getInstallationInstructions } from '../lib/tools.js';

describe('Security Tools Management', () => {
  
  test('checkToolAvailability should return object with boolean values', async () => {
    const tools = ['nikto', 'nuclei', 'wapiti'];
    const availability = await checkToolAvailability(tools);
    
    assert.equal(typeof availability, 'object');
    
    tools.forEach(tool => {
      assert.ok(availability.hasOwnProperty(tool));
      assert.equal(typeof availability[tool], 'boolean');
    });
  });

  test('checkToolAvailability should handle empty array', async () => {
    const availability = await checkToolAvailability([]);
    assert.equal(typeof availability, 'object');
    assert.equal(Object.keys(availability).length, 0);
  });

  test('checkToolAvailability should handle unknown tools', async () => {
    const tools = ['unknown-tool-12345'];
    const availability = await checkToolAvailability(tools);
    
    assert.equal(typeof availability, 'object');
    assert.equal(availability['unknown-tool-12345'], false);
  });

  test('getInstallationInstructions should return instructions for tools', () => {
    const tools = ['nikto', 'nuclei'];
    const instructions = getInstallationInstructions(tools);
    
    assert.equal(typeof instructions, 'object');
    
    tools.forEach(tool => {
      assert.ok(instructions.hasOwnProperty(tool));
      assert.equal(typeof instructions[tool], 'object');
      assert.equal(typeof instructions[tool].description, 'string');
    });
  });

  test('getInstallationInstructions should handle empty array', () => {
    const instructions = getInstallationInstructions([]);
    assert.equal(typeof instructions, 'object');
    assert.equal(Object.keys(instructions).length, 0);
  });

  test('getInstallationInstructions should handle unknown tools', () => {
    const tools = ['unknown-tool'];
    const instructions = getInstallationInstructions(tools);
    
    assert.equal(typeof instructions, 'object');
    assert.ok(instructions.hasOwnProperty('unknown-tool'));
    assert.equal(typeof instructions['unknown-tool'].description, 'string');
  });

  test('tool availability check should be consistent', async () => {
    const tools = ['nikto'];
    const availability1 = await checkToolAvailability(tools);
    const availability2 = await checkToolAvailability(tools);
    
    assert.equal(availability1.nikto, availability2.nikto);
  });

  test('installation instructions should have required fields', () => {
    const tools = ['nikto', 'nuclei', 'wapiti'];
    const instructions = getInstallationInstructions(tools);
    
    Object.values(instructions).forEach(instruction => {
      assert.equal(typeof instruction.description, 'string');
      assert.ok(instruction.description.length > 0);
    });
  });

  test('should handle all supported tools', async () => {
    const supportedTools = ['nikto', 'zap-cli', 'wapiti', 'nuclei', 'sqlmap'];
    const availability = await checkToolAvailability(supportedTools);
    
    supportedTools.forEach(tool => {
      assert.ok(availability.hasOwnProperty(tool));
      assert.equal(typeof availability[tool], 'boolean');
    });
  });

  test('installation instructions should include platform-specific commands', () => {
    const tools = ['nikto', 'nuclei'];
    const instructions = getInstallationInstructions(tools);
    
    Object.values(instructions).forEach(instruction => {
      // Should have at least one platform-specific installation command
      const hasPlatformCommand = instruction.ubuntu || instruction.centos || instruction.macos;
      assert.ok(hasPlatformCommand, 'Should have at least one platform installation command');
    });
  });

});