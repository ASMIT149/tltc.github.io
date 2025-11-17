// script.js - Hash routing, Firebase auth + Firestore uploads, Chart.js wiring
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

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

// UI elements
const pages = {
  login: document.getElementById('page-login'),
  app: document.getElementById('page-app'),
  dashboard: document.getElementById('view-dashboard'),
  uploads: document.getElementById('view-uploads'),
  contact: document.getElementById('view-contact')
};
const loginErr = document.getElementById('loginError');

// Charts
let lineChart = null, pieChart = null;

// Clock
function startClock(){
  const el = document.getElementById('clock');
  setInterval(()=>{ if(el) el.textContent = new Date().toLocaleTimeString(); },1000);
}
startClock();

// Routing
function showView(route){
  // hide all
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
  // show matched
  if(route === 'dashboard' || route === '') pages.dashboard.classList.remove('hidden');
  else if(route === 'uploads') pages.uploads.classList.remove('hidden');
  else if(route === 'contact') pages.contact.classList.remove('hidden');
}
function goHash(){
  const h = location.hash.replace('#','');
  if(h === 'login') { pages.login.classList.remove('hidden'); pages.app.classList.add('hidden'); }
  else { pages.login.classList.add('hidden'); pages.app.classList.remove('hidden'); showView(h || 'dashboard'); }
}
window.addEventListener('hashchange', goHash);
goHash();

// Auth mode toggle
let isLogin = true;
window.toggleAuthMode = function(){
  isLogin = !isLogin;
  document.getElementById('switchBtn').textContent = isLogin ? 'Create' : 'Back to Sign-in';
  document.getElementById('authButton').textContent = isLogin ? 'Login' : 'Register';
};

// login/register
window.login = async function(){
  loginErr.textContent = '';
  const email = document.getElementById('email').value.trim();
  const pass = document.getElementById('password').value;
  if(!email || !pass){ loginErr.textContent = 'Enter email & password'; return; }
  try{
    if(isLogin) await signInWithEmailAndPassword(auth, email, pass);
    else { await createUserWithEmailAndPassword(auth, email, pass); isLogin = true; toggleAuthMode(); alert('Account created. Please login.'); }
  }catch(e){ loginErr.textContent = e.message; }
};

window.guestView = function(){ location.hash = '#dashboard'; pages.login.classList.add('hidden'); pages.app.classList.remove('hidden'); loadUploads(); };

// auth state
onAuthStateChanged(auth, user=>{
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  if(user){
    pages.login.classList.add('hidden'); pages.app.classList.remove('hidden');
    profileEmail.textContent = user.email || '—';
    profileName.textContent = user.displayName || 'Asmit Kamble';
    loadUploads();
  } else {
    // if user signs out, show login
    if(location.hash === '' || location.hash === '#login'){ pages.login.classList.remove('hidden'); pages.app.classList.add('hidden'); }
    profileEmail.textContent = 'ashkamble149@gmail.com';
    profileName.textContent = 'Asmit Kamble';
    // clear charts
    updateCharts([], {});
  }
});

// logout
window.logout = function(){ signOut(auth).catch(e=>console.warn(e)); location.hash = '#login'; };

// Firestore: load uploads, render table and charts
async function loadUploads(){
  try{
    const q = query(collection(db,'uploads'), orderBy('createdAt','desc'));
    const snap = await getDocs(q);
    const rows = [];
    const stats = {};
    snap.forEach(s=>{
      const d = s.data();
      rows.push({ id: s.id, ...d });
      stats[d.platform] = (stats[d.platform] || 0) + 1;
    });
    renderTable(rows);
    updateCharts(rows, stats);
    document.getElementById('totalUploadsBig').textContent = rows.length;
  }catch(e){
    console.error("load failed", e);
  }
}

function renderTable(rows){
  const tbody = document.querySelector('#uploadTable tbody');
  tbody.innerHTML = '';
  rows.slice(0,8).forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.date||''}</td><td>${r.platform||''}</td><td>${escapeHtml(r.title1||r.title||'')}</td><td><button class="delete-btn" onclick="deleteUpload('${r.id}')">Delete</button></td>`;
    tbody.appendChild(tr);
  });

  // uploads list table
  const listT = document.querySelector('#uploadListTbl tbody');
  if(listT){
    listT.innerHTML = '';
    rows.forEach(r=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.date||''}</td><td>${r.platform||''}</td><td>${escapeHtml(r.title1||r.title||'')}</td><td><button class="delete-btn" onclick="deleteUpload('${r.id}')">Delete</button></td>`;
      listT.appendChild(tr);
    });
  }
}

// add upload (requires auth or guest will be blocked)
window.addUpload = async function(){
  const date = document.getElementById('u_date')?.value || '';
  const platform = document.getElementById('u_platform')?.value || '';
  const title = (document.getElementById('u_title')?.value || '').trim();
  const user = auth.currentUser;
  if(!date || !platform || !title) return alert('Fill date, platform, title');
  if(!user) return alert('Please login to save uploads');

  try{
    await addDoc(collection(db,'uploads'), {
      date, platform, title1: title, ownerUid: user.uid, createdAt: new Date().toISOString()
    });
    document.getElementById('u_title').value = '';
    await loadUploads();
  }catch(e){ alert('Save failed: '+(e.message||e)); }
};

// delete
window.deleteUpload = async function(id){
  if(!confirm('Delete this upload?')) return;
  try{
    await deleteDoc(doc(db,'uploads',id));
    await loadUploads();
  }catch(e){
    alert('Delete failed: '+(e.message||e));
  }
};

// charts
function updateCharts(rows, stats){
  // line: uses createdAt counts per day (simple demo)
  const labels = [];
  const counts = [];
  // build from rows by date
  const byDate = {};
  rows.forEach(r=>{
    const d = r.date || (r.createdAt ? r.createdAt.slice(0,10) : '');
    if(d) byDate[d] = (byDate[d]||0)+1;
  });
  Object.keys(byDate).sort().forEach(k=>{ labels.push(k); counts.push(byDate[k]); });

  const lineCtx = document.getElementById('lineChart')?.getContext('2d');
  if(lineChart) lineChart.destroy();
  if(lineCtx){
    lineChart = new Chart(lineCtx, { type:'line', data:{ labels, datasets:[{label:'Uploads', data:counts, tension:0.36, borderColor:'#9ad', backgroundColor:'rgba(100,170,255,0.12)', fill:true}] }, options:{ plugins:{legend:{display:false}} } });
  }

  const pieCtx = document.getElementById('pieChart')?.getContext('2d');
  if(pieChart) pieChart.destroy();
  if(pieCtx){
    pieChart = new Chart(pieCtx, { type:'doughnut', data:{ labels:Object.keys(stats), datasets:[{data:Object.values(stats), backgroundColor:['#6aa8ff','#c57bff','#ffcc66']}] }, options:{ plugins:{legend:{position:'bottom', labels:{color:'#fff'}}} } });
  }
}

// contact form (just mailto fallback)
window.sendContact = function(e){
  e.preventDefault();
  const name = document.getElementById('c_name').value;
  const email = document.getElementById('c_email').value;
  const message = document.getElementById('c_message').value;
  const to = 'ashkamble149@gmail.com';
  const subject = encodeURIComponent('Contact from Website: '+name);
  const body = encodeURIComponent(`From: ${name} <${email}>\n\n${message}`);
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
};

window.resetContact = function(){ document.getElementById('contactForm').reset(); document.getElementById('c_name').value='Asmit Kamble'; document.getElementById('c_email').value='ashkamble149@gmail.com'; };

// small util
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// initial load when page opens
if(location.hash && location.hash !== '#login') goHash();
loadUploads();
