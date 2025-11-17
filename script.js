// script.js (module) - email/password only; clear error messages + mobile-ready UI

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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

// ---------- CONFIG ----------
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

const $ = id => document.getElementById(id) || null;

// views
const loginView = $('loginView');
const appView = $('appView');
const sections = {
  dashboard: $('section-dashboard'),
  uploads: $('section-uploads'),
  contact: $('section-contact')
};

// charts
let lineChart = null, pieChart = null;

// clock
(function startClock(){
  const c = $('clock');
  if (!c) return;
  function t(){ c.textContent = new Date().toLocaleTimeString(); }
  t(); setInterval(t,1000);
})();

// ---------- AUTH (email only) ----------
// helper to set message nicely
function setAuthMessage(msg, isError = true){
  const el = $('authMessage');
  if (!el) return;
  el.textContent = msg || '';
  el.style.color = isError ? '#ff8b8b' : '#9ef2b8';
}

// improved sign-in with friendly messages
window.emailSign = async function(){
  setAuthMessage('');
  const email = ($('email')?.value || '').trim();
  const pass = ($('password')?.value || '');
  if (!email || !pass) { setAuthMessage('Please enter both email and password.'); return; }
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    setAuthMessage('', false);
  } catch (err) {
    console.error('signin error', err);
    // show friendly messages based on firebase error code
    const code = err.code || '';
    if (code === 'auth/wrong-password') setAuthMessage('Wrong password. Please try again.');
    else if (code === 'auth/user-not-found' || code === 'auth/invalid-email' || code === 'auth/user-disabled') setAuthMessage('Invalid credentials. Please check your email or register first.');
    else if (code === 'auth/too-many-requests') setAuthMessage('Too many failed attempts. Try again later.');
    else setAuthMessage(err.message || 'Sign-in failed. Please check credentials.');
  }
};

window.registerEmail = async function(){
  setAuthMessage('');
  const email = ($('email')?.value || '').trim();
  const pass = ($('password')?.value || '');
  if (!email || !pass) { setAuthMessage('Please enter both email and password to register.'); return; }
  try {
    await createUserWithEmailAndPassword(auth, email, pass);
    setAuthMessage('Registered successfully — you are signed in.', false);
  } catch (err) {
    console.error('register error', err);
    const code = err.code || '';
    if (code === 'auth/email-already-in-use') setAuthMessage('This email is already registered. Try signing in.');
    else if (code === 'auth/invalid-email') setAuthMessage('Invalid email address.');
    else if (code === 'auth/weak-password') setAuthMessage('Password too weak (min 6 characters).');
    else setAuthMessage(err.message || 'Registration failed.');
  }
};

window.signOutUser = function(){
  signOut(auth).catch(e => console.warn('sign out failed', e));
};

// show/hide app based on auth
onAuthStateChanged(auth, user => {
  if (user) {
    // show app
    loginView && loginView.classList.add('hidden');
    appView && appView.classList.remove('hidden');

    // profile fill
    $('profileEmail') && ($('profileEmail').textContent = user.email || '');
    $('profileName') && ($('profileName').textContent = user.displayName || 'Asmit Kamble');
    $('avatarLetter') && ($('avatarLetter').textContent = (user.displayName || user.email || 'A')[0].toUpperCase());

    // load data
    loadUploads().catch(err => console.error('loadUploads', err));
    showSection('dashboard');
  } else {
    // show login
    loginView && loginView.classList.remove('hidden');
    appView && appView.classList.add('hidden');
  }
});

// ---------- NAV ----------
window.showSection = function(name){
  Object.values(sections).forEach(s => s && s.classList.add('hidden'));
  if (sections[name]) sections[name].classList.remove('hidden');
};

// ---------- FIRESTORE (uploads) ----------
async function loadUploads(){
  const table = document.querySelector('#uploadTable tbody');
  const list = document.querySelector('#uploadList tbody');
  if (!table) return;
  table.innerHTML = '';
  if (list) list.innerHTML = '';

  if (!auth.currentUser) { updateCharts([], {}); return; }

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

    rows.slice(0,10).forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.date||''}</td><td>${r.platform||''}</td><td>${escapeHtml(r.title1||'')}</td><td>${escapeHtml(r.title2||'')}</td><td>${escapeHtml(r.title3||'')}</td>
        <td><button class="delete-btn" onclick="deleteUpload('${r.id}')">Delete</button></td>`;
      table.appendChild(tr);
    });

    if (list) {
      rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${r.date||''}</td><td>${r.platform||''}</td><td>${escapeHtml(r.title1||'')}</td><td>${escapeHtml(r.title2||'')}</td><td>${escapeHtml(r.title3||')}</td>
          <td><button class="delete-btn" onclick="deleteUpload('${r.id}')">Delete</button></td>`;
        list.appendChild(tr);
      });
    }

    $('totalUploads') && ($('totalUploads').textContent = rows.length);
    updateCharts(rows, stats);
  } catch (err) {
    console.error(err);
    updateCharts([], {});
  }
}

window.addUpload = async function(){
  if (!auth.currentUser) return alert('Please sign in to add uploads');
  const date = ($('u_date')?.value || '');
  const platform = ($('u_platform')?.value || '');
  const title1 = ($('u_title1')?.value || '').trim();
  const title2 = ($('u_title2')?.value || '').trim();
  const title3 = ($('u_title3')?.value || '').trim();
  if (!date || !platform || !title1) return alert('Please fill Date, Platform and Title 1');

  try {
    await addDoc(collection(db, 'uploads'), {
      date, platform, title1, title2, title3,
      ownerUid: auth.currentUser.uid,
      createdAt: new Date().toISOString()
    });
    if ($('u_title1')) $('u_title1').value = '';
    if ($('u_title2')) $('u_title2').value = '';
    if ($('u_title3')) $('u_title3').value = '';
    await loadUploads();
    alert('Saved');
  } catch (err) {
    console.error('save failed', err);
    alert('Save failed: ' + (err.message || err));
  }
};

window.deleteUpload = async function(id){
  if (!confirm('Delete this upload?')) return;
  try {
    await deleteDoc(doc(db, 'uploads', id));
    await loadUploads();
  } catch (err) {
    console.error('delete failed', err);
    alert('Delete failed: ' + (err.message || err));
  }
};

// ---------- CHARTS ----------
function updateCharts(rows = [], stats = {}) {
  const byDate = {};
  rows.forEach(r => {
    const d = r.date || (r.createdAt ? r.createdAt.slice(0,10) : '');
    if (d) byDate[d] = (byDate[d] || 0) + 1;
  });

  const labels = Object.keys(byDate).length ? Object.keys(byDate).sort() : ['—'];
  const data = Object.keys(byDate).length ? labels.map(k => byDate[k]) : [0];

  const lineCtx = $('lineChart')?.getContext('2d');
  if (lineChart) try { lineChart.destroy(); } catch(e){}
  if (lineCtx) {
    lineChart = new Chart(lineCtx, {
      type: 'line',
      data: { labels, datasets: [{ label:'Uploads', data, tension:0.36, borderColor:'#9ad', backgroundColor:'rgba(100,170,255,0.12)', fill:true }]},
      options: { plugins: { legend: { display:false } } }
    });
  }

  const pieCtx = $('pieChart')?.getContext('2d');
  if (pieChart) try { pieChart.destroy(); } catch(e){}
  const pieLabels = Object.keys(stats).length ? Object.keys(stats) : ['No data'];
  const pieData = Object.keys(stats).length ? Object.values(stats) : [1];
  if (pieCtx) {
    pieChart = new Chart(pieCtx, {
      type: 'doughnut',
      data: { labels:pieLabels, datasets:[{ data:pieData, backgroundColor:['#6aa8ff','#c57bff','#ffcc66'] }]},
      options: { plugins: { legend: { position:'bottom', labels: { color:'#fff' } } } }
    });
  }
}

// ---------- CONTACT ----------
window.sendContact = function(e){
  e.preventDefault();
  const name = ($('c_name')?.value || 'Anonymous');
  const mail = ($('c_email')?.value || '');
  const msg = ($('c_message')?.value || '');
  const to = 'ashkamble149@gmail.com';
  const subject = encodeURIComponent(`Website message from ${name}`);
  const body = encodeURIComponent(`From: ${name}\nEmail: ${mail}\n\n${msg}`);
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
};
window.resetContact = function(){ if($('contactForm')) $('contactForm').reset(); if($('c_name')) $('c_name').value = 'Asmit Kamble'; };

// helper
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
