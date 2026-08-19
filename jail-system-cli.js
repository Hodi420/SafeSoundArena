#!/usr/bin/env node

/**
 * Jail System Quick Reference
 * SafeSoundArena - Jail Time Testing & Monitoring
 * 
 * Use this script to quickly access all jail system tools
 */

const fs = require('fs');
const path = require('path');

const COMMANDS = {
  '1': {
    name: 'Run Test Suite (Standalone)',
    cmd: 'node test/jail-system-standalone.js',
    description: 'No dependencies - tests complete 81-minute cycle'
  },
  '2': {
    name: 'Run Test Suite (Mocha)',
    cmd: 'npm test -- test/jail-system.test.js',
    description: 'Full integration test suite with mocha'
  },
  '3': {
    name: 'View Test Guide',
    cmd: 'cat JAIL_SYSTEM_TEST_GUIDE.md',
    description: 'Complete documentation for testing & monitoring'
  },
  '4': {
    name: 'Watch Server Logs',
    cmd: 'docker logs safesoundarena-api-server-1 --follow | grep -i jail',
    description: 'Real-time jail events from API server'
  },
  '5': {
    name: 'Open Monitor Dashboard',
    cmd: 'echo "Open http://localhost:3000/jail-test-monitor in your browser"',
    description: 'Real-time monitoring UI for jail cycles'
  },
  '6': {
    name: 'Check Container Status',
    cmd: 'docker ps --filter "label=com.docker.compose.project=safesoundarena"',
    description: 'View running containers'
  },
  '7': {
    name: 'View Container Health',
    cmd: 'docker ps --filter "label=com.docker.compose.project=safesoundarena" --format "table {{.Names}}\\t{{.Status}}"',
    description: 'Check health of all services'
  }
};

console.log('\n' + '='.repeat(70));
console.log('🔧 JAIL SYSTEM TEST & MONITORING QUICK REFERENCE');
console.log('='.repeat(70));

console.log('\n📋 AVAILABLE COMMANDS:\n');

Object.keys(COMMANDS).forEach(key => {
  const cmd = COMMANDS[key];
  console.log(`  ${key}. ${cmd.name}`);
  console.log(`     → ${cmd.description}`);
  console.log(`     Command: ${cmd.cmd}\n`);
});

console.log('='.repeat(70));
console.log('\n⏱️  JAIL CYCLE TIMELINE:\n');
console.log('  T+0min     → Cycle starts');
console.log('  T+69min    → ⚠️  Warning: "Jail starting soon in 60 seconds"');
console.log('  T+70min    → 🚨 Jail starts (users can join)');
console.log('  T+80min    → ✓ Jail ends');
console.log('  T+81min    → 💰 Rewards sent to participants');
console.log('  T+82min... → Next cycle (repeat)');
console.log('\n  Total cycle duration: 81 minutes\n');

console.log('='.repeat(70));
console.log('\n📊 FILES CREATED:\n');
console.log('  • test/jail-system-standalone.js');
console.log('    → Standalone test suite (no dependencies)');
console.log('  • test/jail-system.test.js');
console.log('    → Full mocha test suite');
console.log('  • frontend/src/pages/jail-test-monitor.tsx');
console.log('    → Real-time monitoring dashboard');
console.log('  • JAIL_SYSTEM_TEST_GUIDE.md');
console.log('    → Complete documentation\n');

console.log('='.repeat(70));
console.log('\n🚀 QUICK START:\n');
console.log('  1. Run tests:       node test/jail-system-standalone.js');
console.log('  2. Start dev:       npm run dev');
console.log('  3. Open monitor:    http://localhost:3000/jail-test-monitor');
console.log('  4. Watch logs:      docker logs safesoundarena-api-server-1 --follow\n');

console.log('='.repeat(70));
console.log('\n✅ System Status:\n');

try {
  const containerCheck = require('child_process').execSync(
    'docker ps --filter "label=com.docker.compose.project=safesoundarena" --format "{{.Names}}"'
  ).toString().trim().split('\n');
  
  console.log(`  Containers running: ${containerCheck.length}`);
  containerCheck.forEach(c => console.log(`    • ${c}`));
} catch (e) {
  console.log('  ✗ Docker not available or containers not running');
}

console.log('\n' + '='.repeat(70) + '\n');

module.exports = COMMANDS;
