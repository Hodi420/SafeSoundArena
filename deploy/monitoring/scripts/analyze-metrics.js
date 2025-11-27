const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Configuration
const PROMETHEUS_URL = 'http://localhost:9090';
const RANGE = '1d';
const STEP = '1h';

// Colors for console output
const colors = {
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.blue,
  highlight: chalk.cyan.bold,
  section: chalk.underline.bold,
};

// Helper function to run Prometheus queries
async function queryPrometheus(query) {
  try {
    const url = `${PROMETHEUS_URL}/api/v1/query_range?query=${encodeURIComponent(query)}&start=-${RANGE}&step=${STEP}`;
    const result = execSync(`curl -s "${url}"`, { encoding: 'utf-8' });
    return JSON.parse(result);
  } catch (error) {
    console.error(`Error querying Prometheus: ${error.message}`);
    return { data: { result: [] } };
  }
}

// Calculate percentiles from time series data
function calculatePercentiles(series, percentiles = [0.5, 0.9, 0.95, 0.99]) {
  const values = series
    .flatMap((entry) => entry.values.map((v) => parseFloat(v[1])))
    .filter((v) => !isNaN(v))
    .sort((a, b) => a - b);

  if (values.length === 0) return {};

  return percentiles.reduce((acc, p) => {
    const index = Math.min(Math.ceil(p * values.length) - 1, values.length - 1);
    acc[`p${p * 100}`] = values[Math.max(0, index)];
    return acc;
  }, {});
}

// Analyze HTTP request metrics
async function analyzeHttpMetrics() {
  console.log(colors.section('\n📊 HTTP Request Metrics Analysis'));

  // Get request rate
  const reqRate = await queryPrometheus('sum(rate(http_requests_total[5m])) by (service)');

  // Get error rate
  const errorRate = await queryPrometheus(
    'sum(rate(http_requests_total{status=~"5.."}[5m])) by (service) / sum(rate(http_requests_total[5m])) by (service)'
  );

  // Get latency
  const latency = await queryPrometheus(
    'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))'
  );

  // Display results
  console.log('\nRequest Rates (req/s):');
  reqRate.data.result.forEach((r) => {
    const service = r.metric.service || 'unknown';
    const values = r.values.map((v) => parseFloat(v[1])).filter((v) => !isNaN(v));
    const avg = values.reduce((a, b) => a + b, 0) / values.length || 0;
    console.log(`- ${service}: ${avg.toFixed(2)} req/s`);
  });

  console.log('\nError Rates (%):');
  errorRate.data.result.forEach((r) => {
    const service = r.metric.service || 'unknown';
    const values = r.values.map((v) => parseFloat(v[1]) * 100).filter((v) => !isNaN(v));
    const avg = values.reduce((a, b) => a + b, 0) / values.length || 0;
    console.log(`- ${service}: ${avg.toFixed(2)}%`);
  });

  console.log('\n95th Percentile Latency (s):');
  latency.data.result.forEach((r) => {
    const service = r.metric.service || 'unknown';
    const values = r.values.map((v) => parseFloat(v[1])).filter((v) => !isNaN(v));
    const avg = values.reduce((a, b) => a + b, 0) / values.length || 0;
    console.log(`- ${service}: ${avg.toFixed(4)}s`);
  });
}

// Analyze resource usage
async function analyzeResourceUsage() {
  console.log(colors.section('\n💻 Resource Usage Analysis'));

  // CPU usage
  const cpu = await queryPrometheus(
    '100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100'
  );

  // Memory usage
  const memory = await queryPrometheus(
    '(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100'
  );

  // Disk usage
  const disk = await queryPrometheus(
    '(node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_avail_bytes{mountpoint="/"}) / node_filesystem_size_bytes{mountpoint="/"} * 100'
  );

  // Display results
  console.log('\nCPU Usage (%):');
  cpu.data.result.forEach((r) => {
    const instance = r.metric.instance || 'unknown';
    const values = r.values.map((v) => parseFloat(v[1])).filter((v) => !isNaN(v));
    const avg = values.reduce((a, b) => a + b, 0) / values.length || 0;
    console.log(`- ${instance}: ${avg.toFixed(2)}%`);
  });

  console.log('\nMemory Usage (%):');
  memory.data.result.forEach((r) => {
    const instance = r.metric.instance || 'unknown';
    const values = r.values.map((v) => parseFloat(v[1])).filter((v) => !isNaN(v));
    const avg = values.reduce((a, b) => a + b, 0) / values.length || 0;
    console.log(`- ${instance}: ${avg.toFixed(2)}%`);
  });

  console.log('\nDisk Usage (%):');
  disk.data.result.forEach((r) => {
    const instance = r.metric.instance || 'unknown';
    const values = r.values.map((v) => parseFloat(v[1])).filter((v) => !isNaN(v));
    const avg = values.reduce((a, b) => a + b, 0) / values.length || 0;
    console.log(`- ${instance}: ${avg.toFixed(2)}%`);
  });
}

// Generate alert threshold recommendations
function generateAlertRecommendations(metrics) {
  console.log(colors.section('\n🔔 Recommended Alert Thresholds'));

  const recommendations = [
    {
      name: 'HighErrorRate',
      current: '> 5% for 5m',
      recommended: '> 3% for 5m',
      description: 'Consider lowering the threshold for faster detection of issues',
    },
    {
      name: 'HighLatency',
      current: 'p95 > 1s for 10m',
      recommended: 'p95 > 0.8s for 5m',
      description: 'Adjust based on your SLA requirements',
    },
    {
      name: 'HighCpuUsage',
      current: '> 80% for 5m',
      recommended: '> 70% for 10m',
      description: 'Increase duration to reduce false positives during spikes',
    },
    {
      name: 'HighMemoryUsage',
      current: '> 90%',
      recommended: '> 85% for 15m',
      description: 'Add duration to prevent alerts during garbage collection',
    },
    {
      name: 'LowDiskSpace',
      current: '< 15% free',
      recommended: '< 20% free',
      description: 'Increase warning threshold for more time to react',
    },
  ];

  console.table(recommendations);
}

// Main function
async function main() {
  console.log(colors.highlight('\n🔍 SafeSoundArena Metrics Analysis'));

  try {
    await analyzeHttpMetrics();
    await analyzeResourceUsage();
    generateAlertRecommendations();

    console.log(colors.success('\n✅ Analysis complete!'));
    console.log('\nNext steps:');
    console.log('1. Review the metrics and recommendations above');
    console.log('2. Update alert rules in deploy/monitoring/prometheus/alerts/');
    console.log('3. Test the new thresholds in a staging environment');
  } catch (error) {
    console.error(colors.error('Error during analysis:'), error.message);
    process.exit(1);
  }
}

// Run the analysis
main();
