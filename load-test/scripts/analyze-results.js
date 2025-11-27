const fs = require('fs');
const path = require('path');
const { table } = require('table');
const chalk = require('chalk');

// Configuration
const RESULTS_DIR = path.join(__dirname, '../results');

// ANSI colors
const colors = {
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.blue,
  highlight: chalk.cyan.bold,
  section: chalk.underline.bold,
};

// Load test results
function loadTestResults() {
  const files = fs
    .readdirSync(RESULTS_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      try {
        const content = fs.readFileSync(path.join(RESULTS_DIR, file), 'utf8');
        return JSON.parse(content);
      } catch (e) {
        console.error(`Error reading ${file}:`, e.message);
        return null;
      }
    })
    .filter(Boolean);

  return files;
}

// Analyze performance metrics
function analyzePerformance(results) {
  console.log(colors.section('\n📊 Performance Metrics'));

  const metrics = {
    totalRequests: 0,
    failedRequests: 0,
    totalDuration: 0,
    responseTimes: [],
    statusCodes: {},
  };

  results.forEach((run) => {
    metrics.totalRequests += run.metrics.http_reqs?.count || 0;
    metrics.failedRequests += run.metrics.http_req_failed?.count || 0;
    metrics.totalDuration += run.metrics.duration?.values.avg || 0;

    if (run.metrics.http_req_duration) {
      metrics.responseTimes.push({
        avg: run.metrics.http_req_duration.values.avg * 1000, // convert to ms
        p95: run.metrics.http_req_duration.values.p95 * 1000,
        p99: run.metrics.http_req_duration.values.p99 * 1000,
      });
    }

    // Count status codes
    if (run.metrics.http_req_duration) {
      run.metrics.http_req_duration.values.status_codes.forEach(([code, count]) => {
        metrics.statusCodes[code] = (metrics.statusCodes[code] || 0) + count;
      });
    }
  });

  // Calculate averages
  const avgResponseTime =
    metrics.responseTimes.reduce((sum, rt) => sum + rt.avg, 0) /
    Math.max(1, metrics.responseTimes.length);
  const errorRate = (metrics.failedRequests / Math.max(1, metrics.totalRequests)) * 100;
  const reqPerSec = metrics.totalRequests / (metrics.totalDuration || 1);

  // Display results
  const performanceData = [
    [colors.highlight('Metric'), colors.highlight('Value'), colors.highlight('Status')],
    [
      'Request Rate',
      `${reqPerSec.toFixed(2)} req/s`,
      reqPerSec > 100
        ? colors.success('✓ Good')
        : reqPerSec > 50
          ? colors.warning('⚠️ Acceptable')
          : colors.error('❌ Needs Improvement'),
    ],
    [
      'Error Rate',
      `${errorRate.toFixed(2)}%`,
      errorRate < 1
        ? colors.success('✓ Good')
        : errorRate < 5
          ? colors.warning('⚠️ Monitor')
          : colors.error('❌ Critical'),
    ],
    [
      'Avg Response Time',
      `${avgResponseTime.toFixed(2)}ms`,
      avgResponseTime < 500
        ? colors.success('✓ Good')
        : avgResponseTime < 1000
          ? colors.warning('⚠️ Monitor')
          : colors.error('❌ Critical'),
    ],
  ];

  console.log(table(performanceData));

  // Show status code distribution
  console.log('\nStatus Code Distribution:');
  const statusData = [
    [colors.highlight('Status Code'), colors.highlight('Count'), colors.highlight('Percentage')],
  ];

  Object.entries(metrics.statusCodes).forEach(([code, count]) => {
    const percentage = (count / metrics.totalRequests) * 100;
    statusData.push([code, count.toString(), `${percentage.toFixed(2)}%`]);
  });

  console.log(table(statusData));
}

// Analyze errors
function analyzeErrors(results) {
  console.log(colors.section('\n❌ Error Analysis'));

  const errors = {};

  results.forEach((run) => {
    if (run.metrics.http_req_failed && run.metrics.http_req_failed.values) {
      Object.entries(run.metrics.http_req_failed.values).forEach(([error, count]) => {
        errors[error] = (errors[error] || 0) + count;
      });
    }
  });

  if (Object.keys(errors).length === 0) {
    console.log(colors.success('No errors found in test results.'));
    return;
  }

  const errorData = [
    [colors.highlight('Error Type'), colors.highlight('Count'), colors.highlight('Severity')],
  ];

  Object.entries(errors).forEach(([error, count]) => {
    const isCritical = error.includes('ECONNREFUSED') || error.includes('ETIMEDOUT');
    errorData.push([
      error,
      count.toString(),
      isCritical ? colors.error('❌ Critical') : colors.warning('⚠️ Warning'),
    ]);
  });

  console.log(table(errorData));
}

// Main function
function main() {
  console.log(colors.section('🔍 SafeSoundArena Test Results Analysis'));

  try {
    const results = loadTestResults();
    if (results.length === 0) {
      console.log(colors.warning('No test results found. Run tests first.'));
      return;
    }

    analyzePerformance(results);
    analyzeErrors(results);

    console.log(`\n${colors.success('Analysis complete!')}`);
  } catch (error) {
    console.error(colors.error('Error during analysis:'), error.message);
    process.exit(1);
  }
}

// Run the analysis
main();
