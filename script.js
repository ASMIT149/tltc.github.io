// script.js - upgraded error handling + mobile reliability tweaks
// Replace existing script.js with this file and keep your index.html and style.css as before.

const firebaseConfig = {
  apiKey: "AIzaSyCcd1CCTlJRZ2YOhbziRVdiZlvVzUHiYm4",
  authDomain: "video-tracker-7f709.firebaseapp.com",
  projectId: "video-tracker-7f709",
  storageBucket: "video-tracker-7f709.appspot.com",
  messagingSenderId: "6567580876",
  appId: "1:6567580876:web:e982351a06897faea45e69",
  measurementId: "G-554K9DJVCJ"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const $ = id => document.getElementById(id);
const setAuthMessage = (msg, isError = true) => {
  if ($('authMessage')) $('authMessage').textContent = isError ? msg : '';
  if ($('authSuccess')) $('authSuccess').textContent = isError ? '' : msg;
  // also console.log for debugging
  if (isError) console.warn('AUTH MSG:', msg); else console.info('AUTH OK:', msg);
};

function setButtonsDisabled(disabled){
  const emailBtn = $('emailBtn'), regBtn = $('regBtn');
  if (emailBtn) emailBtn.disabled = disabled;
  if (regBtn) regBtn.disabled = disabled;
}

// Persist auth state - good for mobile browsers
(async function setPersistence(){
  try {
    // try local persistence (most durable)
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    console.info('Auth persistence set: LOCAL');
  } catch (err) {
    console.warn('Could not set LOCAL persistence, falling back to default. Error:', err);
  }
})();

// small helper to normalize common firebase errors to friendly messages
function friendlyAuthError(err){
  if (!err) return 'Unknown error';
  const code = err.code || '';
  if (code === 'auth/wrong-password') return 'Wrong password — check and try again.';
  if (code === 'auth/user-not-found') return 'No account found for this email. Please register first.';
  if (code === 'auth/invalid-email') return 'Invalid email address.';
  if (code === 'auth/email-already-in-use') return 'Email already registered — try signing in.';
  if (code === 'auth/weak-password') return 'Password too weak. Use at least 6 characters.';
  if (code === 'auth/unauthorized-domain') return 'Site not authorized in Firebase Auth. Add your domain in Firebase Console → Authentication → Authorized domains.';
  if (code === 'auth/network-request-failed') return 'Network issue. Check connection or try again.';
  if (code === 'auth/too-many-requests') return 'Too many attempts. Try again later.';
  // fallback to message
  return err.message || code || 'Authentication failed';
}

// improved sign-in function
async function emailSign(){
  setAuthMessage('');
  const email = ($('email')?.value || '').trim();
  const pass = ($('password')?.value || '');
  if (!email || !pass) { setAuthMessage('Please enter both email and password.'); return; }

  setButtonsDisabled(true);
  try {
    console.info('Attempting signInWithEmailAndPassword for', email);
    await auth.signInWithEmailAndPassword(email, pass);
    setAuthMessage('Signed in', false);
  } catch (err) {
    console.error('Sign-in error:', err);
    const msg = friendlyAuthError(err);
    setAuthMessage(msg);
    // show lower-level code in console for debugging
    console.debug('Full auth error object:', err);
  } finally {
    setButtonsDisabled(false);
  }
}

// improved register function
async function registerEmail(){
  setAuthMessage('');
  const email = ($('email')?.value || '').trim();
  const pass = ($('password')?.value || '');
  if (!email || !pass) { setAuthMessage('Please enter both email and password to register.'); return; }
  if (pass.length < 6) { setAuthMessage('Password must be at least 6 characters.'); return; }

  setButtonsDisabled(true);
  try {
    console.info('Attempting createUserWithEmailAndPassword for', email);
    await auth.createUserWithEmailAndPassword(email, pass);
    setAuthMessage('Registered and signed in', false);
  } catch (err) {
    console.error('Register error:', err);
    const msg = friendlyAuthError(err);
    setAuthMessage(msg);
    console.debug('Full auth error object:', err);
  } finally {
    setButtonsDisabled(false);
  }
}

// sign out
function signOutUser(){ auth.signOut().catch(e => console.warn('signOut failed', e)); }

// auth state observer
auth.onAuthStateChanged(async user => {
  console.info('onAuthStateChanged -> user:', user ? user.email : null);
  if (user) {
    if ($('loginView')) $('loginView').classList.add('hidden');
    if ($('appView')) $('appView').classList.remove('hidden');

    // fill profile fields (desktop + mobile)
    const displayName = user.displayName || 'Asmit Kamble';
    const email = user.email || '';
    if ($('profileEmail')) $('profileEmail').textContent = email;
    if ($('profileName')) $('profileName').textContent = displayName;
    if ($('avatarLetter')) $('avatarLetter').textContent = (displayName || email)[0]?.toUpperCase() || 'A';

    if ($('mobileProfileEmail')) $('mobileProfileEmail').textContent = email;
    if ($('mobileProfileName')) $('mobileProfileName').textContent = displayName;
    if ($('mobileAvatarLetter')) $('mobileAvatarLetter').textContent = (displayName || email)[0]?.toUpperCase() || 'A';

    // ensure mobile bar visible when small screens
    try {
      if (window.matchMedia && window.matchMedia('(max-width:900px)').matches){
        const mt = $('mobileTopbar'); if (mt) mt.style.display = 'flex';
      } else {
        const mt = $('mobileTopbar'); if (mt) mt.style.display = '';
      }
    } catch(e){ console.warn('matchMedia fallback error', e); }

    await loadUploads().catch(e => { console.error('loadUploads failed in auth observer', e); });
    showSection('dashboard');
  } else {
    if ($('loginView')) $('loginView').classList.remove('hidden');
    if ($('appView')) $('appView').classList.add('hidden');
  }
});

/* firestore & UI functions (same behavior as before) */

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

    if (tableTbody) {
      rows.slice(0,12).forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${r.date||''}</td><td>${r.platform||''}</td><td>${escapeHtml(r.title1||'')}</td><td>${escapeHtml(r.title2||'')}</td><td>${escapeHtml(r.title3||'')}</td>
          <td><button class="delete-btn" onclick="deleteUpload('${r.id}')">Delete</button></td>`;
        tableTbody.appendChild(tr);
      });
    }

    if (listTbody) {
      rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${r.date||''}</td><td>${r.platform||''}</td><td>${escapeHtml(r.title1||'')}</td><td>${escapeHtml(r.title2||'')}</td><td>${escapeHtml(r.title3||'')}</td>
          <td><button class="delete-btn" onclick="deleteUpload('${r.id}')">Delete</button></td>`;
        listTbody.appendChild(tr);
      });
    }

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
  try { await db.collection('uploads').doc(id).delete(); await loadUploads(); }
  catch (err) { console.error('delete error', err); alert('Delete failed: ' + (err.message || err)); }
}

/* Charts code (same as before) */
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

/* contact mailto */
function sendContact(e){ e.preventDefault(); const name=($('c_name')?.value||'Anonymous'); const mail=($('c_email')?.value||''); const msg=($('c_message')?.value||''); const to='ashkamble149@gmail.com'; const subject=encodeURIComponent(`Website message from ${name}`); const body=encodeURIComponent(`From: ${name}\nEmail: ${mail}\n\n${msg}`); window.location.href=`mailto:${to}?subject=${subject}&body=${body}`; }
function resetContact(){ if ($('contactForm')) $('contactForm').reset(); if ($('c_name')) $('c_name').value = 'Asmit Kamble'; }

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// expose functions
window.emailSign = emailSign;
window.registerEmail = registerEmail;
window.signOutUser = signOutUser;
window.showSection = (n) => { const ids=['section-dashboard','section-uploads','section-contact']; ids.forEach(id=>{ const el = document.getElementById(id); if(!el) return; if(id==='section-'+n) el.classList.remove('hidden'); else el.classList.add('hidden'); }); };
window.loadUploads = loadUploads;
window.addUpload = addUpload;
window.deleteUpload = deleteUpload;
window.sendContact = sendContact;
window.resetContact = resetContact;
