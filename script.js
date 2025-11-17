// script.js - robust, detailed logging for sign-in/register failures (PC + mobile)
// Replace existing script.js entirely with this file.

const firebaseConfig = {
  apiKey: "AIzaSyCcd1CCTlJRZ2YOhbziRVdiZlvVzUHiYm4",
  authDomain: "video-tracker-7f709.firebaseapp.com",
  projectId: "video-tracker-7f709",
  storageBucket: "video-tracker-7f709.appspot.com",
  messagingSenderId: "6567580876",
  appId: "1:6567580876:web:e982351a06897faea45e69",
  measurementId: "G-554K9DJVCJ"
};

// Safe init — avoid double init errors
try {
  if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(firebaseConfig);
  else firebase.app(); // already-initialized
} catch (e) {
  console.error('Firebase init error:', e);
  alert('Firebase init failed. Check console for details.');
}

const auth = firebase.auth();
const db = firebase.firestore();

const $ = id => document.getElementById(id);
function setAuthMessage(msg, isError = true){
  if ($('authMessage')) $('authMessage').textContent = isError ? msg : '';
  if ($('authSuccess')) $('authSuccess').textContent = isError ? '' : msg;
  console[isError ? 'warn' : 'info']('AUTH:', msg);
}
function setButtonsDisabled(disabled){
  const emailBtn = $('emailBtn'), regBtn = $('regBtn');
  if (emailBtn) emailBtn.disabled = disabled;
  if (regBtn) regBtn.disabled = disabled;
}

// Ensure persistence for mobile browsers (best effort)
(async function ensurePersistence(){
  try {
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    console.info('Auth persistence: LOCAL');
  } catch (err) {
    console.warn('Could not set LOCAL persistence:', err);
  }
})();

function friendlyAuthError(err){
  if (!err) return 'Unknown error';
  const code = err.code || '';
  if (code === 'auth/wrong-password') return 'Wrong password — try again.';
  if (code === 'auth/user-not-found') return 'No account for this email. Please register.';
  if (code === 'auth/invalid-email') return 'Invalid email.';
  if (code === 'auth/email-already-in-use') return 'Email already registered.';
  if (code === 'auth/weak-password') return 'Weak password (min 6).';
  if (code === 'auth/unauthorized-domain') return 'Site not authorized in Firebase Auth (add your domain in console).';
  if (code === 'auth/network-request-failed') return 'Network issue — check connection.';
  return err.message || code || 'Authentication failed';
}

async function emailSign(){
  setAuthMessage('');
  const email = ($('email')?.value || '').trim();
  const pass = ($('password')?.value || '');
  if (!email || !pass) { setAuthMessage('Please enter email and password.'); return; }
  setButtonsDisabled(true);
  try {
    console.info('Signing in', email);
    await auth.signInWithEmailAndPassword(email, pass);
    setAuthMessage('Signed in successfully', false);
  } catch (err) {
    console.error('Sign-in error object:', err);
    setAuthMessage(friendlyAuthError(err));
    // If unauthorized-domain - call out
    if (err && err.code === 'auth/unauthorized-domain') {
      console.error('Add your site domain to Firebase Console → Authentication → Authorized domains.');
    }
  } finally { setButtonsDisabled(false); }
}

async function registerEmail(){
  setAuthMessage('');
  const email = ($('email')?.value || '').trim();
  const pass = ($('password')?.value || '');
  if (!email || !pass) { setAuthMessage('Please enter email and password to register.'); return; }
  if (pass.length < 6) { setAuthMessage('Password must be at least 6 characters.'); return; }
  setButtonsDisabled(true);
  try {
    console.info('Registering', email);
    await auth.createUserWithEmailAndPassword(email, pass);
    setAuthMessage('Registered and signed in', false);
  } catch (err) {
    console.error('Register error object:', err);
    setAuthMessage(friendlyAuthError(err));
  } finally { setButtonsDisabled(false); }
}

function signOutUser(){ auth.signOut().catch(e => { console.warn('Signout failed',e); alert('Signout failed: ' + (e.message||e)); }); }
function showSection(name){
  ['section-dashboard','section-uploads','section-contact'].forEach(id=>{
    const el = document.getElementById(id);
    if (!el) return;
    if (id === 'section-' + name) el.classList.remove('hidden'); else el.classList.add('hidden');
  });
}

// Auth observer with detailed logging
auth.onAuthStateChanged(async user => {
  console.info('Auth state changed. User:', user && user.email ? user.email : null);
  if (user) {
    if ($('loginView')) $('loginView').classList.add('hidden');
    if ($('appView')) $('appView').classList.remove('hidden');

    const displayName = user.displayName || 'Asmit Kamble';
    const email = user.email || '';

    if ($('profileEmail')) $('profileEmail').textContent = email;
    if ($('profileName')) $('profileName').textContent = displayName;
    if ($('avatarLetter')) $('avatarLetter').textContent = (displayName || email)[0]?.toUpperCase() || 'A';

    if ($('mobileProfileEmail')) $('mobileProfileEmail').textContent = email;
    if ($('mobileProfileName')) $('mobileProfileName').textContent = displayName;
    if ($('mobileAvatarLetter')) $('mobileAvatarLetter').textContent = (displayName || email)[0]?.toUpperCase() || 'A';

    try {
      // show mobile topbar if small screen
      if (window.matchMedia && window.matchMedia('(max-width:900px)').matches) {
        const mt = $('mobileTopbar'); if (mt) mt.style.display = 'flex';
      }
    } catch(e){ console.warn('matchMedia error', e); }

    await loadUploads().catch(e => console.error('loadUploads failed after auth', e));
    showSection('dashboard');
  } else {
    if ($('loginView')) $('loginView').classList.remove('hidden');
    if ($('appView')) $('appView').classList.add('hidden');
  }
});

/* -------- Firestore + UI functions (unchanged behavior) -------- */
async function loadUploads(){
  const tableTbody = document.querySelector('#uploadTable tbody');
  const listTbody = document.querySelector('#uploadList tbody');
  if (tableTbody) tableTbody.innerHTML = '';
  if (listTbody) listTbody.innerHTML = '';

  const user = auth.currentUser;
  if (!user) { updateCharts([], {}); return; }

  try {
    const snap = await db.collection('uploads').orderBy('createdAt','desc').get();
    const rows = []; const stats = {};
    snap.forEach(docSnap => { const d = docSnap.data(); rows.push({ id: docSnap.id, ...d }); stats[d.platform] = (stats[d.platform] || 0) + 1; });

    if (tableTbody) rows.slice(0,12).forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.date||''}</td><td>${r.platform||''}</td><td>${escapeHtml(r.title1||'')}</td><td>${escapeHtml(r.title2||'')}</td><td>${escapeHtml(r.title3||'')}</td>
        <td><button class="delete-btn" onclick="deleteUpload('${r.id}')">Delete</button></td>`;
      tableTbody.appendChild(tr);
    });

    if (listTbody) rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.date||''}</td><td>${r.platform||''}</td><td>${escapeHtml(r.title1||'')}</td><td>${escapeHtml(r.title2||'')}</td><td>${escapeHtml(r.title3||'')}</td>
        <td><button class="delete-btn" onclick="deleteUpload('${r.id}')">Delete</button></td>`;
      listTbody.appendChild(tr);
    });

    if ($('totalUploads')) $('totalUploads').textContent = rows.length;
    updateCharts(rows, stats);
  } catch (err) {
    console.error('loadUploads error', err);
    updateCharts([], {});
  }
}

async function addUpload(){
  const user = auth.currentUser;
  if (!user) return alert('Please sign in to add uploads.');
  const date = ($('u_date')?.value || '');
  const platform = ($('u_platform')?.value || '');
  const title1 = ($('u_title1')?.value || '').trim();
  const title2 = ($('u_title2')?.value || '').trim();
  const title3 = ($('u_title3')?.value || '').trim();
  if (!date || !platform || !title1) return alert('Please fill Date, Platform and Title 1');

  try {
    await db.collection('uploads').add({ date, platform, title1, title2, title3, ownerUid: user.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    if ($('u_title1')) $('u_title1').value = '';
    if ($('u_title2')) $('u_title2').value = '';
    if ($('u_title3')) $('u_title3').value = '';
    await loadUploads();
    alert('Saved');
  } catch (err) {
    console.error('addUpload error', err);
    alert('Save failed: ' + (err.message || err));
  }
}

async function deleteUpload(id){
  if (!confirm('Delete this upload?')) return;
  try { await db.collection('uploads').doc(id).delete(); await loadUploads(); } catch (err) { console.error('delete error', err); alert('Delete failed: ' + (err.message || err)); }
}

/* Charts */
let lineChart = null, pieChart = null;
function updateCharts(rows, stats){
  const byDate = {};
  rows.forEach(r => {
    const d = r.date || (r.createdAt && r.createdAt.toDate ? r.createdAt.toDate().toISOString().slice(0,10) : '');
    if (d) byDate[d] = (byDate[d]||0) + 1;
  });
  const labels = Object.keys(byDate).length ? Object.keys(byDate).sort() : ['—'];
  const data = labels.length ? labels.map(k => byDate[k]) : [0];

  const lineCtx = $('lineChart') && $('lineChart').getContext('2d');
  if (lineChart) try { lineChart.destroy(); } catch(e){}
  if (lineCtx) {
    lineChart = new Chart(lineCtx, { type: 'line', data: { labels, datasets:[{ label:'Uploads', data, borderColor:'#9ad', backgroundColor:'rgba(100,170,255,0.12)', fill:true, tension:0.36 }]}, options:{ plugins:{ legend:{ display:false } } } });
  }

  const pieCtx = $('pieChart') && $('pieChart').getContext('2d');
  if (pieChart) try { pieChart.destroy(); } catch(e){}
  const pieLabels = Object.keys(stats).length ? Object.keys(stats) : ['No data'];
  const pieData = Object.keys(stats).length ? Object.values(stats) : [1];
  if (pieCtx) {
    pieChart = new Chart(pieCtx, { type: 'doughnut', data: { labels: pieLabels, datasets: [{ data: pieData, backgroundColor: ['#6aa8ff','#c57bff','#ffcc66'] }]}, options:{ plugins:{ legend:{ position:'bottom', labels:{ color:'#fff' } } } });
  }
}

/* Contact */
function sendContact(e){ e.preventDefault(); const name=($('c_name')?.value||'Anonymous'); const mail=($('c_email')?.value||''); const msg=($('c_message')?.value||''); const to='ashkamble149@gmail.com'; const subject=encodeURIComponent(`Website message from ${name}`); const body=encodeURIComponent(`From: ${name}\nEmail: ${mail}\n\n${msg}`); window.location.href=`mailto:${to}?subject=${subject}&body=${body}`; }
function resetContact(){ if ($('contactForm')) $('contactForm').reset(); if ($('c_name')) $('c_name').value = 'Asmit Kamble'; }

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// Expose
window.emailSign = emailSign;
window.registerEmail = registerEmail;
window.signOutUser = signOutUser;
window.showSection = showSection;
window.loadUploads = loadUploads;
window.addUpload = addUpload;
window.deleteUpload = deleteUpload;
window.sendContact = sendContact;
window.resetContact = resetContact;

// initial focus
if ($('email')) $('email').focus();
