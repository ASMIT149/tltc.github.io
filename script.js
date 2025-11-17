// script.js (works with the included compat SDKs)
//
// Exposed functions (for inline onclicks):
// emailSign, registerEmail, signOutUser, showSection, loadUploads, addUpload, deleteUpload, sendContact, resetContact

/* ====== Configuration & Init ====== */
// Replace with your config if needed (I used the one you provided)
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

// helpers
const $ = id => document.getElementById(id);
const elText = (id, txt) => { const e = $(id); if (e) e.textContent = txt; };
const setAuthMessage = (msg, isError = true) => {
  elText('authMessage', isError ? msg : '');
  elText('authSuccess', isError ? '' : msg);
};

function setButtonsDisabled(disabled){
  const emailBtn = $('emailBtn'), regBtn = $('regBtn');
  if (emailBtn) emailBtn.disabled = disabled;
  if (regBtn) regBtn.disabled = disabled;
  if (regBtn) {
    if (disabled) regBtn.classList.add('disabled');
    else regBtn.classList.remove('disabled');
  }
}

function animateRegister(){
  const reg = $('regBtn');
  if (!reg) return;
  reg.classList.remove('animate');
  void reg.offsetWidth;
  reg.classList.add('animate');
  reg.addEventListener('animationend', ()=> reg.classList.remove('animate'), { once: true });
}

// Clock
(function startClock(){ const c = $('clock'); if (!c) return; function t(){ c.textContent = new Date().toLocaleTimeString(); } t(); setInterval(t,1000); })();

/* ====== Auth: Email register/signin ====== */
async function emailSign(){
  setAuthMessage('');
  const email = ($('email')?.value || '').trim();
  const pass = ($('password')?.value || '');
  if (!email || !pass) { setAuthMessage('Please enter both email and password.'); return; }
  setButtonsDisabled(true);
  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch (err) {
    console.error('signin error', err);
    const code = err.code || '';
    if (code === 'auth/wrong-password') setAuthMessage('Wrong password. Please try again.');
    else if (code === 'auth/user-not-found' || code === 'auth/invalid-email' || code === 'auth/user-disabled') setAuthMessage('Invalid credentials. Please check your email or register first.');
    else if (code === 'auth/too-many-requests') setAuthMessage('Too many failed attempts. Try again later.');
    else setAuthMessage(err.message || 'Sign-in failed. Please check credentials.');
  } finally { setButtonsDisabled(false); }
}

async function registerEmail(){
  setAuthMessage('');
  const email = ($('email')?.value || '').trim();
  const pass = ($('password')?.value || '');
  if (!email || !pass) { setAuthMessage('Please enter both email and password to register.'); return; }
  if (pass.length < 6) { setAuthMessage('Password must be at least 6 characters.'); return; }

  animateRegister();
  setButtonsDisabled(true);
  try {
    await auth.createUserWithEmailAndPassword(email, pass);
    setAuthMessage('Registered and signed in.', false);
  } catch (err) {
    console.error('register error', err);
    const code = err.code || '';
    if (code === 'auth/email-already-in-use') setAuthMessage('This email is already registered. Try signing in.');
    else if (code === 'auth/invalid-email') setAuthMessage('Invalid email address.');
    else if (code === 'auth/weak-password') setAuthMessage('Password too weak (min 6 characters).');
    else setAuthMessage(err.message || 'Registration failed.');
  } finally { setButtonsDisabled(false); }
}

/* ====== Auth state observer ====== */
auth.onAuthStateChanged(user => {
  if (user) {
    if ($('loginView')) $('loginView').classList.add('hidden');
    if ($('appView')) $('appView').classList.remove('hidden');
    if ($('profileEmail')) $('profileEmail').textContent = user.email || '';
    if ($('profileName')) $('profileName').textContent = user.displayName || 'Asmit Kamble';
    if ($('avatarLetter')) $('avatarLetter').textContent = (user.displayName || user.email || 'A')[0].toUpperCase();
    loadUploads().catch(e=>console.error(e));
    showSection('dashboard');
  } else {
    if ($('loginView')) $('loginView').classList.remove('hidden');
    if ($('appView')) $('appView').classList.add('hidden');
  }
});

function signOutUser(){ auth.signOut().catch(e=>console.warn('signout failed', e)); }

/* ====== Navigation inside single page ====== */
function showSection(name){
  const sections = ['section-dashboard','section-uploads','section-contact'];
  sections.forEach(id => { const el = $(id); if (!el) return; if (id === 'section-' + name) el.classList.remove('hidden'); else el.classList.add('hidden'); });
}

/* ====== Firestore: uploads CRUD ====== */
async function loadUploads(){
  const tableTbody = document.querySelector('#uploadTable tbody');
  const listTbody = document.querySelector('#uploadList tbody');
  if (tableTbody) tableTbody.innerHTML = '';
  if (listTbody) listTbody.innerHTML = '';

  const user = auth.currentUser;
  if (!user) { updateCharts([], {}); return; }

  try {
    const snap = await db.collection('uploads').orderBy('createdAt','desc').get();
    const rows = [];
    const stats = {};
    snap.forEach(docSnap => {
      const d = docSnap.data();
      rows.push({ id: docSnap.id, ...d });
      stats[d.platform] = (stats[d.platform] || 0) + 1;
    });

    rows.slice(0,12).forEach(r => {
      if (tableTbody) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${r.date||''}</td><td>${r.platform||''}</td><td>${escapeHtml(r.title1||'')}</td><td>${escapeHtml(r.title2||'')}</td><td>${escapeHtml(r.title3||'')}</td>
          <td><button class="delete-btn" onclick="deleteUpload('${r.id}')">Delete</button></td>`;
        tableTbody.appendChild(tr);
      }
    });

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
    await db.collection('uploads').add({
      date, platform, title1, title2, title3,
      ownerUid: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
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
  try {
    await db.collection('uploads').doc(id).delete();
    await loadUploads();
  } catch (err) {
    console.error('delete error', err);
    alert('Delete failed: ' + (err.message || err));
  }
}

/* ====== Charts ====== */
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
    lineChart = new Chart(lineCtx, {
      type: 'line',
      data: { labels, datasets:[{ label:'Uploads', data, borderColor:'#9ad', backgroundColor:'rgba(100,170,255,0.12)', fill:true, tension:0.36 }]},
      options: { plugins:{ legend:{ display:false } } }
    });
  }

  const pieCtx = $('pieChart') && $('pieChart').getContext('2d');
  if (pieChart) try { pieChart.destroy(); } catch(e){}
  const pieLabels = Object.keys(stats).length ? Object.keys(stats) : ['No data'];
  const pieData = Object.keys(stats).length ? Object.values(stats) : [1];
  if (pieCtx) {
    pieChart = new Chart(pieCtx, {
      type: 'doughnut',
      data: { labels: pieLabels, datasets: [{ data: pieData, backgroundColor: ['#6aa8ff','#c57bff','#ffcc66'] }]},
      options: { plugins:{ legend:{ position:'bottom', labels:{ color:'#fff' } } } }
    });
  }
}

/* ====== Contact (mailto) ====== */
function sendContact(e){
  e.preventDefault();
  const name = ($('c_name')?.value || 'Anonymous');
  const mail = ($('c_email')?.value || '');
  const msg = ($('c_message')?.value || '');
  const to = 'ashkamble149@gmail.com';
  const subject = encodeURIComponent(`Website message from ${name}`);
  const body = encodeURIComponent(`From: ${name}\nEmail: ${mail}\n\n${msg}`);
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
}
function resetContact(){
  if ($('contactForm')) $('contactForm').reset();
  if ($('c_name')) $('c_name').value = 'Asmit Kamble';
}

/* ====== Utility ====== */
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// expose to window for inline onclicks
window.emailSign = emailSign;
window.registerEmail = registerEmail;
window.signOutUser = signOutUser;
window.showSection = showSection;
window.loadUploads = loadUploads;
window.addUpload = addUpload;
window.deleteUpload = deleteUpload;
window.sendContact = sendContact;
window.resetContact = resetContact;

// focus email input for UX
if ($('email')) $('email').focus();
