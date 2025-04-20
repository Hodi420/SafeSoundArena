// web/public/dashboard.js
// דשבורד מתקדם לבוט הקובע: פקודות, לוג, אישורים, התראות, הרשאות, שפה
const root = document.getElementById('root');

const LANGS = {
  he: {
    title: 'דשבורד ניהול בוט קובע',
    command: 'פקודה/שאלה לבוט:',
    approve: 'אישור מנהל (לביצוע בפועל)',
    send: 'שלח לבוט',
    pending: 'המתנות לאישור',
    log: 'יומן החלטות',
    notif: 'התראות',
    users: 'הרשאות משתמשים',
    lang: 'שפה:',
    email: 'שלח התראה למייל',
    telegram: 'שלח התראה לטלגרם',
    user: 'משתמש',
    permission: 'הרשאה',
    set: 'עדכן'
  },
  en: {
    title: 'DeciderBot Admin Dashboard',
    command: 'Command/Question:',
    approve: 'Manager approval (execute)',
    send: 'Send to Bot',
    pending: 'Pending Approvals',
    log: 'Decision Log',
    notif: 'Notifications',
    users: 'User Permissions',
    lang: 'Language:',
    email: 'Send Email Notification',
    telegram: 'Send Telegram Notification',
    user: 'User',
    permission: 'Permission',
    set: 'Set'
  }
};
let lang = 'he';

function t(key) { return LANGS[lang][key] || key; }

async function api(path, method = 'GET', data) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined
  });
  return await res.json();
}

function render() {
  root.innerHTML = `
    <h1>${t('title')}</h1>
    <div class="dashboard-section">
      <label>${t('lang')}
        <select id="langSel">
          <option value="he">עברית</option>
          <option value="en">English</option>
        </select>
      </label>
    </div>
    <form id="commandForm" class="dashboard-section">
      <label>${t('command')}</label>
      <textarea id="prompt" required rows="2"></textarea>
      <label><input type="checkbox" id="approve" /> ${t('approve')}</label>
      <button type="submit">${t('send')}</button>
    </form>
    <div class="dashboard-section">
      <h2>${t('pending')}</h2>
      <div id="pendingList"></div>
    </div>
    <div class="dashboard-section">
      <h2>${t('log')}</h2>
      <div id="logList"></div>
    </div>
    <div class="dashboard-section">
      <h2>${t('notif')}</h2>
      <input type="text" id="email" placeholder="example@mail.com" />
      <button id="sendEmail">${t('email')}</button>
      <input type="text" id="telegram" placeholder="@username" />
      <button id="sendTelegram">${t('telegram')}</button>
      <div id="notifMsg"></div>
    </div>
    <div class="dashboard-section">
      <h2>${t('users')}</h2>
      <div id="userPerm"></div>
    </div>
  `;
  document.getElementById('langSel').value = lang;
  document.getElementById('langSel').onchange = e => { lang = e.target.value; render(); fetchAll(); };
  document.getElementById('commandForm').onsubmit = async e => {
    e.preventDefault();
    const prompt = document.getElementById('prompt').value;
    const approve = document.getElementById('approve').checked;
    await api('/api/command', 'POST', { prompt, approve });
    document.getElementById('prompt').value = '';
    document.getElementById('approve').checked = false;
    fetchAll();
  };
  document.getElementById('sendEmail').onclick = async e => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const res = await api('/api/notify', 'POST', { type: 'email', to: email });
    document.getElementById('notifMsg').innerText = res && res.ok ? 'נשלח!' : 'שגיאה';
  };
  document.getElementById('sendTelegram').onclick = async e => {
    e.preventDefault();
    const telegram = document.getElementById('telegram').value;
    const res = await api('/api/notify', 'POST', { type: 'telegram', to: telegram });
    document.getElementById('notifMsg').innerText = res && res.ok ? 'נשלח!' : 'שגיאה';
  };
}

async function fetchLog() {
  const log = await api('/api/log');
  document.getElementById('logList').innerHTML = log.slice(-10).reverse().map(entry => `
    <div class="log-entry">
      <b>${t('command')}</b> ${entry.prompt}<br />
      <b>החלטה:</b> ${entry.consensus}<br />
      <b>סטטוס:</b> <span class="${entry.status === 'success' ? 'success' : (entry.status === 'error' ? 'error' : '')}">${entry.status}</span><br />
      <b>מורכבות:</b> ${entry.consensusComplexity}<br />
      <b>זמן:</b> ${new Date(entry.timestamp).toLocaleString(lang === 'he' ? 'he-IL' : 'en-US')}
      ${entry.validationQuestions ? `<div class="questions"><b>שאלות אימות:</b><ul>` + entry.validationQuestions.map(q => `<li>${q}</li>`).join('') + '</ul></div>' : ''}
    </div>
  `).join('');
}

async function fetchPending() {
  const pending = await api('/api/pending');
  document.getElementById('pendingList').innerHTML = !pending.length ? '<i>אין פעולות שממתינות לאישור.</i>' : pending.reverse().map(entry => `
    <div class="pending-entry">
      <b>${t('command')}</b> ${entry.prompt}<br />
      <b>החלטה:</b> ${entry.consensus}<br />
      <b>סטטוס:</b> <span>${entry.status}</span><br />
      <b>שאלות לאימות:</b><ul>
      ${entry.validationQuestions.map(q => `<li>${q}</li>`).join('')}
      </ul>
    </div>
  `).join('');
}

async function fetchUsers() {
  const users = await api('/api/users');
  document.getElementById('userPerm').innerHTML = users.map(u => `
    <div class="notif-entry">
      <b>${t('user')}</b>: ${u.name} &nbsp;
      <b>${t('permission')}</b>: <select data-user="${u.name}">
        <option value="admin" ${u.permission==='admin'?'selected':''}>Admin</option>
        <option value="manager" ${u.permission==='manager'?'selected':''}>Manager</option>
        <option value="viewer" ${u.permission==='viewer'?'selected':''}>Viewer</option>
      </select>
      <button data-user="${u.name}">${t('set')}</button>
    </div>
  `).join('');
  document.querySelectorAll('#userPerm select').forEach(sel => {
    sel.onchange = e => {
      const name = e.target.getAttribute('data-user');
      const perm = e.target.value;
      api('/api/users', 'POST', { name, permission: perm });
    };
  });
  document.querySelectorAll('#userPerm button').forEach(btn => {
    btn.onclick = e => {
      const name = btn.getAttribute('data-user');
      const perm = document.querySelector(`#userPerm select[data-user="${name}"]`).value;
      api('/api/users', 'POST', { name, permission: perm });
    };
  });
}

function fetchAll() {
  fetchLog();
  fetchPending();
  fetchUsers();
}

render();
fetchAll();
setInterval(fetchAll, 5000);
