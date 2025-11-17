// script.js (module) - defensive and complete
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

/* ---------- Firebase config (your provided config) ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyCcd1CCTlJRZ2YOhbziRVdiZlvVzUHiYm4",
  authDomain: "video-tracker-7f709.firebaseapp.com",
  projectId: "video-tracker-7f709",
  storageBucket: "video-tracker-7f709.appspot.com",
  messagingSenderId: "6567580876",
  appId: "1:6567580876:web:e982351a06897faea45e69",
  measurementId: "G-554K9DJVCJ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ---------- UI utilities & safe selectors ---------- */
const safeGet = (id) => document.getElementById(id) || null;
const pages = {
  login: safeGet('page-login'),
  app: safeGet('page-app'),
  dashboard: safeGet('view-dashboard'),
  uploads: safeGet('view-uploads'),
  contact: safeGet('view-contact')
};

const loginErr = safeGet('loginError');
const clockEl = safeGet('clock');
const totalBigEl = safeGet('totalUploadsBig');
const topVideoEl = safeGet('topVideo');

let lineChart = null, pieChart = null;

/* ---------- clock ---------- */
function startClock(){
  if (!clockEl) return;
  function tick(){ clockEl.textContent = new Date().toLocaleTimeString(); }
  tick(); setInterval(tick, 1000);
}
startClock();

/* ---------- Hash routing ---------- */
function showView(route){
  // hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  // show required one
  if (!route || route === 'dashboard') { if (pages.dashboard) pages.dashboard.classList.remove('hidden'); }
  else if (route === 'uploads') { if (pages.uploads) pages.uploads.classList.remove('hidden'); }
  else if (route === 'contact') { if (pages.contact) pages.contact.classList.remove('hidden'); }
}
function onHashChange(){
  const h = location.hash.replace('#','');
  if (h === 'login'){ if (pages.login) pages.login.classList.remove('hidden'); if (pages.app) pages.app.classList.add('hidden'); }
  else { if (pages.login) pages.login.classList.add('hidden'); if (pages.app) pages.app.classList.remove('hidden'); showView(h || 'dashboard'); }
}
window.addEventListener('hashchange', onHashChange);
onHashChange();

/* ---------- Auth UI actions ---------- */
let isLogin = true;
window.toggleAuthMode = function () {
  isLogin = !isLogin;
  const switchBtn = safeGet('switchBtn');
  const authBtn = safeGet('authButton');
  if (switchBtn) switchBtn.textContent = isLogin ? 'Create' : 'Back to Sign-in';
  if (authBtn) authBtn.textContent = isLogin ? 'Login' : 'Register';
  if (loginErr) loginErr.textContent = '';
};

window.login = async function () {
  const email = (safeGet('email')?.value || '').trim();
  const password = safeGet('password')?.value || '';
  if (!email || !password) { if (loginErr) loginErr.textContent = 'Enter email & password.'; return; }
  try {
    if (isLogin) {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      await createUserWithEmailAndPassword(auth, email, password);
      // optionally send verification (not mandatory here)
      isLogin = true; window.toggleAuthMode();
      alert('Account created — please login.');
    }
  } catch (err) {
    console.error(err);
    if (loginErr) loginErr.textContent = err.message || 'Auth error';
  }
};

window.sendPasswordReset = function () {
  const email = (safeGet('email')?.value || '').trim();
  if (!email) return alert('Enter your email to reset password.');
  sendPasswordResetEmail(auth, email)
    .then(() => alert('Password reset email sent.'))
    .catch(e => alert('Reset failed: ' + e.message));
};

window.logout = function () {
  signOut(auth).then(() => {
    location.hash = '#login';
  }).catch(e => console.warn('Sign out failed', e));
};

/* ---------- onAuthStateChanged - careful with nulls ---------- */
onAuthStateChanged(auth, user => {
  const authPage = pages.login;
  const appShell = pages.app;
  const profileNameEl = safeGet('profileName');
  const profileEmailEl = safeGet('profileEmail');

  if (user) {
    if (authPage) authPage.classList.add('hidden');
    if (appShell) { appShell.classList.remove('hidden'); appShell.setAttribute('aria-hidden','false'); }
    if (profileEmailEl) profileEmailEl.textContent = user.email || '';
    if (profileNameEl) profileNameEl.textContent = user.displayName || 'Asmit Kamble';

    // load uploads for authenticated users
    loadUploads().catch(err => {
      console.error('Could not load uploads:', err);
      alert('Could not load uploads: ' + (err.message || err));
    });
  } else {
    // default back to login view
    if (authPage) authPage.classList.remove('hidden');
    if (appShell) { appShell.classList.add('hidden'); appShell.setAttribute('aria-hidden','true'); }
    if (profileEmailEl) profileEmailEl.textContent = 'ashkamble149@gmail.com';
    if (profileNameEl) profileNameEl.textContent = 'Asmit Kamble';
    // clear charts
    updateCharts([], {});
  }
});

/* ---------- Guest Mode: show demo data only (no Firestore access) ---------- */
window.guestView = function () {
  // show app shell but do NOT call loadUploads (no Firestore access)
  if (pages.login) pages.login.classList.add('hidden');
  if (pages.app) pages.app.classList.remove('hidden');

  // demo rows & stats so UI isn't empty
  const demoRows = [
    { id: 'd1', date: '2025-11-10', platform: 'YouTube', title1: 'Worship Highlights' },
    { id: 'd2', date: '2025-11-12', platform: 'Instagram', title1: 'Church Short' },
    { id: 'd3', date: '2025-11-14', platform: 'Facebook', title1: 'Event Promo' }
  ];
  const stats = { YouTube: 1, Instagram: 1, Facebook: 1 };

  // render demo
  renderTable(demoRows);
  updateCharts(demoRows, stats);
  if (totalBigEl) totalBigEl.textContent = demoRows.length;
  // adjust view
  location.hash = '#dashboard';
};

/* ---------- Firestore: load, add, delete ---------- */
async function loadUploads(){
  const tbody = document.querySelector('#uploadTable tbody');
  if (!tbody) throw new Error('Upload table missing in DOM');

  // ensure user is authenticated
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  tbody.innerHTML = '';
  try {
    const q = query(collection(db, 'uploads'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const rows = [];
    const stats = {};
    snap.forEach(s => {
      const d = s.data();
      rows.push({ id: s.id, ...d });
      stats[d.platform] = (stats[d.platform] || 0) + 1;
    });
    renderTable(rows);
    updateCharts(rows, stats);
    if (totalBigEl) totalBigEl.textContent = rows.length;
  } catch (err) {
    console.error('Could not load uploads:', err);
    throw err;
  }
}

function renderTable(rows){
  const tbody = document.querySelector('#uploadTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  rows.slice(0, 8).forEach(r => {
    const tr = document.createElement('tr');
    const title = r.title1 || r.title || '';
    tr.innerHTML = `
      <td>${r.date || ''}</td>
      <td>${r.platform || ''}</td>
      <td>${escapeHtml(title)}</td>
      <td><button class="delete-btn" onclick="window.deleteUpload('${r.id}')">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });

  // uploads list table
  const listT = document.querySelector('#uploadListTbl tbody');
  if (listT) {
    listT.innerHTML = '';
    rows.forEach(r => {
      const tr = document.createElement('tr');
      const title = r.title1 || r.title || '';
      tr.innerHTML = `
        <td>${r.date || ''}</td><td>${r.platform || ''}</td><td>${escapeHtml(title)}</td>
        <td><button class="delete-btn" onclick="window.deleteUpload('${r.id}')">Delete</button></td>`;
      listT.appendChild(tr);
    });
  }
}

window.addUpload = async function(){
  const user = auth.currentUser;
  if (!user) return alert('Please sign in to save uploads.');

  const date = safeGet('u_date')?.value || '';
  const platform = safeGet('u_platform')?.value || '';
  const title = (safeGet('u_title')?.value || '').trim();

  if (!date || !platform || !title) return alert('Please fill date, platform and title.');
  try {
    await addDoc(collection(db, 'uploads'), {
      date,
      platform,
      title1: title,
      ownerUid: user.uid,
      createdAt: new Date().toISOString()
    });
    // clear fields
    if (safeGet('u_title')) safeGet('u_title').value = '';
    await loadUploads();
  } catch (err) {
    console.error('Save failed:', err);
    alert('Save failed: ' + (err.message || err));
  }
};

window.deleteUpload = async function(id){
  if (!confirm('Delete this upload?')) return;
  try {
    await deleteDoc(doc(db, 'uploads', id));
    // refresh list (if authenticated)
    if (auth.currentUser) await loadUploads();
    else {
      // if guest (shouldn't happen) just remove row visually
      const row = document.querySelector(`#uploadTable button[onclick*="${id}"]`)?.closest('tr');
      if (row) row.remove();
    }
  } catch (err) {
    console.error('Delete failed:', err);
    alert('Delete failed: ' + (err.message || err));
  }
};

/* ---------- CSV / PNG export ---------- */
window.downloadCSV = async function () {
  try {
    const snap = await getDocs(collection(db, 'uploads'));
    let csv = 'Date,Platform,Title1,Title2,Title3\n';
    snap.forEach(s => {
      const e = s.data();
      const esc = v => `"${String(v || '').replace(/"/g,'""')}"`;
      csv += [e.date || '', e.platform || '', esc(e.title1), esc(e.title2), esc(e.title3)].join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `uploads_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  } catch (err) {
    alert('Export failed: ' + (err.message || err));
  }
};

window.downloadPNG = function () {
  const canvas = document.getElementById('lineChart');
  if (!canvas) return alert('No chart to export.');
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `upload_chart_${new Date().toISOString().slice(0,10)}.png`;
  link.click();
};

/* ---------- Charts ---------- */
function updateCharts(rows = [], stats = {}) {
  // build line labels & data
  const byDate = {};
  rows.forEach(r => {
    const d = r.date || (r.createdAt ? (r.createdAt.slice(0,10)) : '');
    if (d) byDate[d] = (byDate[d] || 0) + 1;
  });
  const labels = Object.keys(byDate).sort();
  const counts = labels.map(k => byDate[k]);

  // line chart
  const lineCtx = document.getElementById('lineChart')?.getContext('2d');
  if (lineChart) { try { lineChart.destroy(); } catch (e) { /* ignore */ } }
  if (lineCtx) {
    lineChart = new Chart(lineCtx, {
      type: 'line',
      data: { labels, datasets: [{ label: 'Uploads', data: counts, tension: 0.36, borderColor: '#9ad', backgroundColor: 'rgba(100,170,255,0.12)', fill: true }]},
      options: { plugins: { legend: { display: false } } }
    });
  }

  // pie/doughnut
  const pieCtx = document.getElementById('pieChart')?.getContext('2d');
  if (pieChart) { try { pieChart.destroy(); } catch(e){} }
  if (pieCtx) {
    pieChart = new Chart(pieCtx, {
      type: 'doughnut',
      data: { labels: Object.keys(stats), datasets: [{ data: Object.values(stats), backgroundColor: ['#6aa8ff','#c57bff','#ffcc66'] }] },
      options: { plugins: { legend: { position: 'bottom', labels: { color: '#fff' } } } }
    });
  }
}

/* ---------- Contact form (mailto fallback) ---------- */
window.sendContact = function (e) {
  e.preventDefault();
  const name = safeGet('c_name')?.value || 'Anonymous';
  const email = safeGet('c_email')?.value || '';
  const message = safeGet('c_message')?.value || '';
  const to = 'ashkamble149@gmail.com';
  const subject = encodeURIComponent('Contact from Website: ' + name);
  const body = encodeURIComponent(`From: ${name} <${email}>\n\n${message}`);
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
};

window.resetContact = function () {
  if (safeGet('contactForm')) safeGet('contactForm').reset();
  if (safeGet('c_name')) safeGet('c_name').value = 'Asmit Kamble';
  if (safeGet('c_email')) safeGet('c_email').value = 'ashkamble149@gmail.com';
};

/* ---------- small utility ---------- */
function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

/* ---------- Initialization ---------- */
// show/hide based on hash
onHashChange();

// If no user, we keep login visible. If you prefer auto-guest, call guestView() here.
// guestView();
