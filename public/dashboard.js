// dashboard.js
let analytics = null;
let rawAnalytics = null;
let providerUsageChart = null;
let consensusRateChart = null;

async function fetchAnalytics() {
  const res = await fetch('/api/analytics');
  return await res.json();
}

async function fetchRawAnalytics() {
  const res = await fetch('/api/analytics/raw');
  return await res.json();
}

function renderSummary(stats) {
  document.getElementById('summary').innerHTML = `
    <h2>Summary</h2>
    <p><strong>Total Queries:</strong> ${stats.totalQueries}</p>
    <p><strong>Most Common Consensus:</strong> ${stats.mostCommonConsensus.consensus || 'N/A'} (${stats.mostCommonConsensus.count || 0})</p>
  `;
}

function renderProviderUsage(stats) {
  const usage = Object.entries(stats.providerUsage)
    .map(([provider, count]) => `<li><strong>${provider}:</strong> ${count}</li>`)
    .join('');
  document.getElementById('provider-usage').innerHTML = `
    <h2>Provider Usage</h2>
    <ul>${usage}</ul>
  `;
  // Chart
  const ctx = document.getElementById('providerUsageChart').getContext('2d');
  if (providerUsageChart) providerUsageChart.destroy();
  providerUsageChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(stats.providerUsage),
      datasets: [{
        label: 'Provider Usage',
        data: Object.values(stats.providerUsage),
        backgroundColor: '#0059b2',
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

function renderConsensusRateChart(raw) {
  let consensusCount = 0;
  for (const q of raw.queries) if (q.consensus) consensusCount++;
  const total = raw.queries.length;
  const ctx = document.getElementById('consensusRateChart').getContext('2d');
  if (consensusRateChart) consensusRateChart.destroy();
  consensusRateChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Consensus', 'No Consensus'],
      datasets: [{
        data: [consensusCount, total - consensusCount],
        backgroundColor: ['#22c55e', '#ef4444'],
      }]
    },
    options: { responsive: true }
  });
}

function renderLastQueries(stats, filter = {}) {
  let queries = stats.last10;
  if (filter.provider) {
    queries = queries.filter(q => q.all && Object.keys(q.all).includes(filter.provider));
  }
  if (filter.consensus) {
    queries = queries.filter(q => q.consensus && q.consensus.toLowerCase().includes(filter.consensus.toLowerCase()));
  }
  const html = queries.map(q => `
    <div class="query-block">
      <div><strong>Prompt:</strong> ${q.prompt}</div>
      <div><strong>Consensus:</strong> ${q.consensus || 'N/A'}</div>
      <div><strong>Tally:</strong> <pre>${JSON.stringify(q.tally, null, 2)}</pre></div>
      <div><strong>Timestamp:</strong> ${q.timestamp}</div>
    </div>
  `).join('');
  document.getElementById('last-queries').innerHTML = `
    <h2>Last 10 Queries</h2>
    ${html}
  `;
}

function renderUserBreakdown(raw) {
  // User breakdown by prompt (simulate user if not present)
  const users = {};
  for (const q of raw.queries) {
    // Simulate user by prompt hash (replace with real user ID if available)
    const user = q.prompt.slice(0, 12) || 'unknown';
    users[user] = users[user] || { count: 0, queries: [] };
    users[user].count++;
    users[user].queries.push(q);
  }
  const html = Object.entries(users).map(([user, data]) => `
    <div class="query-block">
      <strong>User:</strong> ${user} <span style="color:#888">(${data.count} queries)</span>
      <ul>${data.queries.map(q => `<li>${q.prompt} (${q.consensus || 'N/A'})</li>`).join('')}</ul>
    </div>
  `).join('');
  document.getElementById('user-breakdown').innerHTML = `
    <h2>User Breakdown (by prompt hash)</h2>
    ${html}
  `;
}

function renderProviderFilter(stats) {
  const select = document.getElementById('provider-filter');
  select.innerHTML = '<option value="">All</option>' + Object.keys(stats.providerUsage).map(p => `<option value="${p}">${p}</option>`).join('');
}

async function renderDashboard() {
  analytics = await fetchAnalytics();
  rawAnalytics = await fetchRawAnalytics();
  renderSummary(analytics);
  renderProviderUsage(analytics);
  renderProviderFilter(analytics);
  renderLastQueries(analytics);
  renderUserBreakdown(rawAnalytics);
  renderConsensusRateChart(rawAnalytics);
}

function renderUserBreakdownById(stats) {
  const users = stats.userBreakdown || {};
  const html = Object.entries(users).map(([user, data]) => `
    <div class="query-block">
      <strong>User:</strong> ${user} <span style="color:#888">(${data.count} queries)</span>
      <ul>${data.queries.map(q => `<li>${q.prompt} (${q.consensus || 'N/A'})</li>`).join('')}</ul>
    </div>
  `).join('');
  document.getElementById('user-breakdown').innerHTML = `
    <h2>User Breakdown (by userId)</h2>
    ${html}
  `;
}

function exportAnalytics(format = 'json') {
  fetch('/api/analytics/raw').then(res => res.json()).then(data => {
    let blob, filename;
    if (format === 'csv') {
      const rows = [
        ['prompt','consensus','userId','timestamp','providers'],
        ...data.queries.map(q => [q.prompt, q.consensus, q.userId, q.timestamp, Object.keys(q.all||{}).join(';')])
      ];
      const csv = rows.map(r => r.map(x => '"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n');
      blob = new Blob([csv], {type:'text/csv'});
      filename = 'analytics.csv';
    } else {
      blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
      filename = 'analytics.json';
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  });
}

async function fetchMe() {
  const res = await fetch('/api/me');
  return await res.json();
}

// --- Tab switching logic ---
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.getElementById(`tab-${tab}-content`).classList.add('active');
}

// --- My Analytics rendering ---
async function renderMyAnalytics() {
  const res = await fetch('/api/my-analytics', {
    headers: window.piUsername ? { 'piUsername': window.piUsername } : {}
  });
  if (!res.ok) {
    document.getElementById('my-analytics-summary').innerHTML = '<em>Not available (not a Pi Browser pioneer)</em>';
    document.getElementById('my-analytics-queries').innerHTML = '';
    return;
  }
  const data = await res.json();
  document.getElementById('my-analytics-summary').innerHTML = `<strong>Total Queries:</strong> ${data.queries.length}`;
  document.getElementById('my-analytics-queries').innerHTML = data.queries.slice(-10).map(q => {
    const voteKey = `vote_${q.timestamp}`;
    const myVote = localStorage.getItem(voteKey) || '';
    return `
      <div class="query-block bg-white dark:bg-dark rounded-lg shadow-md p-4 mb-4">
        <div><strong>Prompt:</strong> ${q.prompt}</div>
        <div><strong>Consensus:</strong> <span id="consensus-${q.timestamp}">${q.consensus || 'N/A'}</span></div>
        <div><strong>Tally:</strong> <pre>${JSON.stringify(q.tally, null, 2)}</pre></div>
        <div><strong>Timestamp:</strong> ${q.timestamp}</div>
        <div class="flex gap-2 mt-2">
          <button class="theme-btn" data-vote="agree" data-ts="${q.timestamp}" ${myVote==='agree'?'disabled':''}>Agree</button>
          <button class="theme-btn" data-vote="disagree" data-ts="${q.timestamp}" ${myVote==='disagree'?'disabled':''}>Disagree</button>
          <span class="ml-2 text-sm">Votes: <span id="votes-${q.timestamp}">...</span></span>
        </div>
      </div>
    `;
  }).join('');
  // Voting logic
  document.querySelectorAll('[data-vote]').forEach(btn => {
    btn.onclick = async function() {
      const ts = btn.getAttribute('data-ts');
      const vote = btn.getAttribute('data-vote');
      localStorage.setItem(`vote_${ts}`, vote);
      // Send vote to backend
      const headers = { 'Content-Type': 'application/json' };
      if (window.piUsername) headers['X-Pi-Username'] = window.piUsername;
      await fetch('/api/vote', {
        method: 'POST',
        headers,
        body: JSON.stringify({ timestamp: ts, vote })
      });
      renderMyAnalytics(); // refresh UI
    };
  });
  // Fetch vote counts for each query
  data.queries.slice(-10).forEach(async q => {
    const res = await fetch(`/api/votes/${q.timestamp}`);
    if (res.ok) {
      const { agree, disagree } = await res.json();
      const el = document.getElementById(`votes-${q.timestamp}`);
      if (el) el.textContent = `Agree: ${agree}, Disagree: ${disagree}`;
    }
  });
  // Real-time vote updates
  if (window.io && !window.voteSocket) {
    window.voteSocket = io();
    window.voteSocket.on('voteUpdate', ({ timestamp }) => {
      const el = document.getElementById(`votes-${timestamp}`);
      if (el) {
        fetch(`/api/votes/${timestamp}`).then(res => res.json()).then(({ agree, disagree }) => {
          el.textContent = `Agree: ${agree}, Disagree: ${disagree}`;
        });
      }
    });
    window.voteSocket.on('consensusUpdate', ({ timestamp, consensus }) => {
      const el = document.getElementById(`consensus-${timestamp}`);
      if (el) el.textContent = consensus;
    });
  }
}

// --- Profile fetch/save ---
async function fetchProfile() {
  const res = await fetch('/api/my-profile', {
    headers: window.piUsername ? { 'X-Pi-Username': window.piUsername } : {}
  });
  if (!res.ok) {
    document.getElementById('profile-form').style.display = 'none';
    document.getElementById('profile-success').style.display = 'none';
    document.getElementById('profile-error').style.display = 'block';
    document.getElementById('profile-error').textContent = 'Not available (not a Pi Browser pioneer)';
    return;
  }
  const profile = await res.json();
  document.getElementById('profile-displayName').value = profile.displayName || '';
  document.getElementById('profile-email').value = profile.email || '';
}
async function saveProfile(e) {
  e.preventDefault();
  const displayName = document.getElementById('profile-displayName').value;
  const email = document.getElementById('profile-email').value;
  const headers = { 'Content-Type': 'application/json' };
  if (window.piUsername) headers['X-Pi-Username'] = window.piUsername;
  const res = await fetch('/api/my-profile', {
    method: 'POST',
    headers,
    body: JSON.stringify({ displayName, email })
  });
  if (res.ok) {
    document.getElementById('profile-success').style.display = 'block';
    document.getElementById('profile-error').style.display = 'none';
    setTimeout(() => { document.getElementById('profile-success').style.display = 'none'; }, 1500);
  } else {
    document.getElementById('profile-success').style.display = 'none';
    document.getElementById('profile-error').style.display = 'block';
    document.getElementById('profile-error').textContent = 'Failed to save profile.';
  }
}

// --- GDPR actions ---
async function exportMyData() {
  const res = await fetch('/api/export-my-data', {
    headers: window.piUsername ? { 'X-Pi-Username': window.piUsername } : {}
  });
  if (!res.ok) return alert('Not available (not a Pi Browser pioneer)');
  const data = await res.json();
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'my_data.json';
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}
async function deleteMyData() {
  if (!confirm('Are you sure you want to delete all your data? This cannot be undone.')) return;
  const headers = {};
  if (window.piUsername) headers['X-Pi-Username'] = window.piUsername;
  const res = await fetch('/api/delete-my-data', {method:'POST', headers});
  if (res.ok) {
    alert('Your data has been deleted.');
    renderMyAnalytics();
    fetchProfile();
  } else {
    alert('Failed to delete your data.');
  }
}

// --- Main DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
  renderDashboard();
  // Personal data section: auto-detect Pi Browser
  // Pi Network JS SDK integration
  if (window.Pi && window.Pi.authenticate) {
    window.Pi.authenticate(['username'], function(auth) {
      if (auth && auth.user && auth.user.username) {
        document.getElementById('pioneer-status').textContent = `Pioneer confirmed (Pi Username: ${auth.user.username})`;
        document.getElementById('user-actions').style.display = '';
        renderMyAnalytics();
        fetchProfile();
        // Optionally, store Pi username for per-user analytics/profile
        window.piUsername = auth.user.username;
        return;
      } else {
        document.getElementById('pioneer-status').textContent = 'Could not authenticate with Pi Network.';
        document.getElementById('user-actions').style.display = 'none';
      }
    }, function(error) {
      document.getElementById('pioneer-status').textContent = 'Pi authentication error: ' + error;
      document.getElementById('user-actions').style.display = 'none';
    });
  } else {
    // Fallback: pioneer detection
    fetchMe().then(({ pioneer }) => {
      document.getElementById('pioneer-status').textContent = pioneer
        ? 'Pioneer confirmed (Pi Browser detected)'
        : 'Not a pioneer (not using Pi Browser)';
      document.getElementById('user-actions').style.display = pioneer ? '' : 'none';
      if (pioneer) {
        renderMyAnalytics();
        fetchProfile();
      }
    });
  }

  // Pi Payment button logic
  function setupPiPaymentButton() {
    if (!window.Pi || !window.piUsername) return;
    let payBtn = document.getElementById('pi-payment-btn');
    if (!payBtn) {
      payBtn = document.createElement('button');
      payBtn.id = 'pi-payment-btn';
      payBtn.textContent = 'Make Pi Payment (0.01 Pi)';
      payBtn.style.margin = '10px';
      document.getElementById('user-actions').appendChild(payBtn);
    }
    payBtn.onclick = function() {
      payBtn.disabled = true;
      payBtn.textContent = 'Processing...';
      window.Pi.createPayment({
        amount: 0.01,
        memo: 'Test payment from dashboard',
        metadata: { from: window.piUsername, type: 'test' }
      }, {
        onReadyForServerApproval: function(paymentId) {
          payBtn.textContent = 'Waiting for approval...';
        },
        onReadyForServerCompletion: function(paymentId, txid) {
          payBtn.textContent = 'Completing...';
        },
        onCancel: function(paymentId) {
          payBtn.textContent = 'Payment cancelled';
          setTimeout(() => { payBtn.textContent = 'Make Pi Payment (0.01 Pi)'; payBtn.disabled = false; }, 2000);
        },
        onError: function(error, payment) {
          payBtn.textContent = 'Error: ' + error;
          setTimeout(() => { payBtn.textContent = 'Make Pi Payment (0.01 Pi)'; payBtn.disabled = false; }, 2000);
        },
        onIncompletePaymentFound: function(payment) {
          payBtn.textContent = 'Incomplete payment found';
          setTimeout(() => { payBtn.textContent = 'Make Pi Payment (0.01 Pi)'; payBtn.disabled = false; }, 2000);
        },
        onSuccess: function(paymentId, txid) {
          payBtn.textContent = 'Payment successful!';
          setTimeout(() => { payBtn.textContent = 'Make Pi Payment (0.01 Pi)'; payBtn.disabled = false; }, 2000);
        }
      });
    };
  }

  // Tabs logic
  document.getElementById('tab-dashboard').onclick = () => switchTab('dashboard');
  document.getElementById('tab-my-analytics').onclick = () => { switchTab('my-analytics'); renderMyAnalytics(); };
  document.getElementById('tab-profile').onclick = () => { switchTab('profile'); fetchProfile(); };

  // Profile form
  document.getElementById('profile-form').onsubmit = saveProfile;

  // GDPR actions
  document.getElementById('export-my-data').onclick = exportMyData;
  document.getElementById('delete-my-data').onclick = deleteMyData;

  // Setup payment button (if Pi SDK and username available)
  setTimeout(setupPiPaymentButton, 1000);

  // Filtering
  document.getElementById('provider-filter').addEventListener('change', e => {
    renderLastQueries(analytics, { provider: e.target.value, consensus: document.getElementById('consensus-filter').value });
  });
  document.getElementById('consensus-filter').addEventListener('input', e => {
    renderLastQueries(analytics, { provider: document.getElementById('provider-filter').value, consensus: e.target.value });
  });
  document.getElementById('reset-filters').addEventListener('click', () => {
    document.getElementById('provider-filter').value = '';
    document.getElementById('consensus-filter').value = '';
    renderLastQueries(analytics);
  });
  // Export (global, not per-user)
  const expBtns = document.createElement('div');
  expBtns.innerHTML = '<button id="export-json">Export JSON</button> <button id="export-csv">Export CSV</button>';
  document.querySelector('.container').insertBefore(expBtns, document.getElementById('summary'));
  document.getElementById('export-json').onclick = () => exportAnalytics('json');
  document.getElementById('export-csv').onclick = () => exportAnalytics('csv');
  // Live updates
  if (window.io) {
    const socket = io('http://localhost:3001');
    socket.on('analyticsUpdate', () => {
      renderDashboard();
      renderMyAnalytics();
    });
  }
});
