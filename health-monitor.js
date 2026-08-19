#!/usr/bin/env node

/**
 * SafeSoundArena Production Health Monitor
 * Continuously monitors all services and alerts on issues
 * 
 * Usage:
 *   node health-monitor.js --interval 30 --log health.log
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Configuration
const CONFIG = {
  interval: parseInt(process.env.MONITOR_INTERVAL || 30) * 1000, // 30 seconds
  logFile: process.env.LOG_FILE || 'health-monitor.log',
  alertThreshold: parseInt(process.env.ALERT_THRESHOLD || 3), // Alert after 3 failures
  apiUrl: process.env.API_URL || 'http://localhost:4000',
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017',
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

class HealthMonitor {
  constructor() {
    this.failureCount = {
      api: 0,
      ollama: 0,
      mongodb: 0,
      redis: 0,
      docker: 0,
    };

    this.lastStatus = {};
  }

  log(msg, color = 'reset') {
    const timestamp = new Date().toISOString();
    const coloredMsg = `${colors[color]}${msg}${colors.reset}`;
    
    console.log(`${timestamp} ${coloredMsg}`);
    
    // Log to file
    fs.appendFileSync(
      CONFIG.logFile,
      `${timestamp} ${msg}\n`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────

  async checkAPI() {
    try {
      const response = await axios.get(`${CONFIG.apiUrl}/api/health`, {
        timeout: 5000,
      });

      if (response.status === 200) {
        const health = response.data;
        
        this.log(
          `✓ API: Up | Users: ${health.userCount || 0} | Memory: ${
            Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
          }MB | AI: ${health.ai_provider || 'unknown'}`,
          'green'
        );

        this.failureCount.api = 0;
        return { status: 'up', data: health };
      }
    } catch (error) {
      this.failureCount.api++;
      
      const msg =
        this.failureCount.api >= CONFIG.alertThreshold
          ? `⚠️  API DOWN (${this.failureCount.api} attempts)`
          : `✗ API Error: ${error.code || error.message}`;

      this.log(msg, this.failureCount.api >= CONFIG.alertThreshold ? 'red' : 'yellow');

      return { status: 'down', error: error.message };
    }
  }

  async checkOllama() {
    try {
      const response = await axios.get(`${CONFIG.ollamaUrl}/api/tags`, {
        timeout: 5000,
      });

      if (response.status === 200) {
        const models = response.data.models || [];
        const modelList = models.map(m => m.name).join(', ') || 'none';

        this.log(
          `✓ Ollama: Up | Models: ${modelList} | Count: ${models.length}`,
          'green'
        );

        this.failureCount.ollama = 0;
        return { status: 'up', models };
      }
    } catch (error) {
      this.failureCount.ollama++;

      const msg =
        this.failureCount.ollama >= CONFIG.alertThreshold
          ? `⚠️  OLLAMA DOWN (${this.failureCount.ollama} attempts)`
          : `✗ Ollama Error: ${error.code || error.message}`;

      this.log(msg, this.failureCount.ollama >= CONFIG.alertThreshold ? 'red' : 'yellow');

      return { status: 'down', error: error.message };
    }
  }

  async checkDocker() {
    try {
      const { stdout } = await execPromise(
        'docker-compose -f docker-compose.prod.ollama.yml ps --format json'
      );

      const containers = JSON.parse(stdout);
      const running = containers.filter(c => c.State === 'running').length;
      const total = containers.length;

      if (running === total) {
        this.log(`✓ Docker: ${running}/${total} containers running`, 'green');
        this.failureCount.docker = 0;
        return { status: 'up', running, total };
      } else {
        throw new Error(`Only ${running}/${total} containers running`);
      }
    } catch (error) {
      this.failureCount.docker++;

      const msg =
        this.failureCount.docker >= CONFIG.alertThreshold
          ? `⚠️  DOCKER ISSUE (${this.failureCount.docker} attempts)`
          : `✗ Docker Error: ${error.message}`;

      this.log(msg, this.failureCount.docker >= CONFIG.alertThreshold ? 'red' : 'yellow');

      return { status: 'degraded', error: error.message };
    }
  }

  async checkMemory() {
    try {
      const used = process.memoryUsage().heapUsed / 1024 / 1024;
      const max = process.memoryUsage().heapTotal / 1024 / 1024;
      const percent = Math.round((used / max) * 100);

      if (percent < 80) {
        this.log(`✓ Memory: ${Math.round(used)}MB / ${Math.round(max)}MB (${percent}%)`, 'green');
        return { status: 'ok', percent };
      } else if (percent < 90) {
        this.log(`⚠️  Memory: ${Math.round(used)}MB / ${Math.round(max)}MB (${percent}%) - HIGH`, 'yellow');
        return { status: 'warning', percent };
      } else {
        this.log(`⚠️  Memory: ${Math.round(used)}MB / ${Math.round(max)}MB (${percent}%) - CRITICAL`, 'red');
        return { status: 'critical', percent };
      }
    } catch (error) {
      this.log(`✗ Memory check error: ${error.message}`, 'yellow');
      return { status: 'unknown', error: error.message };
    }
  }

  async checkDiskSpace() {
    try {
      const { stdout } = await execPromise('df / --block-size=1G --output=used,avail,pcent');
      const lines = stdout.trim().split('\n');
      const [used, avail, percent] = lines[1].split(/\s+/);

      const percentNum = parseInt(percent);

      if (percentNum < 80) {
        this.log(`✓ Disk: ${used}G used, ${avail}G available (${percent})`, 'green');
        return { status: 'ok', percentNum };
      } else if (percentNum < 90) {
        this.log(`⚠️  Disk: ${used}G used, ${avail}G available (${percent}) - HIGH`, 'yellow');
        return { status: 'warning', percentNum };
      } else {
        this.log(`⚠️  Disk: ${used}G used, ${avail}G available (${percent}) - CRITICAL`, 'red');
        return { status: 'critical', percentNum };
      }
    } catch (error) {
      this.log(`✗ Disk check error: ${error.message}`, 'yellow');
      return { status: 'unknown', error: error.message };
    }
  }

  async checkBackup() {
    try {
      const backupDir = '/backups/safesoundarena';

      if (!fs.existsSync(backupDir)) {
        this.log(`⚠️  Backup directory not found: ${backupDir}`, 'yellow');
        return { status: 'missing' };
      }

      const files = fs.readdirSync(backupDir);
      const latest = files.sort().pop();

      if (!latest) {
        this.log(`⚠️  No backups found in ${backupDir}`, 'yellow');
        return { status: 'missing' };
      }

      const stats = fs.statSync(path.join(backupDir, latest));
      const ageHours = (Date.now() - stats.mtimeMs) / 1000 / 60 / 60;

      if (ageHours < 25) {
        this.log(`✓ Backup: ${latest} (${Math.round(ageHours)}h old)`, 'green');
        return { status: 'ok', file: latest, ageHours };
      } else {
        this.log(`⚠️  Backup: ${latest} (${Math.round(ageHours)}h old) - STALE`, 'yellow');
        return { status: 'stale', file: latest, ageHours };
      }
    } catch (error) {
      this.log(`✗ Backup check error: ${error.message}`, 'yellow');
      return { status: 'error', error: error.message };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  async generateReport() {
    this.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    this.log('🏥 SAFESOUNDARENA HEALTH CHECK', 'cyan');
    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');

    const results = {
      api: await this.checkAPI(),
      ollama: await this.checkOllama(),
      docker: await this.checkDocker(),
      memory: await this.checkMemory(),
      disk: await this.checkDiskSpace(),
      backup: await this.checkBackup(),
    };

    this.log('');

    // Summary
    const allHealthy =
      results.api.status === 'up' &&
      results.ollama.status === 'up' &&
      results.docker.status === 'up' &&
      results.memory.status === 'ok' &&
      results.disk.status === 'ok';

    if (allHealthy) {
      this.log('✅ SYSTEM STATUS: HEALTHY', 'green');
    } else {
      this.log('⚠️  SYSTEM STATUS: ISSUES DETECTED', 'yellow');
    }

    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');

    return results;
  }

  // ─────────────────────────────────────────────────────────────────────────────

  async start() {
    this.log(`\n🚀 Health Monitor Started (interval: ${CONFIG.interval / 1000}s)`, 'cyan');
    this.log(`📊 Log file: ${CONFIG.logFile}`, 'dim');
    this.log(`🔧 API: ${CONFIG.apiUrl}`, 'dim');
    this.log(`🤖 Ollama: ${CONFIG.ollamaUrl}\n`, 'dim');

    // Run immediately
    await this.generateReport();

    // Run periodically
    setInterval(async () => {
      await this.generateReport();
    }, CONFIG.interval);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.log('\n\n👋 Health Monitor Stopped', 'yellow');
      process.exit(0);
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────

const monitor = new HealthMonitor();
monitor.start().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
